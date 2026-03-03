import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSalesOrderTools } from './sales-orders.js';
import { registerInventoryTools } from './inventory.js';
import { registerShipmentTools } from './shipments.js';
import { registerInvoiceTools } from './invoices.js';
import { registerPurchaseOrderTools } from './purchase-orders.js';
import { registerCustomerTools } from './customers.js';
import { registerODataTools } from './odata.js';

export function registerAllTools(server: McpServer): void {
  registerSalesOrderTools(server);
  registerInventoryTools(server);
  registerShipmentTools(server);
  registerInvoiceTools(server);
  registerPurchaseOrderTools(server);
  registerCustomerTools(server);
  registerODataTools(server);
}
