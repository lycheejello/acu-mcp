# Acumatica MCP Server — Architecture & Development Plan

> **Purpose**: Read-only MCP server exposing Acumatica data to Claude (and other LLMs) for analytics.
> **Status**: Planning phase — ready to begin Phase 1
> **Last updated**: 2026-02-24

---

## Instance Details

| Setting | Value |
|---------|-------|
| Base URL | `https://live.cloudcybercore.com/TuxtonChinaInc` |
| Company (login) | `TuxtonTest` |
| Build | `25.200.0248` |
| API Endpoint Version | `25.200.001` |
| API Endpoint Name | `Default` |

**Concrete API URLs:**
```
POST https://live.cloudcybercore.com/TuxtonChinaInc/entity/auth/login
GET  https://live.cloudcybercore.com/TuxtonChinaInc/entity/Default/25.200.001/SalesOrder
GET  https://live.cloudcybercore.com/TuxtonChinaInc/entity/Default/25.200.001/GI/{InquiryName}
GET  https://live.cloudcybercore.com/TuxtonChinaInc/entity/Default/25.200.001/StockItem
```

---

## Goals

- Expose Acumatica data as MCP tools so Claude can query and analyze it conversationally
- Start with Sales Orders (via GI) and Inventory; design for easy entity expansion
- Read-only access only (no mutations in scope)
- Simple PoC first, production-ready in later phases

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | TypeScript / Node.js | First-class MCP SDK support, most examples in TS |
| MCP Transport | stdio | Simplest for local Claude Desktop/Code integration |
| Acumatica API | REST Contract-Based API + GI | Entity API for inventory; GI for sales analytics |
| Authentication | Username + Password (cookie session) | Simplest for PoC; OAuth planned for Phase 3 |
| Access Mode | Read-only | Analytics use case; mutations out of scope for now |
| Sales Order Data | Generic Inquiry (GI) | More flexible cross-entity view for analytics |

---

## Architecture Overview

```
Claude (MCP Client)
       │  stdio
       ▼
┌──────────────────────────────────────┐
│           MCP Server                 │
│  (TypeScript / @modelcontextprotocol/sdk) │
│                                      │
│  Tool Registry                       │
│   ├─ sales-orders tools (via GI)     │
│   ├─ inventory tools (via REST API)  │
│   └─ [future entity tools]           │
│                                      │
│  Acumatica Client                    │
│   ├─ Session management (cookie)     │
│   ├─ REST entity GET                 │
│   └─ GI GET                          │
└──────────────┬───────────────────────┘
               │ HTTPS REST
               ▼
  https://live.cloudcybercore.com/TuxtonChinaInc
  /entity/Default/25.200.001/...
```

### MCP Primitives Used

- **Tools** — primary interface; each tool maps to a read query
- **Resources** — (Phase 2) expose entity schemas as reference docs
- **Prompts** — (Phase 2) pre-built analytics prompt templates

---

## Acumatica API Details

### Entity REST API

**Pattern:**
```
GET /entity/Default/25.200.001/{Entity}?$filter=...&$select=...&$top=...
```

**OData query parameters:**
- `$filter` — filter records (e.g., `Status eq 'Open'`)
- `$select` — limit returned fields
- `$expand` — include nested/related objects (e.g., `Details`)
- `$top` / `$skip` — pagination
- `$orderby` — sorting

### Generic Inquiry (GI) API

**Pattern:**
```
GET /entity/Default/25.200.001/GI/{InquiryTitle}?{paramName}={value}&$filter=...
```

GIs support the same OData `$filter`, `$select`, `$top`, `$orderby` params.
GI parameters (defined in Acumatica GI designer) are passed as regular query params.

**Example:**
```
GET /entity/Default/25.200.001/GI/SalesOrderAnalytics?DateFrom=2025-01-01&$top=100
```

### Auth Flow
1. `POST /entity/auth/login` with JSON `{ "name": "...", "password": "...", "company": "TuxtonTest" }`
2. Response sets a `.ASPXAUTH` session cookie — include on all subsequent requests
3. `POST /entity/auth/logout` on server shutdown

---

## Acumatica Setup Required (Before Phase 1)

### 1. Create an API User
- In Acumatica: **System > User Management > Users (SM201010)**
- Create a new user (e.g., `claude-api`)
- Enable **"Web Service Access"** checkbox
- Assign a role with read access to: Sales Orders, Inventory
- Set a strong password

### 2. Create the Sales Order Generic Inquiry
- In Acumatica: **System > Customization > Generic Inquiries (SM208000)**
- Create a new GI (or confirm an existing one) named e.g. `SalesOrderAnalytics`
- Suggested fields to include:
  - Order Type, Order Nbr, Status, Date, Customer ID, Customer Name
  - Order Total, Tax Total, Discount Total
  - Requested On, Cancelled Qty, Open Qty
  - Salesperson
- Suggested filter parameters: Date From/To, Customer ID, Status, Salesperson
- **Important**: Enable **"Web Service"** on the GI (checkbox in GI designer) so it's accessible via REST
- Note the exact GI name — it's used in the API URL

### 3. Verify API Access
Test with curl after setup:
```bash
# Login
curl -X POST https://live.cloudcybercore.com/TuxtonChinaInc/entity/auth/login \
  -H "Content-Type: application/json" \
  -d '{"name":"claude-api","password":"...","company":"TuxtonTest"}' \
  -c cookies.txt

# Test GI
curl https://live.cloudcybercore.com/TuxtonChinaInc/entity/Default/25.200.001/GI/SalesOrderAnalytics?$top=5 \
  -b cookies.txt
```

