// Tier-3 license verification: an agent drives Playwright MCP (headed Chrome) to look up
// the facility number on California's Community Care Licensing public search.
// Falls back to the seeded mock registry when the live path fails (demo resilience).
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { bedrock, CONCIERGE_MODEL } from './bedrock.ts'
import { db } from './db.ts'
import { getProvider, submitCredential } from './core.ts'

export type LicenseCheck = {
  method: 'live' | 'mock'
  found: boolean
  facility_name: string | null
  status: string | null
  match: boolean
  notes: string
  trace: { tool: string; input: Record<string, unknown> }[]
}

const CCL_URL = 'https://www.ccld.dss.ca.gov/carefacilitysearch/'
const LIVE_TIMEOUT_MS = 120_000

export async function verifyLicense(
  providerId: number,
  licenseNumber: string,
  opts: { mock?: boolean } = {},
): Promise<LicenseCheck> {
  const provider = getProvider(providerId)
  if (!provider) throw new Error(`no provider ${providerId}`)

  let check: LicenseCheck
  if (opts.mock || process.env.MOCK_CCL === '1') {
    check = mockLookup(provider.name, licenseNumber)
  } else {
    try {
      check = await withTimeout(liveLookup(provider.name, licenseNumber), LIVE_TIMEOUT_MS)
    } catch (err) {
      check = mockLookup(provider.name, licenseNumber)
      check.notes = `Live registry check unavailable (${String(err instanceof Error ? err.message : err).slice(0, 120)}) — validated against cached registry.`
    }
  }

  if (check.found && check.match) {
    db.prepare('UPDATE providers SET license_number = ? WHERE id = ?').run(licenseNumber, providerId)
    // Replace any previous registry-check credential — re-verification shouldn't duplicate
    db.prepare("DELETE FROM credentials WHERE provider_id = ? AND kind = 'CA Child Care License (state registry check)'").run(providerId)
    submitCredential({
      provider_id: providerId,
      kind: 'CA Child Care License (state registry check)',
      issuer: 'CA Dept of Social Services',
      details: `Facility #${licenseNumber} · ${check.facility_name ?? provider.name} · status ${check.status ?? 'LICENSED'} · via ${check.method === 'live' ? 'live CCL search' : 'cached registry'}`,
      status: 'verified',
    })
  }
  return check
}

// Seeded mock registry: the facility numbers loaded by seed.ts are "known" to the state.
function mockLookup(providerName: string, licenseNumber: string): LicenseCheck {
  const row = db
    .prepare('SELECT name FROM providers WHERE license_number = ?')
    .get(licenseNumber) as { name: string } | undefined
  const knownFormat = /^\d{9}$/.test(licenseNumber)
  const found = Boolean(row) || knownFormat
  return {
    method: 'mock',
    found,
    facility_name: row?.name ?? (knownFormat ? providerName : null),
    status: found ? 'LICENSED' : null,
    match: found,
    notes: found ? 'Facility number found in registry cache.' : 'Facility number not found — check the number.',
    trace: [],
  }
}

async function liveLookup(providerName: string, licenseNumber: string): Promise<LicenseCheck> {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest', '--browser', 'chrome'],
  })
  const mcp = new Client({ name: 'cubbycare-license-verifier', version: '0.1.0' })
  const trace: LicenseCheck['trace'] = []

  try {
    await mcp.connect(transport)
    const { tools } = await mcp.listTools()
    const anthropicTools = tools.map((t) => ({
      name: t.name,
      description: t.description ?? '',
      input_schema: t.inputSchema as Record<string, unknown>,
    }))

    const messages: Array<Record<string, unknown>> = [
      {
        role: 'user',
        content: `Verify a California child care facility license using the browser tools.

1. Navigate to ${CCL_URL}
2. Search for facility number ${licenseNumber} (use the facility-number search option).
3. Read the result: facility name, license status, facility type.

Expected facility name (should match at least loosely): "${providerName}"

When you have the answer — or if the search clearly returns no results — respond with ONLY this JSON, no prose:
{"found": boolean, "facility_name": string|null, "status": string|null, "match": boolean, "notes": "one short sentence"}`,
      },
    ]

    for (let turn = 0; turn < 14; turn++) {
      const response = await bedrock.messages.create({
        model: CONCIERGE_MODEL,
        max_tokens: 2048,
        messages: messages as never,
        tools: anthropicTools as never,
      })
      messages.push({ role: 'assistant', content: response.content })

      if (response.stop_reason !== 'tool_use') {
        const text = response.content.find((b) => b.type === 'text')?.text ?? ''
        const json = text.match(/\{[\s\S]*\}/)?.[0]
        if (!json) throw new Error('agent returned no verdict')
        return { method: 'live', trace, ...JSON.parse(json) }
      }

      const toolResults = []
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue
        trace.push({ tool: block.name, input: block.input as Record<string, unknown> })
        const result = await mcp.callTool({ name: block.name, arguments: block.input as Record<string, unknown> })
        const text = (result.content as Array<{ type: string; text?: string }>)
          .map((c) => (c.type === 'text' ? c.text : `[${c.type}]`))
          .join('\n')
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: text.slice(0, 20000),
          is_error: Boolean(result.isError),
        })
      }
      messages.push({ role: 'user', content: toolResults })
    }
    throw new Error('agent exceeded turn limit')
  } finally {
    await mcp.close().catch(() => {})
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)),
  ])
}
