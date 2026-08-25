// CubbyCare MCP server — the same registry the web app uses, exposed to any MCP client.
// Run: npx tsx server/mcp.ts   (stdio transport — no console.log in this process)
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { TOOLS, executeTool } from './tools.ts'
import { seed } from './seed.ts'

seed()

// translate_to_japanese is absent on purpose: it writes to the translation cache.
const READ_ONLY = new Set(['search_providers', 'get_provider', 'get_booking_status', 'summarize_reviews'])

const server = new Server(
  { name: 'cubbycare', version: '0.1.0' },
  { capabilities: { tools: {} } },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, input_schema }) => ({
    name,
    description,
    inputSchema: input_schema,
    annotations: {
      readOnlyHint: READ_ONLY.has(name),
      destructiveHint: false,
      openWorldHint: false,
    },
  })),
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await executeTool(request.params.name, request.params.arguments ?? {})
  const isError = typeof result === 'object' && result !== null && 'error' in result && Object.keys(result).length === 1
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    isError,
  }
})

await server.connect(new StdioServerTransport())
console.error('CubbyCare MCP server ready (stdio)')
