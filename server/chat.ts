import type { Response } from 'express'
import { bedrock, CONCIERGE_MODEL } from './bedrock.ts'
import { TOOLS, executeTool } from './tools.ts'
import { getReviewSummary, setReviewSummary } from './core.ts'

const SYSTEM = `You are the CubbyCare concierge — a warm, efficient assistant helping San Francisco parents find childcare for kids aged 6 months to 10 years, and helping providers join the registry.

Use your tools to search the live registry, look at provider details, and place booking requests. Never invent providers or availability — everything comes from tool results.

Guidelines:
- Parents are often in a hurry. Be brief and lead with the best matches.
- "I need care NOW / today / in N hours" → use search_providers with available_within_hours (emergency mode).
- When you mention a specific provider, always cite it as [provider:ID] right after its name so the app can link it, e.g. "Little Sprouts Learning Center [provider:1]".
- Mention the verification tier in plain words: Licensed (state license verified), Credentialed (verified credential on file), ID verified, or Unverified.
- Before placing a booking, make sure you have the parent's name, the child's age, and the date. Confirm the request back in one line after booking.
- Today's date is ${new Date().toISOString().slice(0, 10)} and it is currently ${new Date().toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' })} in San Francisco.
- Plain text only, no markdown headers or bullets-of-bullets. Short paragraphs.`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const anthropicTools = TOOLS.map(({ name, description, input_schema }) => ({ name, description, input_schema }))

export async function conciergeChat(history: ChatMessage[], res: Response) {
  res.setHeader('content-type', 'application/x-ndjson')
  const emit = (event: Record<string, unknown>) => res.write(JSON.stringify(event) + '\n')

  const messages: Array<Record<string, unknown>> = history.map((m) => ({ role: m.role, content: m.content }))

  try {
    for (let turn = 0; turn < 8; turn++) {
      const response = await bedrock.messages.create({
        model: CONCIERGE_MODEL,
        max_tokens: 2048,
        system: SYSTEM,
        tools: anthropicTools as never,
        messages: messages as never,
      })

      messages.push({ role: 'assistant', content: response.content })

      const toolUses = response.content.filter((b) => b.type === 'tool_use')
      for (const block of response.content) {
        if (block.type === 'text' && block.text.trim()) emit({ type: 'text', delta: block.text })
      }

      if (response.stop_reason !== 'tool_use' || !toolUses.length) break

      const toolResults = []
      for (const tu of toolUses) {
        emit({ type: 'tool', name: tu.name, input: tu.input })
        const result = await executeTool(tu.name, tu.input as Record<string, unknown>)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tu.id,
          content: JSON.stringify(result).slice(0, 12000),
        })
      }
      messages.push({ role: 'user', content: toolResults })
    }
    emit({ type: 'done' })
  } catch (err) {
    emit({ type: 'error', message: String(err instanceof Error ? err.message : err) })
  } finally {
    res.end()
  }
}

export async function summarizeReviews(providerId: number): Promise<string | null> {
  const { cached, reviews } = getReviewSummary(providerId)
  if (cached) return cached
  if (!reviews.length) return null

  const response = await bedrock.messages.create({
    model: CONCIERGE_MODEL,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `Summarize what parents say in these childcare reviews in ONE warm, honest sentence (mention a caveat if reviews raise one):\n\n${reviews
          .map((r) => `${r.rating}/5: ${r.text}`)
          .join('\n')}`,
      },
    ],
  })
  const summary = response.content.find((b) => b.type === 'text')?.text.trim() ?? null
  if (summary) setReviewSummary(providerId, summary)
  return summary
}
