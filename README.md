# acu-mcp

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects Claude to Acumatica ERP for read-only analytics queries.

## Tools

| Tool | Description |
|------|-------------|
| `query_sales_orders` | List and filter sales orders with OData expressions |
| `get_sales_order` | Get a single order with full line item detail |
| `list_inventory_items` | List stock items filtered by class, status, etc. |
| `get_inventory_item` | Get a specific item with warehouse stock quantities |
| `query_shipments` | List and filter shipments |
| `get_shipment` | Get a single shipment with line detail |
| `query_invoices` | List and filter AR invoices |
| `get_invoice` | Get a single invoice with line detail |
| `query_purchase_orders` | List and filter purchase orders |
| `get_purchase_order` | Get a single purchase order with line detail |
| `query_customers` | List and filter customers |
| `get_customer` | Get a single customer with contacts and addresses |

## Prerequisites

- [Node.js](https://nodejs.org) 18.3 or later
- An Acumatica instance with a dedicated service account (see [Acumatica Setup](#acumatica-setup) below)

## Installation

```bash
git clone git@github.com:lycheejello/acu-mcp.git
cd acu-mcp
npm install
npm run build
```

## Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

```env
ACU_BASE_URL=https://yourinstance.acumatica.com/YourCompany
ACU_USERNAME=mcp-user
ACU_PASSWORD=your_password
ACU_COMPANY=YourCompanyLoginName
ACU_ENDPOINT=Default
ACU_VERSION=25.200.001
```

> **Warning:** Use a dedicated service account (e.g. `mcp-user`). Do NOT use your personal Acumatica login.

## Claude Integration

### Claude Code (CLI)

Run once to register the server globally:

```bash
claude mcp add --scope user acumatica \
  -e ACU_BASE_URL=https://yourinstance.acumatica.com/YourCompany \
  -e ACU_USERNAME=mcp-user \
  -e ACU_PASSWORD=your_password \
  -e ACU_COMPANY=YourCompanyLoginName \
  -e ACU_ENDPOINT=Default \
  -e ACU_VERSION=25.200.001 \
  -- node /absolute/path/to/acu-mcp/dist/index.js
```

Restart Claude Code after running this command.

### Claude Desktop — macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "acumatica": {
      "command": "node",
      "args": ["/absolute/path/to/acu-mcp/dist/index.js"],
      "env": {
        "ACU_BASE_URL": "https://yourinstance.acumatica.com/YourCompany",
        "ACU_USERNAME": "mcp-user",
        "ACU_PASSWORD": "your_password",
        "ACU_COMPANY": "YourCompanyLoginName",
        "ACU_ENDPOINT": "Default",
        "ACU_VERSION": "25.200.001"
      }
    }
  }
}
```

### Claude Desktop — Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json` with the same structure, using a Windows path:

```json
"args": ["C:\\absolute\\path\\to\\acu-mcp\\dist\\index.js"]
```

Restart Claude Desktop after saving.

### Verify

After restarting, ask Claude:

> *"Show me the last 5 open sales orders"*

Claude should call `query_sales_orders` and return live data.

## Acumatica Setup

In **SM201010** (Users), create a dedicated service account:

1. Set **Login Name** (e.g. `mcp-user`) and a strong password
2. Enable the **Web Service Access** checkbox
3. On the **Roles** tab, assign read-only viewer roles for each module (Sales Orders, Inventory, AR, AP, etc.)
4. Set **Max Number of API Logins** to at least `5` to allow concurrent sessions during development

## Development

```bash
npm run dev    # run with tsx (no build step)
npm run build  # compile TypeScript → dist/
npm start      # run compiled output
```

### Adding a New Entity

1. Create `src/tools/{entity}.ts` and export a `register{Entity}Tools(server: McpServer)` function
2. Call it from `src/tools/index.ts`
3. No other changes needed

## Roadmap

See [PLAN.md](./PLAN.md) for the full architecture and phased development plan.

**Phase 1 (complete):** Core server with 12 tools across Sales Orders, Inventory, Shipments, Invoices, Purchase Orders, and Customers.
**Phase 2 (in progress):** Generic Inquiry passthrough, GL balance tools, MCP Resources and Prompts.
**Phase 3:** OAuth 2.0, HTTP/SSE transport, production hardening.
