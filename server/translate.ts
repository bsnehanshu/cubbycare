// Japanese localisation agent: turns English registry copy — provider bios, credential
// records, parent reviews, AI summaries — into natural Japanese for Japanese-speaking SF
// families. Results are cached in the `translations` table keyed by source hash, so the
// same profile is only ever translated once.
import { createHash } from 'node:crypto'
import { bedrock, TRANSLATE_MODEL } from './bedrock.ts'
import { db } from './db.ts'
import { getProvider, getReviewSummary } from './core.ts'

const LANG = 'ja'
const MAX_ITEMS = 60
const MAX_CHARS_PER_ITEM = 4000

const SYSTEM = `You are the CubbyCare localisation specialist. You translate childcare-registry copy from English into natural, warm Japanese for parents living in San Francisco.

Rules:
- Write the Japanese a Japanese parent would actually read: です・ます調, no machine-translation stiffness.
- Keep proper nouns readable: business names, people's names, and SF neighborhood names stay in their original spelling (e.g. "Little Sprouts Learning Center", "Mission")。Add a short Japanese gloss only when it genuinely helps.
- Keep numbers, dates, facility/license numbers, currency and ages exactly as given.
- Childcare terms: "CPR & First Aid" → 心肺蘇生・救急救命, "ECE" → 幼児教育, "licensed" → 州の認可済み, "credentialed" → 資格確認済み.
- Never add, omit, soften, or invent facts. A caveat in the English stays a caveat in the Japanese.
- Translate only; no commentary.`

export type TranslatedProvider = {
  provider_id: number
  lang: 'ja'
  cached: boolean
  name: string
  bio: string | null
  review_summary: string | null
  credentials: Array<{ id: number; kind: string; issuer: string | null; details: string | null }>
  reviews: Array<{ id: number; text: string }>
}

function hash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

function readCache<T>(sourceHash: string): T | null {
  const row = db
    .prepare('SELECT content FROM translations WHERE lang = ? AND source_hash = ?')
    .get(LANG, sourceHash) as { content: string } | undefined
  return row ? (JSON.parse(row.content) as T) : null
}

function writeCache(sourceHash: string, value: unknown): void {
  db.prepare('INSERT OR REPLACE INTO translations (lang, source_hash, content) VALUES (?, ?, ?)').run(
    LANG,
    sourceHash,
    JSON.stringify(value),
  )
}

/**
 * Translate a batch of labelled strings in one model call.
 * Returns a map of the same keys to their Japanese text; keys the model drops fall back
 * to the English source so a partial response can never blank out the UI.
 */
async function translateBatch(items: Record<string, string>): Promise<Record<string, string>> {
  const entries = Object.entries(items)
    .filter(([, text]) => text.trim().length > 0)
    .slice(0, MAX_ITEMS)
    .map(([key, text]) => [key, text.slice(0, MAX_CHARS_PER_ITEM)] as const)
  if (!entries.length) return {}

  const source = Object.fromEntries(entries)
  const response = await bedrock.messages.create({
    model: TRANSLATE_MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Translate every value in this JSON object into Japanese. Keep the keys byte-identical.

Respond with ONLY a JSON object of the same shape, no prose, no code fences:
${JSON.stringify(source, null, 2)}`,
      },
    ],
  })

  if (response.stop_reason === 'refusal') throw new Error('translation declined by the model')
  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('no translation returned')
  const json = text.match(/\{[\s\S]*\}/)?.[0]
  if (!json) throw new Error(`unparseable translation: ${text.slice(0, 200)}`)

  const parsed = JSON.parse(json) as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const [key, original] of entries) {
    const value = parsed[key]
    out[key] = typeof value === 'string' && value.trim() ? value.trim() : original
  }
  return out
}

/** Translate a single free-text string (used by the tool catalog and the concierge). */
export async function translateToJapanese(text: string): Promise<string> {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const key = hash({ kind: 'text', text: trimmed })
  const cached = readCache<{ ja: string }>(key)
  if (cached) return cached.ja

  const { text: ja } = await translateBatch({ text: trimmed })
  const result = ja ?? trimmed
  writeCache(key, { ja: result })
  return result
}

/** Translate a whole provider profile: bio, credentials, reviews and the AI review summary. */
export async function translateProvider(providerId: number): Promise<TranslatedProvider | null> {
  const row = getProvider(providerId)
  if (!row) return null
  const summary = getReviewSummary(providerId).cached as string | null

  // SQLite rows come back loosely typed; narrow the fields this agent touches.
  const provider = row as unknown as {
    name: string
    bio: string
    credentials: Array<{ id: number; kind: string; issuer: string; details: string }>
    reviews: Array<{ id: number; text: string }>
  }
  const { credentials, reviews } = provider

  const items: Record<string, string> = {}
  if (provider.bio) items.bio = provider.bio
  if (summary) items.review_summary = summary
  for (const c of credentials) {
    if (c.kind) items[`cred.${c.id}.kind`] = c.kind
    if (c.issuer) items[`cred.${c.id}.issuer`] = c.issuer
    if (c.details) items[`cred.${c.id}.details`] = c.details
  }
  for (const r of reviews) {
    if (r.text) items[`review.${r.id}.text`] = r.text
  }

  const key = hash({ kind: 'provider', name: provider.name, items })
  const cached = readCache<Omit<TranslatedProvider, 'cached'>>(key)
  if (cached) return { ...cached, cached: true }

  const ja = await translateBatch(items)
  const result: Omit<TranslatedProvider, 'cached'> = {
    provider_id: providerId,
    lang: LANG,
    name: provider.name, // proper nouns stay as-is so parents can match the listing
    bio: ja.bio ?? null,
    review_summary: ja.review_summary ?? null,
    credentials: credentials.map((c) => ({
      id: c.id,
      kind: ja[`cred.${c.id}.kind`] ?? c.kind,
      issuer: ja[`cred.${c.id}.issuer`] ?? c.issuer ?? null,
      details: ja[`cred.${c.id}.details`] ?? c.details ?? null,
    })),
    reviews: reviews.map((r) => ({ id: r.id, text: ja[`review.${r.id}.text`] ?? r.text })),
  }
  writeCache(key, result)
  return { ...result, cached: false }
}
