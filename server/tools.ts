// Single tool catalog shared by the AI concierge (chat.ts) and the MCP server (mcp.ts).
// Each tool wraps a core.ts function — no logic lives here.
import {
  searchProviders,
  getProvider,
  registerProvider,
  submitCredential,
  requestBooking,
  getBookingStatus,
  getReviewSummary,
  type SearchParams,
  type RegisterInput,
} from './core.ts'
import { AMENITIES, AGE_BANDS } from './db.ts'

export type ToolDef = {
  name: string
  description: string
  input_schema: Record<string, unknown>
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>
}

export const TOOLS: ToolDef[] = [
  {
    name: 'search_providers',
    description:
      'Search the CubbyCare childcare provider registry for San Francisco. Call this whenever a parent asks to find care — filter by neighborhood, child age, amenities, day of week, or urgent availability. Returns providers sorted by distance (when a location is given) with verification tier, amenities, age bands, and open spots.',
    input_schema: {
      type: 'object',
      properties: {
        near: { type: 'string', description: 'SF neighborhood name, e.g. "mission", "noe valley", "outer sunset"' },
        child_age_months: { type: 'integer', description: 'Child age in months (6–120). 2 years = 24.' },
        amenities: {
          type: 'array',
          items: { type: 'string', enum: [...AMENITIES] },
          description: 'Required amenities — providers must have all of them',
        },
        day: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], description: 'Day of week care is needed' },
        verified_only: { type: 'boolean', description: 'Only providers with verified credentials (tier 2+)' },
        available_within_hours: {
          type: 'number',
          description: 'EMERGENCY MODE: only providers open with spots available within this many hours from now. Use for "I need care today/soon/right now".',
        },
        max_results: { type: 'integer' },
      },
    },
    execute: (input) => searchProviders(input as SearchParams),
  },
  {
    name: 'get_provider',
    description: 'Get full details for one provider by id: bio, credentials, amenities, age bands, weekly availability, reviews.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'integer', description: 'Provider id' } },
      required: ['id'],
    },
    execute: (input) => getProvider(Number(input.id)) ?? { error: `No provider with id ${input.id}` },
  },
  {
    name: 'register_provider',
    description:
      'Register a new childcare provider (individual caregiver or centre) in the CubbyCare registry. Starts at verification tier 0; credentials raise the tier.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['individual', 'center'] },
        name: { type: 'string' },
        bio: { type: 'string' },
        neighborhood: { type: 'string', description: 'SF neighborhood, e.g. "mission"' },
        address: { type: 'string' },
        price_hint: { type: 'string', enum: ['$', '$$', '$$$', '$$$$'] },
        capacity: { type: 'integer' },
        spots_available: { type: 'integer' },
        age_bands: { type: 'array', items: { type: 'string', enum: [...AGE_BANDS] } },
        amenities: { type: 'array', items: { type: 'string', enum: [...AMENITIES] } },
        weekly_availability: {
          type: 'object',
          description: 'Map of day (mon..sun) to array of slots ("am", "pm"), e.g. {"mon": ["am","pm"], "sat": ["am"]}',
        },
        languages: { type: 'array', items: { type: 'string' } },
        license_number: { type: 'string', description: 'CA Community Care Licensing facility number, if a licensed centre' },
      },
      required: ['type', 'name', 'neighborhood'],
    },
    execute: (input) => registerProvider(input as unknown as RegisterInput),
  },
  {
    name: 'submit_credential',
    description:
      'Add a credential (CPR cert, ECE degree, license, experience) to a provider record. Text-only credentials start as "pending"; use the web app to upload a certificate image for instant AI verification.',
    input_schema: {
      type: 'object',
      properties: {
        provider_id: { type: 'integer' },
        kind: { type: 'string', description: 'e.g. "CPR & First Aid", "ECE degree", "CA Child Care Center License"' },
        issuer: { type: 'string' },
        details: { type: 'string' },
        expiry: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['provider_id', 'kind'],
    },
    execute: (input) => submitCredential(input as { provider_id: number; kind: string }),
  },
  {
    name: 'request_booking',
    description:
      'Send a booking request to a provider on behalf of a parent. Returns the booking id and flags if the child age is outside the provider\'s range. Ask the parent for their name, the date, and the child\'s age before booking if not given.',
    input_schema: {
      type: 'object',
      properties: {
        provider_id: { type: 'integer' },
        parent_name: { type: 'string' },
        child_age_months: { type: 'integer' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        slot: { type: 'string', enum: ['am', 'pm'] },
        notes: { type: 'string' },
      },
      required: ['provider_id', 'parent_name', 'child_age_months', 'date'],
    },
    execute: (input) => requestBooking(input as Parameters<typeof requestBooking>[0]),
  },
  {
    name: 'get_booking_status',
    description: 'Check the status of a booking request by id.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'integer', description: 'Booking id' } },
      required: ['id'],
    },
    execute: (input) => getBookingStatus(Number(input.id)) ?? { error: `No booking with id ${input.id}` },
  },
  {
    name: 'summarize_reviews',
    description: 'Get the parent reviews (and any cached AI summary) for a provider.',
    input_schema: {
      type: 'object',
      properties: { provider_id: { type: 'integer' } },
      required: ['provider_id'],
    },
    execute: (input) => getReviewSummary(Number(input.provider_id)),
  },
]

export async function executeTool(name: string, input: Record<string, unknown>) {
  const tool = TOOLS.find((t) => t.name === name)
  if (!tool) return { error: `Unknown tool: ${name}` }
  try {
    return await tool.execute(input)
  } catch (err) {
    return { error: String(err instanceof Error ? err.message : err) }
  }
}