---

## Project Structure

```
acu-mcp/
├── src/
│   ├── index.ts              # MCP server entry point, tool registration
│   ├── client/
│   │   └── acumatica.ts      # HTTP client: auth, session, GET entity, GET GI
│   ├── tools/
│   │   ├── index.ts          # Aggregates and exports all tools
│   │   ├── sales-orders.ts   # Sales Order tools (GI-based)
│   │   └── inventory.ts      # Inventory tools (REST entity-based)
│   └── types/
│       └── acumatica.ts      # TypeScript types for Acumatica entities
├── .env                      # Local secrets (gitignored)
├── .env.example              # Template (committed)
├── .gitignore
├── package.json
└── tsconfig.json
```

### Adding a New Entity (Pattern)
1. Create `src/tools/{entity}.ts` — define tools for the entity
2. Register tools in `src/tools/index.ts`
3. Add TypeScript types to `src/types/acumatica.ts`
4. No changes to core server or client needed

---

## Tools — Phase 1 (PoC)

### Sales Orders — via Generic Inquiry

| Tool | Description | Key Params |
|------|-------------|------------|
| `query_sales_orders` | Query SO GI with filters — returns list of orders | `dateFrom`, `dateTo`, `customerID`, `status`, `salesperson`, `top` |
| `get_sales_order` | Get a single SO with line details via REST entity API | `orderType`, `orderNbr` |

> `query_sales_orders` uses the GI for flexible analytics queries.
> `get_sales_order` uses the entity API for full line-item detail on a specific order.

### Inventory — via REST Entity API

| Tool | Description | Key Params |
|------|-------------|------------|
| `list_inventory_items` | List stock items with status/class filter | `itemClass`, `itemStatus`, `top` |
| `get_inventory_item` | Get a specific item with warehouse quantities | `inventoryID` |

---

## Development Phases

### Phase 1 — PoC
- [x] Acumatica setup: API user `mcp-user` created with all viewer roles
- [x] Project scaffold: `package.json`, `tsconfig.json`, `.gitignore`, `.env`, `.env.example`
- [x] Acumatica client (`src/client/acumatica.ts`): login, logout, GET entity, GET GI
- [x] Sales Order tools: `query_sales_orders` (entity API), `get_sales_order` (entity + $expand)
- [x] Inventory tools: `list_inventory_items`, `get_inventory_item`
- [x] MCP server wiring (`src/index.ts`) with `McpServer` + stdio transport
- [x] Build clean, MCP tools/list working
- [x] `query_sales_orders` confirmed returning live Acumatica data
- [x] Increase `mcp-user` concurrent API login limit in SM201010
- [x] All 4 tools confirmed with live data
- [ ] Wire into Claude Desktop / Claude Code

### Phase 2 — Expand Entities & Analytics
- [ ] AR Invoices / Payments tools (likely via GI)
- [ ] GL account balance tools
- [ ] Generic GI passthrough tool — query any GI by name + params
- [ ] MCP Resources exposing entity field schemas
- [ ] MCP Prompts for common analytics questions (e.g., "Summarize open SOs by customer")
- [ ] Pagination handling for large result sets (`$skip` loop or cursor)

### Phase 3 — Production Hardiness
- [ ] OAuth 2.0 authentication (replace cookie session)
- [ ] HTTP/SSE transport option (for remote or multi-user access)
- [ ] Rate limiting and retry with backoff
- [ ] Structured logging and observability
- [ ] Configuration file support (not just env vars)

---

## Environment Variables

```env
# Acumatica connection
ACU_BASE_URL=https://live.cloudcybercore.com/TuxtonChinaInc
ACU_USERNAME=claude-api
ACU_PASSWORD=your_password
ACU_COMPANY=TuxtonTest
ACU_ENDPOINT=Default
ACU_VERSION=25.200.001

# GI names (update if your GI has a different name)
ACU_GI_SALES_ORDERS=SO-SalesOrder

# Optional
ACU_TIMEOUT_MS=30000
```

---

## Claude Desktop Integration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "acumatica": {
      "command": "node",
      "args": ["/Users/huyson/Develop/acu-mcp/dist/index.js"],
      "env": {
        "ACU_BASE_URL": "https://live.cloudcybercore.com/TuxtonChinaInc",
        "ACU_USERNAME": "claude-api",
        "ACU_PASSWORD": "...",
        "ACU_COMPANY": "TuxtonTest",
        "ACU_ENDPOINT": "Default",
        "ACU_VERSION": "25.200.001",
        "ACU_GI_SALES_ORDERS": "SalesOrderAnalytics"
      }
    }
  }
}
```

---

## Open Questions

- [ ] Multi-company or multi-branch filtering needed for analytics?
- [ ] Any other GIs or entities to expose?
- [ ] Verified SalesOrder entity field list (from live response): OrderType, OrderNbr, Status, Date, CustomerID, Description, OrderTotal, TaxTotal, ControlTotal, RequestedOn, LastModified, CustomerOrder, ExternalRef, LocationID, WillCall, Hold, CurrencyID — add $select once fields confirmed useful

## Resolved

- [x] GI via `/GI/{name}` URL doesn't work — GIs must be published to an endpoint first (Phase 2)
- [x] `query_sales_orders` uses SalesOrder entity API instead (works immediately, same OData filtering)
- [x] API user created with all viewer roles assigned
- [x] MCP SDK 1.27.1 installed — uses `McpServer.registerTool()` + zod (not legacy `Server` + `setRequestHandler`)
- [x] Concurrent login limit hit in tests — increase max API logins for `mcp-user` in SM201010
