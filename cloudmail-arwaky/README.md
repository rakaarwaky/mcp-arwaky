# CloudMailFlare AES

Email management platform built on Cloudflare Workers. Create virtual email users, manage inbox, configure worker settings, and expose capabilities via API, CLI, MCP, and Web.

## Architecture                             

```
┌─────────────────────────────────────────────────────┐
│  SURFACES (4 I/O adapters)                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │
│  │ API  │ │ CLI  │ │ MCP  │ │ Web  │                │
│  │(HTTP)│ │(cmd) │ │(5 Hyd)│ │(React)│              │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘                │   
│     └────────┴────────┴──────────┴                  │
│                      │                              │
│              ┌───────▼────────┐                     │
│              │    AGENT       │ ← orchestration     │
│              │                │                     │
│              └───────┬────────┘                     │
│                      │                              │
│     ┌────────────────┼────────────────┐             │
│     │                │                │             │
│  ┌──▼──────┐   ┌─────▼─────┐   ┌─────▼─────┐        │
│  │CAPABILIT│   │ CONTRACT  │   │ TAXONOMY  │        │
│  │(logic)  │   │(IO types) │   │(branded)  │        │
│  └─────────┘   └───────────┘   └───────────┘        │
└─────────────────────────────────────────────────────┘
```

**AES Rule:** Surfaces are dumb I/O organs. All logic stays in Agent. Types come from Taxonomy + Contract.

## Prerequisites

- Node.js v20+
- pnpm (or npm)
- Cloudflare account (for deployment)
- Wrangler CLI (`pnpm add -g wrangler`)

## Installation

```bash
# Clone
git clone <repo-url>
cd cloud-mail-flare-aes

# Install dependencies
pnpm install

# Type check
npx tsc --noEmit
```

## Configuration

### Environment Variables

```bash
# API base URL (default: http://localhost:8787)
CLOUD_MAIL_FLARE_URL=https://your-app.workers.dev

# Auth token (for CLI/MCP remote access)
CLOUD_MAIL_FLARE_TOKEN=your-token
```

### Wrangler (Cloudflare Workers)

```bash
# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create cmf-db

# Update wrangler.toml with your database_id

# Run migrations
npx wrangler d1 execute cmf-db --file=./migrations/001_init.sql

# Set secrets
npx wrangler secret put CMF_ADMIN_PASSWORD
npx wrangler secret put CMF_ENCRYPTION_KEY
```

## Usage

### 1. Local Development

```bash
# Start dev server (Vite + Wrangler)
pnpm run cf:dev

# In another terminal, use CLI
pnpm run cmf -- auth health
pnpm run cmf -- user create testuser
pnpm run cmf -- inbox list
```

### 2. CLI

```bash
# Build and use cmf command
pnpm run cmf -- auth login admin@mailflare.local password
pnpm run cmf -- user list
pnpm run cmf -- user create newuser
pnpm run cmf -- inbox list
pnpm run cmf -- settings get
pnpm run cmf -- apikey list
pnpm run cmf -- system dashboard
pnpm run cmf -- system cleanup --max-age 24

# JSON output (for scripting)
pnpm run cmf -- --json user list
```

### 3. MCP Server (for AI Agents)

The MCP server uses the Hydra pattern — 5 meta-tools wrapping CLI commands.

```bash
# Start MCP server (stdio)
pnpm run mcp

# Or with watch mode
pnpm run mcp:dev
```

**Configure in Hermes:**

```yaml
# config.yaml
mcp_servers:
  cloud-mail-flare:
    command: npx
    args: ["tsx", "src/surfaces/mcp/mcp_tools_entry.ts"]
    cwd: /path/to/cloud-mail-flare-aes
```

**5 MCP Tools:**

| Tool                  | Purpose                     |
| --------------------- | --------------------------- |
| `cmf_execute`       | Run any CLI command         |
| `cmf_list_commands` | List available commands     |
| `cmf_skill`         | Read SKILL.md documentation |
| `cmf_status`        | Health check                |
| `cmf_cancel`        | Cancel running operation    |

### 4. Web UI

```bash
# Development
pnpm run dev

# Build
pnpm run build

# Deploy
pnpm run deploy
```

**Pages:**

- `/login` — Password or access-code login
- `/inbox` — Email list with filters (all/unread/starred)
- `/inbox/:id` — Email detail view
- `/dashboard` — Metrics and analytics
- `/users` — User list + create
- `/users/:id` — User edit + delete
- `/settings` — Worker settings + API keys + cleanup

### 6. API

```
POST /api/auth/login          — Login (email + password)
POST /api/auth/logout         — Logout
POST /api/auth/access-code    — Login with access code
GET  /api/health              — Health check

GET  /api/users               — List users
POST /api/users               — Create user
GET  /api/users/:id           — Get user
PUT  /api/users/:id           — Update user
DELETE /api/users/:id         — Soft-delete user

GET  /api/me/inbox            — List inbox
GET  /api/me/emails/:id       — Get email
POST /api/me/emails/:id/action — Email action (star/archive/delete)

GET  /api/dashboard           — Dashboard metrics

GET  /api/worker-settings     — Get settings
PUT  /api/worker-settings     — Update settings

GET  /api/apikeys             — List API keys
POST /api/apikeys             — Create API key
DELETE /api/apikeys/:id       — Revoke API key

POST /api/cleanup             — Run cleanup
```

## Deployment

```bash
# Build and deploy to Cloudflare Workers
pnpm run deploy
```

## Project Structure

cloud-mail-flare-aes/
├── SKILL.md                    # MCP documentation
├── README.md                   # This file
├── package.json                # Scripts + dependencies
├── tsconfig.json               # TypeScript config
├── wrangler.toml               # Cloudflare Workers config
├── src/
   ├── taxonomy/               # Branded types (value objects)
   ├── contract/               # IO types (input/output)
   ├── capabilities/           # Business logic
   ├── agent/                  # Orchestration (7 routers)
   ├── infrastructure/         # External adapters (DB, crypto, HTTP)
   └── surfaces/               # I/O adapters
      ├── api/                # HTTP routes (16 files)
      ├── cli/                # Commander.js CLI (8 files)
      ├── mcp/                # Hydra MCP server (2 files)
      ├── web/                # React UI (16 files)
      └── tui/                # Terminal UI (experimental)

## Development

```bash
# Type check
npx tsc --noEmit

# Lint (AES compliance)
pnpm run lint:aes

# Test
pnpm run test

# Test with coverage
pnpm run test -- --coverage
```

## License

Private — internal use only.
