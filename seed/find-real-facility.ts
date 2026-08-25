// One-off helper: agent browses the public CCL registry and returns a few REAL
// San Francisco child-care facilities (name + facility number) for demo use.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { bedrock, VERIFY_MODEL } from '../server/bedrock.ts'

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@playwright/mcp@latest', '--browser', 'chrome'],
})
const mcp = new Client({ name: 'facility-finder', version: '0.1.0' })
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
    content: `Using the browser tools, go to https://www.ccld.dss.ca.gov/carefacilitysearch/ and search for CHILD CARE facilities in the city of SAN FRANCISCO (use the child care facility type if asked). From the results, pick 2-3 facilities with status Licensed and report ONLY JSON, no prose:
[{"facility_name": "...", "facility_number": "...", "status": "..."}]`,
  },
]

for (let turn = 0; turn < 24; turn++) {
  const response = await bedrock.messages.create({
    model: VERIFY_MODEL,
    max_tokens: 8000,
    messages: messages as never,
    tools: anthropicTools as never,
  })
  messages.push({ role: 'assistant', content: response.content })
  if (response.stop_reason !== 'tool_use') {
    console.log(response.content.find((b) => b.type === 'text')?.text)
    break
  }
  const toolResults = []
  for (const block of response.content) {
    if (block.type !== 'tool_use') continue
    console.error(`  → ${block.name}`)
    const result = await mcp.callTool({ name: block.name, arguments: block.input as Record<string, unknown> })
    const text = (result.content as Array<{ type: string; text?: string }>)
      .map((c) => (c.type === 'text' ? c.text : `[${c.type}]`))
      .join('\n')
    toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: text.slice(0, 20000), is_error: Boolean(result.isError) })
  }
  messages.push({ role: 'user', content: toolResults })
}
await mcp.close()
