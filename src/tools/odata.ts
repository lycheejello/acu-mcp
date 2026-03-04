import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { odataClient } from '../client/odata.js';

export function registerODataTools(server: McpServer): void {

  server.registerTool('list_odata_entities', {
    description:
      'List all available OData entity sets (Generic Inquiries) exposed by Acumatica. ' +
      'Call this first to discover valid entity names before using query_odata.',
    inputSchema: {},
  }, async () => {
    const doc = await odataClient.getServiceDocument();
    const entities = doc.value ?? [];

    return {
      content: [{
        type: 'text',
        text: `Found ${entities.length} OData entity set(s).\n\n${JSON.stringify(entities, null, 2)}`,
      }],
    };
  });

  server.registerTool('query_odata', {
    description:
      'Query any Acumatica Generic Inquiry via OData. Use list_odata_entities first to find valid entity names. ' +
      'Supports OData $filter, $select, $orderby, $top, and $skip.',
    inputSchema: {
      entityName: z.string().describe(
        'Exact entity name from list_odata_entities, e.g. "SO-SalesOrder" or "AR-Customers"'
      ),
      filter: z.string().optional().describe(
        "OData $filter expression, e.g. \"Status eq 'Open'\" or \"OrderDate gt '2025-01-01'\""
      ),
      select: z.string().optional().describe(
        'Comma-separated field names to return, e.g. "OrderNbr,CustomerID,OrderDate"'
      ),
      orderby: z.string().optional().describe(
        'OData $orderby expression, e.g. "OrderDate desc"'
      ),
      top: z.number().optional().describe('Max records to return (default 50, max 500)'),
      skip: z.number().optional().describe('Records to skip for pagination'),
    },
  }, async ({ entityName, filter, select, orderby, top, skip }) => {
    const params: Record<string, string> = {};

    if (filter) params['$filter'] = filter;
    if (select) params['$select'] = select;
    if (orderby) params['$orderby'] = orderby;
    if (skip !== undefined) params['$skip'] = String(skip);
    params['$top'] = String(Math.min(top ?? 50, 500));

    const data = await odataClient.queryEntity(entityName, params);
    const rows = data.value ?? [];

    return {
      content: [{
        type: 'text',
        text: `Found ${rows.length} record(s) from "${entityName}".\n\n${JSON.stringify(rows, null, 2)}`,
      }],
    };
  });

  server.registerTool('list_odata_v4_entities', {
    description:
      'List all available OData v4 DAC entity sets exposed by Acumatica. ' +
      'Unlike list_odata_entities (Generic Inquiries), this exposes raw DAC tables (SOOrder, BAccount, InventoryItem, GLTran, etc.). ' +
      'Use the returned names with query_odata_v4.',
    inputSchema: {},
  }, async () => {
    const doc = await odataClient.getV4ServiceDocument();
    const entities = doc.value ?? [];

    return {
      content: [{
        type: 'text',
        text: `Found ${entities.length} OData v4 DAC entity set(s).\n\n${JSON.stringify(entities, null, 2)}`,
      }],
    };
  });

  server.registerTool('query_odata_v4', {
    description:
      'Query any Acumatica DAC table directly via OData v4. ' +
      'Exposes raw DAC entities (e.g. SOOrder, BAccount, InventoryItem, GLTran, APTran, INTran). ' +
      'Use list_odata_v4_entities to discover valid entity names. ' +
      'Supports OData $filter, $select, $orderby, $top, and $skip.',
    inputSchema: {
      entityName: z.string().describe(
        'DAC entity name, e.g. "SOOrder", "BAccount", "InventoryItem", "GLTran"'
      ),
      filter: z.string().optional().describe(
        "OData $filter expression, e.g. \"Status eq 'N'\" or \"OrderDate gt '2025-01-01'\""
      ),
      select: z.string().optional().describe(
        'Comma-separated DAC field names to return, e.g. "OrderType,OrderNbr,CustomerID,Status"'
      ),
      orderby: z.string().optional().describe(
        'OData $orderby expression, e.g. "OrderDate desc"'
      ),
      top: z.number().optional().describe('Max records to return (default 50, max 500)'),
      skip: z.number().optional().describe('Records to skip for pagination'),
    },
  }, async ({ entityName, filter, select, orderby, top, skip }) => {
    const params: Record<string, string> = {};

    if (filter) params['$filter'] = filter;
    if (select) params['$select'] = select;
    if (orderby) params['$orderby'] = orderby;
    if (skip !== undefined) params['$skip'] = String(skip);
    params['$top'] = String(Math.min(top ?? 50, 500));

    const data = await odataClient.queryV4Entity(entityName, params);
    const rows = data.value ?? [];

    return {
      content: [{
        type: 'text',
        text: `Found ${rows.length} record(s) from DAC "${entityName}".\n\n${JSON.stringify(rows, null, 2)}`,
      }],
    };
  });
}
