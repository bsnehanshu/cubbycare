import { bedrock, VERIFY_MODEL } from './bedrock.ts'

export type VerifyResult = {
  kind: string | null
  holder: string | null
  issuer: string | null
  expiry: string | null
  verdict: 'verified' | 'rejected'
  notes: string | null
}

const SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: ['string', 'null'], description: 'Credential type, e.g. "CPR & First Aid", "ECE Degree"' },
    holder: { type: ['string', 'null'], description: 'Name of the person or facility the credential belongs to' },
    issuer: { type: ['string', 'null'], description: 'Issuing organization' },
    expiry: { type: ['string', 'null'], description: 'Expiry date as YYYY-MM-DD if present' },
    verdict: {
      type: 'string',
      enum: ['verified', 'rejected'],
      description: 'verified if this is a plausible, legible childcare-relevant credential document; rejected otherwise',
    },
    notes: { type: ['string', 'null'], description: 'One short sentence on anything notable (illegible fields, expired, wrong document type)' },
  },
  required: ['kind', 'holder', 'issuer', 'expiry', 'verdict', 'notes'],
  additionalProperties: false,
} as const

// Fable 5: thinking is always on (omit the param); check stop_reason before reading content.
// Bedrock's endpoint rejects output_config.format, so we prompt for JSON and parse.
export async function verifyCredentialImage(imageBase64: string, mediaType: string): Promise<VerifyResult> {
  const response = await bedrock.messages.create({
    model: VERIFY_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `This document was uploaded as proof of a childcare-related credential (CPR/first-aid certificate, early-childhood-education degree or units, teaching credential, care license, or similar). Verdict "verified" only if the document is legible, plausibly authentic, childcare-relevant, and not expired.\n\nRespond with ONLY a JSON object matching this schema, no prose:\n${JSON.stringify(SCHEMA)}`,
          },
        ],
      },
    ],
  })

  if (response.stop_reason === 'refusal') {
    return { kind: null, holder: null, issuer: null, expiry: null, verdict: 'rejected', notes: 'Automated review declined — flagged for manual verification.' }
  }
  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('no extraction returned')
  const json = text.match(/\{[\s\S]*\}/)?.[0]
  if (!json) throw new Error(`unparseable extraction: ${text.slice(0, 200)}`)
  return JSON.parse(json) as VerifyResult
}
