import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client } from '../client/acumatica.js';

export function registerCustomerTools(server: McpServer): void {

  server.registerTool('query_customers', {
    description:
      'List and filter Acumatica customers. Use this to look up customers by name, ' +
      'class, status, or credit terms for analytics and reporting.',
    inputSchema: {
      filter: z.string().optional().describe(
        "OData $filter expression. Examples: \"Status eq 'Active'\", " +
        "\"CustomerClass eq 'DEFAULT'\", \"CustomerName eq 'Acme Corp'\""
      ),
      orderby: z.string().optional().describe("OData $orderby. Example: \"CustomerName asc\""),
      top: z.number().optional().describe('Max records to return (default 50, max 500)'),
      skip: z.number().optional().describe('Records to skip for pagination'),
    },
  }, async ({ filter, orderby, top, skip }) => {
    const params: Record<string, string> = {
      $select: 'CustomerID,CustomerName,Status,CustomerClass,CreditLimit,Terms,CurrencyID,Email,PriceClassID,WarehouseID,ShipVia,TaxZone',
    };

    if (filter) params['$filter'] = filter;
    if (orderby) params['$orderby'] = orderby;
    if (skip) params['$skip'] = String(skip);
    params['$top'] = String(Math.min(top ?? 50, 500));

    const data = await client.getEntity('Customer', params);
    const rows = Array.isArray(data) ? data : [];

    return {
      content: [{
        type: 'text',
        text: `Found ${rows.length} customer(s).\n\n${JSON.stringify(rows, null, 2)}`,
      }],
    };
  });

  server.registerTool('get_customer', {
    description:
      'Get a specific Acumatica customer with full detail including billing, shipping, and credit info.',
    inputSchema: {
      customerID: z.string().describe("Customer ID, e.g. '10001'"),
    },
  }, async ({ customerID }) => {
    const data = await client.getEntityByKey('Customer', [customerID]);

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  });
}
