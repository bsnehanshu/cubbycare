// Onboarding trust-check swarm: a coordinator fans out three specialist agents in
// parallel — credentials, state license, reviews — then synthesizes a parent-facing
// trust report. Progress streams as NDJSON so the UI can show parallel execution.
import type { Response } from 'express'
import { bedrock, CONCIERGE_MODEL } from './bedrock.ts'
import { getProvider } from './core.ts'
import { summarizeReviews } from './chat.ts'

type SpecialistResult = { name: string; summary: string; detail?: Record<string, unknown> }

export async function runTrustCheck(providerId: number, opts: { mock?: boolean }, res: Response) {
  const provider = getProvider(providerId)
  if (!provider) {
    res.status(404).json({ error: 'not found' })
    return
  }

  res.setHeader('content-type', 'application/x-ndjson')
  const emit = (event: Record<string, unknown>) => res.write(JSON.stringify(event) + '\n')

  const specialists: Array<{ name: string; label: string; run: () => Promise<SpecialistResult> }> = [
    {
      name: 'credentials',
      label: 'Credential specialist',
      run: async () => {
        const creds = provider.credentials
        const verified = creds.filter((c) => c.status === 'verified')
        const pending = creds.filter((c) => c.status === 'pending')
        const parts = []
        if (verified.length) parts.push(`${verified.length} verified credential${verified.length > 1 ? 's' : ''}: ${verified.map((c) => c.kind).join(', ')}`)
        if (pending.length) parts.push(`${pending.length} pending (self-reported, not yet verified): ${pending.map((c) => c.kind).join(', ')}`)
        if (!creds.length) parts.push('No credentials on file yet — upload a CPR card or ECE certificate for instant AI verification')
        return { name: 'credentials', summary: parts.join('. '), detail: { verified: verified.length, pending: pending.length } }
      },
    },
    {
      name: 'license',
      label: 'State license specialist',
      run: async () => {
        if (!provider.license_number) {
          return { name: 'license', summary: 'No CA facility number on file — the Licensed tier is unavailable until one is provided.' }
        }
        const { verifyLicense } = await import('./license.ts')
        const check = await verifyLicense(providerId, provider.license_number, { mock: opts.mock })
        return {
          name: 'license',
          summary: check.found && check.match
            ? `Facility #${provider.license_number} confirmed ${check.method === 'live' ? 'against the live state registry' : 'via registry cache'}: ${check.facility_name}, status ${check.status}.`
            : `Facility #${provider.license_number} could not be confirmed: ${check.notes}`,
          detail: { found: check.found, match: check.match, method: check.method },
        }
      },
    },
    {
      name: 'reviews',
      label: 'Review specialist',
      run: async () => {
        const summary = await summarizeReviews(providerId)
        return { name: 'reviews', summary: summary ?? 'No parent reviews yet — the profile will build social proof over time.' }
      },
    },
  ]

  try {
    // Fan out — all specialists run concurrently; emit events as each starts and finishes
    const settled = await Promise.all(
      specialists.map(async (s) => {
        emit({ type: 'specialist_start', name: s.name, label: s.label })
        try {
          const result = await s.run()
          emit({ type: 'specialist_done', name: s.name, label: s.label, summary: result.summary })
          return result
        } catch (err) {
          const summary = `Check failed: ${String(err instanceof Error ? err.message : err).slice(0, 140)}`
          emit({ type: 'specialist_done', name: s.name, label: s.label, summary, error: true })
          return { name: s.name, summary }
        }
      }),
    )

    // Synthesis — coordinator writes the parent-facing trust report from specialist findings
    const fresh = getProvider(providerId)!
    const response = await bedrock.messages.create({
      model: CONCIERGE_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are the coordinator of a childcare trust-verification swarm. Your three specialists reported on "${fresh.name}" (${fresh.type === 'center' ? 'childcare centre' : 'individual caregiver'}, verification tier ${fresh.verified_tier} of 3):

${settled.map((r) => `- ${r.name}: ${r.summary}`).join('\n')}

Write a TRUST REPORT for parents: 3-4 plain sentences, honest and warm, covering what is verified, what is not, and the single most valuable next step for this provider to raise their trust tier. No markdown, no headers.`,
        },
      ],
    })
    const report = response.content.find((b) => b.type === 'text')?.text.trim() ?? ''
    emit({ type: 'report', report, tier: fresh.verified_tier })
    emit({ type: 'done' })
  } catch (err) {
    emit({ type: 'error', message: String(err instanceof Error ? err.message : err) })
  } finally {
    res.end()
  }
}
