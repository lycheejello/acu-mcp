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
      top: z.number().optional().describe('Max records to return (default 50, max 500)'),
      skip: z.number().optional().describe('Records to skip for pagination'),
    },
  }, async ({ filter, orderby, top, skip }) => {
    const params: Record<string, string> = {};

    if (filter) params['$filter'] = filter;
    if (orderby) params['$orderby'] = orderby;
    if (skip) params['$skip'] = String(skip);
    params['$top'] = String(Math.min(top ?? 50, 500));

    const data = await client.getEntity('SalesOrder', params);
    const rows = Array.isArray(data) ? data : [];

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
    },
  }, async ({ orderType, orderNbr }) => {
    const data = await client.getEntityByKey(
      'SalesOrder',
      [orderType, orderNbr],
      { '$expand': 'Details' }
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  });
}
