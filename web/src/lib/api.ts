export type Provider = {
  id: number
  type: 'individual' | 'center'
  name: string
  bio: string
  lat: number
  lng: number
  neighborhood: string
  address: string
  price_hint: string
  capacity: number
  verified_tier: number
  avatar: string
  languages: string[]
  amenities: string[]
  age_bands: string[]
  weekly_availability: Record<string, string[]>
  spots_available: number
  review_summary: string | null
  license_number: string | null
  distance_km?: number | null
}

export type Credential = {
  id: number
  provider_id: number
  kind: string
  issuer: string
  details: string
  expiry: string | null
  status: 'pending' | 'verified' | 'rejected'
}

export type Review = { id: number; rating: number; text: string; author: string }

export type ProviderDetail = Provider & { credentials: Credential[]; reviews: Review[] }

export type SearchFilters = {
  near?: string
  child_age_months?: number
  amenities?: string[]
  day?: string
  verified_only?: boolean
  available_within_hours?: number
}

export async function searchProviders(f: SearchFilters): Promise<{ results: Provider[] }> {
  const q = new URLSearchParams()
  if (f.near) q.set('near', f.near)
  if (f.child_age_months != null) q.set('child_age_months', String(f.child_age_months))
  if (f.amenities?.length) q.set('amenities', f.amenities.join(','))
  if (f.day) q.set('day', f.day)
  if (f.verified_only) q.set('verified_only', 'true')
  if (f.available_within_hours != null) q.set('available_within_hours', String(f.available_within_hours))
  const res = await fetch(`/api/providers?${q}`)
  return res.json()
}

export async function getProvider(id: number): Promise<ProviderDetail> {
  const res = await fetch(`/api/providers/${id}`)
  if (!res.ok) throw new Error('provider not found')
  return res.json()
}

export async function getMeta(): Promise<{ amenities: string[]; age_bands: string[]; neighborhoods: string[] }> {
  return (await fetch('/api/meta')).json()
}

export async function registerProvider(input: Record<string, unknown>): Promise<ProviderDetail> {
  const res = await fetch('/api/providers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'registration failed')
  return res.json()
}

export async function submitCredentialImage(
  providerId: number,
  imageBase64: string,
  mediaType: string,
): Promise<{ credential: Credential; extraction: Record<string, string>; provider: ProviderDetail }> {
  const res = await fetch(`/api/providers/${providerId}/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64, media_type: mediaType }),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'verification failed')
  return res.json()
}

export async function submitCredentialManual(
  providerId: number,
  fields: { kind: string; issuer?: string; details?: string; expiry?: string },
): Promise<{ credential: Credential; provider: ProviderDetail }> {
  const res = await fetch(`/api/providers/${providerId}/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(fields),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'submit failed')
  return res.json()
}

export async function requestBooking(input: {
  provider_id: number
  parent_name: string
  child_age_months: number
  date: string
  slot?: string
  notes?: string
}): Promise<{ booking: { id: number; status: string }; provider_name: string; age_fit: boolean; age_fit_note: string | null }> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error((await res.json()).error ?? 'booking failed')
  return res.json()
}

export async function getReviewSummary(providerId: number): Promise<{ summary: string | null }> {
  const res = await fetch(`/api/providers/${providerId}/review-summary`)
  if (!res.ok) return { summary: null }
  return res.json()
}

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

export async function translateProvider(providerId: number): Promise<TranslatedProvider> {
  const res = await fetch(`/api/providers/${providerId}/translate`)
  if (!res.ok) throw new Error((await res.json()).error ?? 'translation failed')
  return res.json()
}

// Concierge stream protocol: NDJSON lines
// {type:'text', delta} | {type:'tool', name, input} | {type:'tool_result', name, summary} | {type:'done'} | {type:'error', message}
export type ChatEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; summary: string; provider_ids?: number[] }
  | { type: 'done' }
  | { type: 'error'; message: string }

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function* streamChat(messages: ChatMessage[]): AsyncGenerator<ChatEvent> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok || !res.body) {
    yield { type: 'error', message: `concierge unavailable (${res.status})` }
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line) as ChatEvent
    }
  }
}
