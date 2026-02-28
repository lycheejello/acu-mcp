import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client } from '../client/acumatica.js';

export function registerInvoiceTools(server: McpServer): void {

  server.registerTool('query_invoices', {
    description:
      'List and filter Acumatica sales invoices (AR). Use this for revenue analytics, ' +
      'finding open or overdue invoices, or summarizing invoice activity by customer.',
    inputSchema: {
      filter: z.string().optional().describe(
        "OData $filter expression. Examples: \"Status eq 'Open'\", " +
        "\"Type eq 'Invoice'\", \"Customer eq 'CUST001'\", \"Date gt '2025-01-01'\""
      ),
      orderby: z.string().optional().describe("OData $orderby. Example: \"Date desc\""),
      inventoryID: z.string().optional().describe(
        'Filter to invoices that contain this inventory item in any line, e.g. "WIDGET-001"'
      ),
      top: z.number().optional().describe('Max records to return (default 50, max 500)'),
      skip: z.number().optional().describe('Records to skip for pagination'),
    },
  }, async ({ filter, orderby, inventoryID, top, skip }) => {
    const params: Record<string, string> = {
      $select: 'ReferenceNbr,Type,Status,Date,Customer,Amount,Balance,TaxTotal,DueDate,Description',
    };

    if (filter) params['$filter'] = filter;
    if (orderby) params['$orderby'] = orderby;
    if (skip) params['$skip'] = String(skip);
    params['$top'] = String(Math.min(top ?? 50, 500));
    if (inventoryID) params['$expand'] = 'Details';

    const data = await client.getEntity('Invoice', params);
    let rows = Array.isArray(data) ? data : [];

    if (inventoryID) {
      const id = inventoryID.toUpperCase();
      rows = rows.filter((invoice: Record<string, unknown>) => {
        const details = invoice['Details'];
        if (!Array.isArray(details)) return false;
        return details.some((line: Record<string, unknown>) => {
          const inv = line['InventoryID'];
          const val = typeof inv === 'object' && inv !== null ? (inv as Record<string, unknown>)['value'] : inv;
          return typeof val === 'string' && val.toUpperCase() === id;
        });
      });
      rows = rows.map(({ Details: _details, ...header }: Record<string, unknown>) => header);
    }

    return {
      content: [{
        type: 'text',
        text: `Found ${rows.length} invoice(s).\n\n${JSON.stringify(rows, null, 2)}`,
      }],
    };
  });

  server.registerTool('get_invoice', {
    description:
      'Get a single Acumatica sales invoice with full line item detail.',
    inputSchema: {
      type: z.string().describe("Invoice type, e.g. 'Invoice', 'Credit Memo', 'Debit Memo'"),
      referenceNbr: z.string().describe("Reference number, e.g. 'AR000001'"),
    },
  }, async ({ type, referenceNbr }) => {
    const data = await client.getEntityByKey(
      'Invoice',
      [type, referenceNbr],
      { '$expand': 'Details' }
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  });
}
