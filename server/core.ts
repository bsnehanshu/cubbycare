import { db, ageBandForMonths } from './db.ts'

// Rough centroids so "near the Mission" works without a geocoder
export const NEIGHBORHOODS: Record<string, { lat: number; lng: number }> = {
  'mission': { lat: 37.7599, lng: -122.4148 },
  'noe valley': { lat: 37.7502, lng: -122.4337 },
  'inner sunset': { lat: 37.7601, lng: -122.4689 },
  'outer sunset': { lat: 37.7530, lng: -122.4940 },
  'inner richmond': { lat: 37.7800, lng: -122.4640 },
  'outer richmond': { lat: 37.7780, lng: -122.4930 },
  'soma': { lat: 37.7785, lng: -122.4056 },
  'marina': { lat: 37.8021, lng: -122.4369 },
  'bernal heights': { lat: 37.7411, lng: -122.4158 },
  'castro': { lat: 37.7609, lng: -122.4350 },
  'hayes valley': { lat: 37.7759, lng: -122.4245 },
  'potrero hill': { lat: 37.7605, lng: -122.4005 },
  'north beach': { lat: 37.8060, lng: -122.4103 },
  'pacific heights': { lat: 37.7925, lng: -122.4382 },
  'glen park': { lat: 37.7338, lng: -122.4337 },
  'cole valley': { lat: 37.7656, lng: -122.4501 },
  'dogpatch': { lat: 37.7586, lng: -122.3884 },
  'nob hill': { lat: 37.7930, lng: -122.4161 },
  'presidio heights': { lat: 37.7886, lng: -122.4531 },
  'excelsior': { lat: 37.7244, lng: -122.4260 },
  'japantown': { lat: 37.7854, lng: -122.4300 },
  'downtown': { lat: 37.7879, lng: -122.4075 },
  'financial district': { lat: 37.7946, lng: -122.3999 },
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

type ProviderRow = Record<string, unknown> & {
  id: number
  lat: number
  lng: number
  languages: string
  amenities: string
  age_bands: string
  weekly_availability: string
}

function inflate(row: ProviderRow) {
  return {
    ...row,
    languages: JSON.parse(row.languages) as string[],
    amenities: JSON.parse(row.amenities) as string[],
    age_bands: JSON.parse(row.age_bands) as string[],
    weekly_availability: JSON.parse(row.weekly_availability) as Record<string, string[]>,
  }
}

export type SearchParams = {
  near?: string // neighborhood name, fuzzy
  lat?: number
  lng?: number
  child_age_months?: number
  amenities?: string[]
  day?: string // mon..sun
  verified_only?: boolean
  available_within_hours?: number // emergency mode: open now-ish with spots
  max_results?: number
}

export function searchProviders(params: SearchParams) {
  const rows = db.prepare('SELECT * FROM providers').all() as ProviderRow[]
  let origin: { lat: number; lng: number } | null = null
  if (params.lat != null && params.lng != null) origin = { lat: params.lat, lng: params.lng }
  else if (params.near) {
    const key = params.near.toLowerCase().replace(/^(the|near)\s+/g, '').trim()
    origin =
      NEIGHBORHOODS[key] ??
      Object.entries(NEIGHBORHOODS).find(([name]) => name.includes(key) || key.includes(name))?.[1] ??
      null
  }

  const band = params.child_age_months != null ? ageBandForMonths(params.child_age_months) : null
  if (params.child_age_months != null && !band) {
    return { error: 'child_age_months must be between 6 and 120 (6 months to 10 years)', results: [] }
  }

  let results = rows.map(inflate).filter((p) => {
    if (band && !p.age_bands.includes(band)) return false
    if (params.amenities?.length && !params.amenities.every((a) => p.amenities.includes(a))) return false
    if (params.day && !(p.weekly_availability[params.day.toLowerCase().slice(0, 3)]?.length > 0)) return false
    if (params.verified_only && (p.verified_tier as number) < 2) return false
    if (params.available_within_hours != null) {
      const now = new Date()
      const hours = params.available_within_hours
      const windowEnd = new Date(now.getTime() + hours * 3600_000)
      const slotsToCheck: [string, string][] = []
      for (const d of [now, windowEnd]) {
        const day = DAYS[d.getDay()]
        slotsToCheck.push([day, d.getHours() < 12 ? 'am' : 'pm'])
      }
      const openInWindow = slotsToCheck.some(([day, slot]) => p.weekly_availability[day]?.includes(slot))
      if (!openInWindow || (p.spots_available as number) < 1) return false
    }
    return true
  })

  const withDistance = results.map((p) => ({
    ...p,
    distance_km: origin ? Math.round(haversineKm(origin.lat, origin.lng, p.lat, p.lng) * 10) / 10 : null,
  }))
  if (origin) withDistance.sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
  else withDistance.sort((a, b) => (b.verified_tier as number) - (a.verified_tier as number))

  return { results: withDistance.slice(0, params.max_results ?? 20), origin }
}

export function getProvider(id: number) {
  const row = db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as ProviderRow | undefined
  if (!row) return null
  const credentials = db.prepare('SELECT * FROM credentials WHERE provider_id = ? ORDER BY status').all(id)
  const reviews = db.prepare('SELECT * FROM reviews WHERE provider_id = ? ORDER BY id DESC').all(id)
  return { ...inflate(row), credentials, reviews }
}

export type RegisterInput = {
  type: 'individual' | 'center'
  name: string
  bio?: string
  lat?: number
  lng?: number
  neighborhood: string
  address?: string
  price_hint?: string
  capacity?: number
  avatar?: string
  languages?: string[]
  amenities?: string[]
  age_bands?: string[]
  weekly_availability?: Record<string, string[]>
  spots_available?: number
  license_number?: string
}

export function registerProvider(input: RegisterInput) {
  const hood = NEIGHBORHOODS[input.neighborhood.toLowerCase()] ?? { lat: 37.7749, lng: -122.4194 }
  const { lastInsertRowid } = db
    .prepare(`
      INSERT INTO providers (type, name, bio, lat, lng, neighborhood, address, price_hint, capacity,
        verified_tier, avatar, languages, amenities, age_bands, weekly_availability, spots_available, license_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.type, input.name, input.bio ?? '', input.lat ?? hood.lat, input.lng ?? hood.lng,
      input.neighborhood, input.address ?? '', input.price_hint ?? '$$', input.capacity ?? 1,
      input.avatar ?? (input.type === 'center' ? '🏫' : '🧑‍🍼'),
      JSON.stringify(input.languages ?? ['English']), JSON.stringify(input.amenities ?? []),
      JSON.stringify(input.age_bands ?? []), JSON.stringify(input.weekly_availability ?? {}),
      input.spots_available ?? 1, input.license_number ?? null,
    )
  return getProvider(Number(lastInsertRowid))!
}

export function submitCredential(input: {
  provider_id: number
  kind: string
  issuer?: string
  details?: string
  expiry?: string
  status?: 'pending' | 'verified' | 'rejected'
}) {
  const { lastInsertRowid } = db
    .prepare('INSERT INTO credentials (provider_id, kind, issuer, details, expiry, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(input.provider_id, input.kind, input.issuer ?? '', input.details ?? '', input.expiry ?? null, input.status ?? 'pending')
  if (input.status === 'verified') recomputeTier(input.provider_id)
  return db.prepare('SELECT * FROM credentials WHERE id = ?').get(Number(lastInsertRowid))
}

export function setCredentialStatus(credential_id: number, status: 'verified' | 'rejected') {
  db.prepare('UPDATE credentials SET status = ? WHERE id = ?').run(status, credential_id)
  const cred = db.prepare('SELECT provider_id FROM credentials WHERE id = ?').get(credential_id) as
    | { provider_id: number }
    | undefined
  if (cred) recomputeTier(cred.provider_id)
  return cred ? getProvider(cred.provider_id) : null
}

// Tier rules: 3 = verified CA license credential, 2 = any verified credential, else keep current (0/1)
export function recomputeTier(provider_id: number) {
  const creds = db.prepare("SELECT kind FROM credentials WHERE provider_id = ? AND status = 'verified'").all(
    provider_id,
  ) as { kind: string }[]
  const current = (db.prepare('SELECT verified_tier FROM providers WHERE id = ?').get(provider_id) as {
    verified_tier: number
  }).verified_tier
  let tier = current
  if (creds.some((c) => /license/i.test(c.kind))) tier = 3
  else if (creds.length > 0) tier = Math.max(current, 2)
  db.prepare('UPDATE providers SET verified_tier = ? WHERE id = ?').run(tier, provider_id)
  return tier
}

export function requestBooking(input: {
  provider_id: number
  parent_name: string
  child_age_months: number
  date: string
  slot?: string
  notes?: string
}) {
  const provider = getProvider(input.provider_id)
  if (!provider) return { error: `No provider with id ${input.provider_id}` }
  const band = ageBandForMonths(input.child_age_months)
  if (!band) return { error: 'child_age_months must be between 6 and 120' }
  const ageFit = provider.age_bands.includes(band)
  const { lastInsertRowid } = db
    .prepare(
      'INSERT INTO booking_requests (provider_id, parent_name, child_age_months, date, slot, notes) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(input.provider_id, input.parent_name, input.child_age_months, input.date, input.slot ?? 'am', input.notes ?? '')
  return {
    booking: db.prepare('SELECT * FROM booking_requests WHERE id = ?').get(Number(lastInsertRowid)),
    provider_name: provider.name,
    age_fit: ageFit,
    age_fit_note: ageFit ? null : `Heads up: ${provider.name} lists ${provider.age_bands.join(', ')} — a ${band} may be outside their range.`,
  }
}

export function getBookingStatus(id: number) {
  return db.prepare('SELECT b.*, p.name AS provider_name FROM booking_requests b JOIN providers p ON p.id = b.provider_id WHERE b.id = ?').get(id) ?? null
}

export function listBookings(provider_id?: number) {
  return provider_id
    ? db.prepare('SELECT * FROM booking_requests WHERE provider_id = ? ORDER BY id DESC').all(provider_id)
    : db.prepare('SELECT b.*, p.name AS provider_name FROM booking_requests b JOIN providers p ON p.id = b.provider_id ORDER BY b.id DESC').all()
}

export function getReviewSummary(provider_id: number): { cached: string | null; reviews: { rating: number; text: string }[] } {
  const row = db.prepare('SELECT review_summary FROM providers WHERE id = ?').get(provider_id) as
    | { review_summary: string | null }
    | undefined
  const reviews = db.prepare('SELECT rating, text FROM reviews WHERE provider_id = ?').all(provider_id) as {
    rating: number
    text: string
  }[]
  return { cached: row?.review_summary ?? null, reviews }
}

export function setReviewSummary(provider_id: number, summary: string) {
  db.prepare('UPDATE providers SET review_summary = ? WHERE id = ?').run(summary, provider_id)
}
