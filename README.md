# acu-mcp

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects Claude to Acumatica ERP for read-only analytics queries.

## Tools

| Tool | Description |
|------|-------------|
| `query_sales_orders` | List and filter sales orders with OData expressions |
| `get_sales_order` | Get a single order with full line item detail |
| `list_inventory_items` | List stock items filtered by class, status, etc. |
| `get_inventory_item` | Get a specific item with warehouse stock quantities |

## Prerequisites

- [Node.js](https://nodejs.org) 18.3 or later
- An Acumatica instance with a service account that has read access

## Setup

```bash
git clone git@github.com:lycheejello/acu-mcp.git
cd acu-mcp
npm install
cp .env.example .env
```

Edit `.env` with your Acumatica credentials:

```env
ACU_BASE_URL=https://yourinstance.acumatica.com/YourCompany
ACU_USERNAME=your_api_user
ACU_PASSWORD=your_password
ACU_COMPANY=YourCompanyLoginName
ACU_ENDPOINT=Default
ACU_VERSION=25.200.001
```

Then build:

```bash
npm run build
```

## Claude Desktop Integration

### macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "acumatica": {
      "command": "node",
      "args": ["/absolute/path/to/acu-mcp/dist/index.js"],
      "env": {
        "ACU_BASE_URL": "https://yourinstance.acumatica.com/YourCompany",
        "ACU_USERNAME": "your_api_user",
        "ACU_PASSWORD": "your_password",
        "ACU_COMPANY": "YourCompanyLoginName",
        "ACU_ENDPOINT": "Default",
        "ACU_VERSION": "25.200.001"
      }
    }
  }
}
```

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "acumatica": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\acu-mcp\\dist\\index.js"],
      "env": {
        "ACU_BASE_URL": "https://yourinstance.acumatica.com/YourCompany",
        "ACU_USERNAME": "your_api_user",
        "ACU_PASSWORD": "your_password",
        "ACU_COMPANY": "YourCompanyLoginName",
        "ACU_ENDPOINT": "Default",
        "ACU_VERSION": "25.200.001"
      }
    }
  }
}
```

Restart Claude Desktop after saving the config.

## Development

```bash
npm run dev    # run with tsx (no build step needed)
npm run build  # compile TypeScript to dist/
npm start      # run compiled output
```

### Adding a New Entity

1. Create `src/tools/{entity}.ts` and export a `register{Entity}Tools(server: McpServer)` function
2. Call it from `src/tools/index.ts`
3. No other changes needed

## Acumatica Service Account Setup

1. In **SM201010** (Users), create a new user
2. Assign read-only viewer roles for the modules you need
3. Set **Max Number of API Logins** to at least `5`

## Roadmap

See [PLAN.md](./PLAN.md) for the full architecture and phased development plan.

**Phase 1 (complete):** Core server, Sales Orders, Inventory
**Phase 2:** AR/GL tools, Generic Inquiry support, MCP Resources
**Phase 3:** OAuth, HTTP transport, production hardening
