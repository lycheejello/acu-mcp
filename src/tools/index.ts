import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSalesOrderTools } from './sales-orders.js';
import { registerInventoryTools } from './inventory.js';

export function registerAllTools(server: McpServer): void {
  registerSalesOrderTools(server);
  registerInventoryTools(server);
}
