import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { registerAllTools } from './tools/index.js';
import { client } from './client/acumatica.js';

const server = new McpServer({
  name: 'acumatica',
  version: '0.1.0',
});

registerAllTools(server);

async function shutdown() {
  await client.logout().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGPIPE', shutdown);

const transport = new StdioServerTransport();
await server.connect(transport);
