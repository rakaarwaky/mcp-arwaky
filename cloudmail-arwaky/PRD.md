# Cloud Mail Flare AES — Product Requirements Document

## Vision
Email-as-a-Service running 100% on Cloudflare free tier, built for AI agents.
Agent creates unlimited email inboxes → receives verification emails → extracts
API keys automatically. Zero human intervention. Zero cost.

## Problem Statement
AI agents need many email addresses to sign up for services (OpenRouter, etc.).
Manual email creation doesn't scale. Cloud Mail Flare provides an API-first
approach: agent creates inbox → receives verification → extracts API key → repeat.

## Target Users
1. **Primary:** AI Agent (autonomous) — create inboxes, read emails, trigger
   browser automation via MCP/CLI
2. **Secondary:** Human Admin — configure domain, monitor dashboard,
   troubleshoot via CLI/TUI

## Core Features

### Phase 1 — Email Lifecycle (MVP)
- Create inbox (API: POST /api/inboxes)
- List inbox (API: GET /api/inboxes)
- Read email (API: GET /api/me/emails/:emailId)
- Delete inbox (API: DELETE /api/inboxes/:id)
- Poll email by subject/from (API: GET /api/me/inbox/wait?from=...&subject=...&timeout=30)
- Email Routing catch-all → Cloudflare Worker

### Phase 2 — OpenRouter Automation (Local Node.js)
- Chrome CDP browser automation for OpenRouter signup
- OTP auto-extraction from CMF inbox (poll + regex)
- API key extraction from settings page
- Trigger via CLI: `cmf browser openrouter-signup <email> <password>`
- Trigger via MCP: `cmf_browser_openrouter_signup`
- **Limitation:** Chrome CDP requires local Node.js — unavailable in Cloudflare Worker

### Phase 3 — Multi-Agent Support
- API key authentication (agent-to-agent)
- Rate limiting per API key
- Quota management (max inboxes per key)
- Audit trail (who created what, when)

### Phase 4 — Monitoring & Cleanup
- Dashboard: inbox count, email count, API usage
- Cleanup: auto-delete old inboxes (>24h)
- System health check

## Surfaces (Entry Points)

| Surface | Runtime | Use Case |
|---------|---------|----------|
| API | Cloudflare Worker | REST endpoints for all operations |
| MCP | Local Node.js | AI agent integration (Hermes, Claude Code, etc.) |
| CLI | Local Node.js | Human operator, scripting, automation |
| TUI | Local Node.js | Interactive human operator |
| Web | Cloudflare Worker | Secondary web UI (read-only + config) |

## Non-Goals (Out of Scope)
- Sending email (receive-only)
- Full email client UI (API-first, UI secondary)
- Custom domain per user (single domain for all inboxes)
- Webhook push notification (removed — agent polls via API/MCP)
- Telegram bot integration (removed — use MCP/CLI instead)

## Tech Stack
- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite serverless)
- **Email Routing:** Cloudflare Email Routing (catch-all → Worker)
- **Web Framework:** React + Vite (SPA)
- **CLI:** Commander.js
- **TUI:** @clack/prompts
- **MCP:** @modelcontextprotocol/sdk
- **Browser:** Chrome DevTools Protocol (local only)
- **Parser:** postal-mime (MIME parsing)

## Success Metrics
- Agent can create inbox < 2 seconds
- Incoming email detected < 10 seconds
- OpenRouter signup completed < 60 seconds end-to-end
- Zero-cost operation (Cloudflare free tier)
- 100+ concurrent inboxes without degradation
