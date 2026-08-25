import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AMENITIES, AGE_BANDS } from './db.ts'
import {
  NEIGHBORHOODS,
  searchProviders,
  getProvider,
  registerProvider,
  submitCredential,
  setCredentialStatus,
  requestBooking,
  getBookingStatus,
  listBookings,
  getReviewSummary,
} from './core.ts'
import { seed } from './seed.ts'

const app = express()
app.use(express.json({ limit: '10mb' })) // cert images arrive base64

seed()

app.get('/api/meta', (_req, res) => {
  res.json({ amenities: AMENITIES, age_bands: AGE_BANDS, neighborhoods: Object.keys(NEIGHBORHOODS) })
})

app.get('/api/providers', (req, res) => {
  const q = req.query
  res.json(
    searchProviders({
      near: q.near as string | undefined,
      lat: q.lat ? Number(q.lat) : undefined,
      lng: q.lng ? Number(q.lng) : undefined,
      child_age_months: q.child_age_months ? Number(q.child_age_months) : undefined,
      amenities: q.amenities ? String(q.amenities).split(',').filter(Boolean) : undefined,
      day: q.day as string | undefined,
      verified_only: q.verified_only === 'true',
      available_within_hours: q.available_within_hours ? Number(q.available_within_hours) : undefined,
      max_results: q.max_results ? Number(q.max_results) : undefined,
    }),
  )
})

app.get('/api/providers/:id', (req, res) => {
  const provider = getProvider(Number(req.params.id))
  if (!provider) return res.status(404).json({ error: 'not found' })
  res.json(provider)
})

app.post('/api/providers', (req, res) => {
  try {
    res.status(201).json(registerProvider(req.body))
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

app.post('/api/providers/:id/credentials', async (req, res) => {
  const provider_id = Number(req.params.id)
  if (!getProvider(provider_id)) return res.status(404).json({ error: 'not found' })
  const { image_base64, media_type, ...fields } = req.body

  if (image_base64) {
    // AI credential verification (verify.ts) — wired in the Bedrock step
    const { verifyCredentialImage } = await import('./verify.ts')
    try {
      const result = await verifyCredentialImage(image_base64, media_type ?? 'image/png')
      const cred = submitCredential({
        provider_id,
        kind: result.kind ?? fields.kind ?? 'Credential',
        issuer: result.issuer ?? '',
        details: `AI-verified · holder: ${result.holder ?? 'unknown'} · ${result.notes ?? ''}`,
        expiry: result.expiry ?? undefined,
        status: result.verdict === 'verified' ? 'verified' : 'rejected',
      })
      return res.status(201).json({ credential: cred, extraction: result, provider: getProvider(provider_id) })
    } catch (err) {
      return res.status(502).json({ error: `verification failed: ${String(err)}` })
    }
  }

  const cred = submitCredential({ provider_id, ...fields })
  res.status(201).json({ credential: cred, provider: getProvider(provider_id) })
})

app.post('/api/credentials/:id/status', (req, res) => {
  const provider = setCredentialStatus(Number(req.params.id), req.body.status)
  if (!provider) return res.status(404).json({ error: 'not found' })
  res.json(provider)
})

app.post('/api/providers/:id/trust-check', async (req, res) => {
  try {
    const { runTrustCheck } = await import('./swarm.ts')
    await runTrustCheck(Number(req.params.id), { mock: Boolean(req.body?.mock) }, res)
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
})

app.post('/api/providers/:id/verify-license', async (req, res) => {
  const provider_id = Number(req.params.id)
  const provider = getProvider(provider_id)
  if (!provider) return res.status(404).json({ error: 'not found' })
  const license_number = String(req.body.license_number ?? provider.license_number ?? '').trim()
  if (!license_number) return res.status(400).json({ error: 'license_number required' })
  try {
    const { verifyLicense } = await import('./license.ts')
    const check = await verifyLicense(provider_id, license_number, { mock: Boolean(req.body.mock) })
    res.json({ check, provider: getProvider(provider_id) })
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
})

app.post('/api/bookings', (req, res) => {
  const result = requestBooking(req.body)
  if ('error' in result) return res.status(400).json(result)
  res.status(201).json(result)
})

app.get('/api/bookings', (req, res) => {
  res.json(listBookings(req.query.provider_id ? Number(req.query.provider_id) : undefined))
})

app.get('/api/bookings/:id', (req, res) => {
  const booking = getBookingStatus(Number(req.params.id))
  if (!booking) return res.status(404).json({ error: 'not found' })
  res.json(booking)
})

app.get('/api/providers/:id/review-summary', async (req, res) => {
  const provider_id = Number(req.params.id)
  const { cached, reviews } = getReviewSummary(provider_id)
  if (cached) return res.json({ summary: cached, cached: true })
  if (!reviews.length) return res.json({ summary: null, cached: false })
  try {
    const { summarizeReviews } = await import('./chat.ts')
    const summary = await summarizeReviews(provider_id)
    res.json({ summary, cached: false })
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
})

app.get('/api/providers/:id/translate', async (req, res) => {
  const provider_id = Number(req.params.id)
  if (!getProvider(provider_id)) return res.status(404).json({ error: 'not found' })
  try {
    const { translateProvider } = await import('./translate.ts')
    res.json(await translateProvider(provider_id))
  } catch (err) {
    res.status(502).json({ error: `translation failed: ${String(err instanceof Error ? err.message : err)}` })
  }
})

app.post('/api/translate', async (req, res) => {
  const text = String(req.body?.text ?? '').trim()
  if (!text) return res.status(400).json({ error: 'text required' })
  try {
    const { translateToJapanese } = await import('./translate.ts')
    res.json({ lang: 'ja', text: await translateToJapanese(text) })
  } catch (err) {
    res.status(502).json({ error: `translation failed: ${String(err instanceof Error ? err.message : err)}` })
  }
})

app.post('/api/chat', async (req, res) => {
  try {
    const { conciergeChat } = await import('./chat.ts')
    await conciergeChat(req.body.messages ?? [], res)
  } catch (err) {
    res.status(502).json({ error: String(err) })
  }
})

// Serve built web app if present (single-process demo fallback)
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'web', 'dist')
app.use(express.static(dist))

const PORT = Number(process.env.PORT ?? 3001)
app.listen(PORT, () => console.log(`CubbyCare API on :${PORT}`))
