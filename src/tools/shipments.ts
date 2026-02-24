import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client } from '../client/acumatica.js';

export function registerShipmentTools(server: McpServer): void {

  server.registerTool('query_shipments', {
    description:
      'List and filter Acumatica shipments. Use this for shipment analytics, ' +
      'tracking open or completed shipments, or finding shipments by customer or warehouse.',
    inputSchema: {
      filter: z.string().optional().describe(
        "OData $filter expression. Examples: \"Status eq 'Open'\", " +
        "\"CustomerID eq 'CUST001'\", \"ShipmentDate gt '2025-01-01'\""
      ),
      orderby: z.string().optional().describe("OData $orderby. Example: \"ShipmentDate desc\""),
      top: z.number().optional().describe('Max records to return (default 50, max 500)'),
      skip: z.number().optional().describe('Records to skip for pagination'),
    },
  }, async ({ filter, orderby, top, skip }) => {
    const params: Record<string, string> = {
      $select: 'ShipmentNbr,Type,Status,ShipmentDate,CustomerID,WarehouseID,Operation,ShippedQty,FreightPrice,ShipVia,Description',
    };

    if (filter) params['$filter'] = filter;
    if (orderby) params['$orderby'] = orderby;
    if (skip) params['$skip'] = String(skip);
    params['$top'] = String(Math.min(top ?? 50, 500));

    const data = await client.getEntity('Shipment', params);
    const rows = Array.isArray(data) ? data : [];

    return {
      content: [{
        type: 'text',
        text: `Found ${rows.length} shipment(s).\n\n${JSON.stringify(rows, null, 2)}`,
      }],
    };
  });

  server.registerTool('get_shipment', {
    description:
      'Get a single Acumatica shipment with full line item detail.',
    inputSchema: {
      shipmentNbr: z.string().describe("Shipment number, e.g. '000001'"),
    },
  }, async ({ shipmentNbr }) => {
    const data = await client.getEntityByKey(
      'Shipment',
      [shipmentNbr],
      { '$expand': 'Details' }
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  });
}
