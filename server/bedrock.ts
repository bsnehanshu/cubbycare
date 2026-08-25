import { AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk'

// Bedrock model IDs carry the `anthropic.` prefix (Mantle Messages-API endpoint)
export const CONCIERGE_MODEL = 'anthropic.claude-haiku-4-5'
export const VERIFY_MODEL = 'anthropic.claude-fable-5'
export const TRANSLATE_MODEL = 'anthropic.claude-haiku-4-5'

export const bedrock = new AnthropicBedrockMantle({
  awsRegion: process.env.AWS_REGION ?? 'us-west-2',
})
