import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { client } from '../client/acumatica.js';

export function registerInventoryTools(server: McpServer): void {

  server.registerTool('list_inventory_items', {
    description:
      'List Acumatica stock/inventory items. Supports OData filtering. ' +
      'Use this to explore inventory, find items by class or status, or get item lists.',
    inputSchema: {
      filter: z.string().optional().describe(
        "OData $filter expression. Examples: \"ItemStatus eq 'Active'\", " +
        "\"ItemClass eq 'FINISHED'\""
      ),
      top: z.number().optional().describe('Max records to return (default 50, max 500)'),
      skip: z.number().optional().describe('Records to skip for pagination'),
    },
  }, async ({ filter, top, skip }) => {
    const params: Record<string, string> = {
      $select: 'InventoryID,Description,ItemStatus,ItemClass,ItemType,DefaultPrice,LastCost,BaseUOM,SalesUOM,DefaultWarehouseID',
    };

    if (filter) params['$filter'] = filter;
    if (skip) params['$skip'] = String(skip);
    params['$top'] = String(Math.min(top ?? 50, 500));

    const data = await client.getEntity('StockItem', params);
    const items = Array.isArray(data) ? data : [];

    return {
      content: [{
        type: 'text',
        text: `Found ${items.length} inventory item(s).\n\n${JSON.stringify(items, null, 2)}`,
      }],
    };
  });

  server.registerTool('get_inventory_item', {
    description:
      'Get a specific Acumatica inventory item with warehouse stock quantities.',
    inputSchema: {
      inventoryID: z.string().describe('Inventory item ID / item code'),
    },
  }, async ({ inventoryID }) => {
    const data = await client.getEntityByKey(
      'StockItem',
      [inventoryID],
      { '$expand': 'WarehouseDetails' }
    );

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  });
}
