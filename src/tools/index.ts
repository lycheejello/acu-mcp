import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSalesOrderTools } from './sales-orders.js';
import { registerInventoryTools } from './inventory.js';
import { registerShipmentTools } from './shipments.js';
import { registerInvoiceTools } from './invoices.js';
import { registerPurchaseOrderTools } from './purchase-orders.js';

export function registerAllTools(server: McpServer): void {
  registerSalesOrderTools(server);
  registerInventoryTools(server);
  registerShipmentTools(server);
  registerInvoiceTools(server);
  registerPurchaseOrderTools(server);
}
