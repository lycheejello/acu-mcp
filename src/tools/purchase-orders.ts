import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client } from '../client/acumatica.js';

export function registerPurchaseOrderTools(server: McpServer): void {

  server.registerTool('query_purchase_orders', {
    description:
      'List and filter Acumatica purchase orders. Use this for procurement analytics, ' +
      'finding open or pending POs, or summarizing spend by vendor.',
    inputSchema: {
      filter: z.string().optional().describe(
        "OData $filter expression. Examples: \"Status eq 'Open'\", " +
        "\"VendorID eq 'VD001'\", \"Date gt '2025-01-01'\""
      ),
      orderby: z.string().optional().describe("OData $orderby. Example: \"Date desc\""),
      top: z.number().optional().describe('Max records to return (default 50, max 500)'),
      skip: z.number().optional().describe('Records to skip for pagination'),
    },
  }, async ({ filter, orderby, top, skip }) => {
    const params: Record<string, string> = {
      $select: 'OrderNbr,Type,Status,Date,VendorID,OrderTotal,LineTotal,TaxTotal,PromisedOn,Description',
    };

    if (filter) params['$filter'] = filter;
    if (orderby) params['$orderby'] = orderby;
    if (skip) params['$skip'] = String(skip);
    params['$top'] = String(Math.min(top ?? 50, 500));

    const data = await client.getEntity('PurchaseOrder', params);
    const rows = Array.isArray(data) ? data : [];

    return {
      content: [{
        type: 'text',
        text: `Found ${rows.length} purchase order(s).\n\n${JSON.stringify(rows, null, 2)}`,
      }],
    };
  });

  server.registerTool('get_purchase_order', {
    description:
      'Get a single Acumatica purchase order with full line item detail.',
    inputSchema: {
      orderType: z.string().describe("Order type, e.g. 'Normal', 'Drop Ship'"),
      orderNbr: z.string().describe("Order number, e.g. 'PO000001'"),
    },
  }, async ({ orderType, orderNbr }) => {
    const data = await client.getEntityByKey(
      'PurchaseOrder',
      [orderType, orderNbr],
      { '$expand': 'Details' }
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  });
}
