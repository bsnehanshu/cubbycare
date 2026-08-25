export const AMENITY_META: Record<string, { label: string; icon: string }> = {
  meals_breakfast: { label: 'Breakfast', icon: '🥣' },
  meals_lunch: { label: 'Lunch', icon: '🥪' },
  playground_outdoor: { label: 'Outdoor play', icon: '🛝' },
  nap_room: { label: 'Nap room', icon: '😴' },
  arts: { label: 'Arts & crafts', icon: '🎨' },
  music: { label: 'Music', icon: '🎵' },
  stem: { label: 'STEM', icon: '🔬' },
  pickup_dropoff: { label: 'Pickup / dropoff', icon: '🚗' },
  nut_free: { label: 'Nut-free', icon: '🥜' },
}

export const AGE_BAND_META: Record<string, { label: string; range: string; icon: string }> = {
  infant: { label: 'Infant', range: '6–18 mo', icon: '🍼' },
  toddler: { label: 'Toddler', range: '18 mo–3 yr', icon: '🧸' },
  preschool: { label: 'Preschool', range: '3–5 yr', icon: '🖍️' },
  school_age: { label: 'School age', range: '5–10 yr', icon: '🎒' },
}

export const TIER_META: Record<number, { label: string; color: string; bg: string; icon: string; blurb: string }> = {
  0: { label: 'Unverified', color: '#6b7280', bg: '#f3f4f6', icon: '○', blurb: 'No checks completed yet' },
  1: { label: 'ID verified', color: '#5c8bab', bg: '#e8f0f6', icon: '✓', blurb: 'Government ID confirmed' },
  2: { label: 'Credentialed', color: '#5d7f4a', bg: '#ecf2e6', icon: '✓✓', blurb: 'AI-verified credential on file' },
  3: { label: 'Licensed', color: '#c99118', bg: '#fdf3dc', icon: '★', blurb: 'CA state license confirmed' },
}

export const TIER_PIN_COLOR: Record<number, string> = {
  0: '#9ca3af',
  1: '#5c8bab',
  2: '#7fa167',
  3: '#c99118',
}

export const DAY_LABELS: [string, string][] = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
]

export function formatAge(months: number): string {
  if (months < 24) return `${months} mo`
  const years = Math.floor(months / 12)
  return `${years} yr${months % 12 ? ` ${months % 12} mo` : ''}`
}
