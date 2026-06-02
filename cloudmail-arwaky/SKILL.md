---
name: cloud-mail-flare
description: Email management platform — create users, manage inbox, configure worker, API keys
version: 0.1.0
---

# CloudMailFlare

Email management platform built on Cloudflare Workers. Manages virtual email users, inbox, worker settings, and API keys.

## MCP Tools (5 Hydra)

| Tool | Purpose |
|------|---------|
| `cmf_execute` | Run any CLI command |
| `cmf_list_commands` | List available commands |
| `cmf_skill` | Read this documentation |
| `cmf_status` | Health check |
| `cmf_cancel` | Cancel running operation |

## CLI Commands

### Authentication
```bash
cmf --json auth login <email> <password>
cmf --json auth logout
cmf --json auth access-code <code>
cmf --json auth health
```

### User Management
```bash
cmf --json user list
cmf --json user create <username>
cmf --json user get <userId>
cmf --json user update <userId> --email <email> --name <name> --password <password>
cmf --json user delete <userId>
```

### Inbox
```bash
cmf --json inbox list [--user <userId>]
cmf --json inbox get <emailId> [--user <userId>]
cmf --json inbox wait [--from <sender>] [--subject <text>] [--timeout <sec>] [--interval <sec>] [--user <userId>]
cmf --json inbox action <emailId> <action> [--user <userId>]
# actions: star, archive, mark_read, delete
```

### Worker Settings
```bash
cmf --json settings get
cmf --json settings set <key> <value>
cmf --json settings connect-webhook [--webhook-url <url>]
```

### API Keys
```bash
cmf --json apikey list
cmf --json apikey create <name>
cmf --json apikey revoke <keyId>
```

### System
```bash
cmf --json system dashboard
cmf --json system cleanup [--max-age <hours>]
```

## Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output raw JSON (required for MCP) |
| `--quiet` | Suppress info messages |
| `--url <url>` | API base URL (default: env CLOUD_MAIL_FLARE_URL or http://localhost:8787) |

## MCP Usage Examples

### Via cmf_execute
```
cmf_execute(command="auth login", email="admin@mailflare.local", password="secret")
cmf_execute(command="user list")
cmf_execute(command="user create", username="newuser")
cmf_execute(command="inbox list")
cmf_execute(command="inbox action", emailId="abc123", action="star")
cmf_execute(command="settings get")
cmf_execute(command="settings set", key="forward_inbound", value="true")
cmf_execute(command="apikey create", name="my-key")
cmf_execute(command="system dashboard")
cmf_execute(command="system cleanup", maxAge="48")
```

### Via cmf_list_commands
```
cmf_list_commands()              # all commands
cmf_list_commands(domain="user") # user commands only
```

## Common Workflows

### 1. Create user and check inbox
```
cmf_execute(command="user create", username="alice")
# Note the userId from output
cmf_execute(command="inbox list", user="<userId>")
```


### 3. Monitor system health
```
cmf_execute(command="auth health")
cmf_execute(command="system dashboard")
cmf_execute(command="system cleanup", maxAge="24")
```

## Architecture

```
MCP (5 Hydra tools)  →  CLI (cmf)  →  Agent Orchestrator  →  Capabilities  →  Database
```

- **MCP**: Thin CLI wrapper for LLM agents. No business logic.
- **CLI**: Source of truth for command interface. Uses Commander.js.
- **Agent**: Orchestrates capabilities. Delegates to routers.
- **Capabilities**: Business logic. Implements protocols.
- **Contract**: IO types. Input/output definitions.
- **Taxonomy**: Branded types. Domain value objects.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@modelcontextprotocol/sdk` | MCP server |
| `commander` | CLI framework |
| `tsx` | TypeScript execution |

## Limitations

- `inbox wait` is long-polling — may timeout in MCP context
- `auth login` stores token in local state — not persistent across MCP sessions
- CLI requires local agent access (not remote API by default)
