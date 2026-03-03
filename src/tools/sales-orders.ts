import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client } from '../client/acumatica.js';

export function registerSalesOrderTools(server: McpServer): void {

  server.registerTool('query_sales_orders', {
    description:
      'Query Acumatica sales orders using the SO-SalesOrder generic inquiry. ' +
      'Use this for lists, analytics, and summaries. Supports OData $filter and $orderby.',
    inputSchema: {
      filter: z.string().optional().describe(
        "OData $filter expression. Examples: \"Status eq 'Open'\", " +
        "\"OrderDate gt '2025-01-01'\", \"CustomerID eq 'TUXTON'\""
      ),
      orderby: z.string().optional().describe(
        "OData $orderby. Example: \"OrderDate desc\""
      ),
      inventoryID: z.string().optional().describe(
        'Filter to orders that contain this inventory item in any line, e.g. "WIDGET-001"'
      ),
      includeDetails: z.boolean().optional().describe(
        'Set true to expand line items inline. Increases payload size significantly; use with a low top value.'
      ),
      top: z.number().optional().describe('Max records to return (default 50, max 500)'),
      skip: z.number().optional().describe('Records to skip for pagination'),
    },
  }, async ({ filter, orderby, inventoryID, includeDetails, top, skip }) => {
    const params: Record<string, string> = {};

    if (filter) params['$filter'] = filter;
    if (orderby) params['$orderby'] = orderby;
    if (skip !== undefined) params['$skip'] = String(skip);
    params['$top'] = String(Math.min(top ?? 50, 500));
    if (inventoryID || includeDetails) params['$expand'] = 'Details';

    const data = await client.getEntity('SalesOrder', params);
    let rows = Array.isArray(data) ? data : [];

    if (inventoryID) {
      const id = inventoryID.toUpperCase();
      rows = rows.filter((order: Record<string, unknown>) => {
        const details = order['Details'];
        if (!Array.isArray(details)) return false;
        return details.some((line: Record<string, unknown>) => {
          const inv = line['InventoryID'];
          const val = typeof inv === 'object' && inv !== null ? (inv as Record<string, unknown>)['value'] : inv;
          return typeof val === 'string' && val.toUpperCase() === id;
        });
      });
      // Strip detail lines unless caller also wants them
      if (!includeDetails) {
        rows = rows.map(({ Details: _details, ...header }: Record<string, unknown>) => header);
      }
    }

    return {
      content: [{
        type: 'text',
        text: `Found ${rows.length} sales order(s).\n\n${JSON.stringify(rows, null, 2)}`,
      }],
    };
  });

  server.registerTool('get_sales_order', {
    description:
      'Get a single Acumatica sales order with full line item detail. ' +
      'Use this when you need line-level data for a specific known order.',
    inputSchema: {
      orderType: z.string().describe("Order type code, e.g. 'SO', 'QT', 'IN'"),
      orderNbr: z.string().describe("Order number, e.g. '000001'"),
      select: z.string().optional().describe(
        "Comma-separated header fields to return, e.g. \"OrderNbr,CustomerID,OrderTotal,Status\". Omit for all fields."
      ),
    },
  }, async ({ orderType, orderNbr, select }) => {
    const params: Record<string, string> = { '$expand': 'Details' };
    if (select) params['$select'] = select;
    const data = await client.getEntityByKey(
      'SalesOrder',
      [orderType, orderNbr],
      params
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  });
}
