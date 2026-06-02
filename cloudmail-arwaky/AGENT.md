# AGENT.md — Cloud Mail Flare AES

## Source of Truth
PRD.md — primary reference for features, scope, and priorities.

## Architecture: 6-Domain AES
```
src/
├── agent/          — Brain stem (lifecycle, orchestration, DI wiring)
├── capabilities/   — Business logic (implements _protocol)
├── contract/       — Interface definitions (3 equal types)
├── infrastructure/ — External integrations (implements _port)
├── surfaces/       — Entry points (uses _io for input/output)
└── taxonomy/       — Domain vocabulary (VOs, entities, errors, events)
```

## Global Rules
```
1. Foundation-first build order:
   taxonomy → contract → infrastructure → capabilities → agent → surfaces

2. No lib/ folder — all domains directly under src/

3. Each domain self-contained with clear import boundaries

4. PRD.md is source of truth — always check before building new features

5. All files STRICT 3-word naming:
   {domain}_{unique}_{horizontal}.ts — exactly 2 underscores, 3 parts
   Domain is taken from the immediate parent folder name (agent | capabilities | contract | infrastructure | surfaces | taxonomy).
   The horizontal suffix is FIXED only for:
     • taxonomy/: _vo, _entity, _error, _event, _models, _resolver
     • contract/:  _io, _protocol, _port
   For agent/, capabilities/, infrastructure/, surfaces/ — horizontal suffix is flexible but must be meaningful and consistent (examples: _handler, _adapter, _router, _entry, _manager, _util).

6. No domain-name prefix: file names must NOT start with the domain (folder) name
   (e.g., inside agent/ avoid 'agent_', inside infrastructure/ avoid 'infrastructure_').

7. No abbreviations in domain words (except industry-standard: db, api, tg, io, vo)
```

---

## Domain 1: TAXONOMY — Domain Vocabulary

```
taxonomy/
  _vo.ts      — Value Objects (branded types, validators)
  _entity.ts  — Entities (data structures with identity)
  _error.ts   — Domain errors (typed exceptions)
  _event.ts   — Domain events (state changes)
```

### Rules
```
1. FIXED 4 suffixes only: _vo, _entity, _error, _event

2. VOs use branded types (Opaque pattern):
   export type EmailAddress = string & { readonly __brand: 'EmailAddress' };
   export function createEmailAddress(s: string): EmailAddress { ... }

3. Entity = data with identity (id field is branded):
   export interface Email { id: EmailId; sender: EmailAddress; ... }

4. Error = extends DomainBaseError:
   export class AuthUnauthorizedError extends DomainBaseError { ... }

5. Event = state change records:
   export interface EmailReceivedEvent { emailId: EmailId; ... }

6. Taxonomy MUST NOT import from any other domain.
   Taxonomy is a leaf node — zero external dependencies.

7. Barrel: taxonomy/index.ts exports everything, grouped by category.
```

### Example
```
taxonomy/email_address_vo.ts        EmailAddress (branded), createEmailAddress (factory)
taxonomy/email_mail_entity.ts       Email entity
taxonomy/auth_unauthorized_error.ts AuthUnauthorizedError
taxonomy/email_domain_event.ts      EmailReceivedEvent
```

---

## Domain 2: CONTRACT — Interface Definitions

```
contract/
  _protocol.ts  — Defines WHAT capabilities can do
  _port.ts      — Defines HOW infrastructure connects
  _io.ts        — Defines WHAT surfaces send/receive
  index.ts      — Barrel export
```

### 3 Types — Equal Siblings, Different Consumers

```
_protocol.ts  → consumed by capabilities/    (capabilities implement protocols)
_port.ts      → consumed by infrastructure/  (infrastructure implements ports)
_io.ts        → consumed by surfaces/        (surfaces use io for input/output)

All 3 are at the SAME level. None is above or below another.
```

### _protocol — Capability Interface
```
1. Pure interface — method signatures only, no implementation
2. Imports ONLY from taxonomy
3. Defines business operations capabilities can perform

export interface IEmailFetchProtocol {
  getEmail(userId: UserId, emailId: EmailId): Promise<Email | null>;
  waitForEmail(userId: UserId, options?: { from?: SearchFrom; subject?: Subject; timeout?: TimeoutSeconds; pollInterval?: PollIntervalSeconds }): Promise<Email | null>;
}
```

### _port — Infrastructure Interface
```
1. Pure interface — method signatures only, no implementation
2. Imports ONLY from taxonomy
3. Defines how external systems connect

export interface IHttpClientPort {
  get(url: Url, headers?: Record<string, string>): Promise<unknown>;
  post(url: Url, body: unknown, headers?: Record<string, string>): Promise<unknown>;
}
```

### _io — Surface Input/Output
```
1. Contains Input and Output traits in ONE file
2. Imports from taxonomy (and protocol for re-export convenience)
3. Defines what surfaces send IN and what surfaces receive OUT

export interface EmailGetInput { emailId: EmailId; userId?: UserId; }
export interface EmailGetOutput { email: Email | null; }
export interface EmailWaitInput { userId: UserId; from?: SearchFrom; ... }
export interface EmailWaitOutput { email: Email | null; timedOut: TimedOut; }
```

### Import Rules
```
taxonomy  ←  protocol     (protocol imports taxonomy only)
taxonomy  ←  port         (port imports taxonomy only)
taxonomy  ←  io           (io imports taxonomy)
protocol  ←  io           (io may re-export protocol types)

NEVER:
  protocol → port         (protocol never imports from port)
  protocol → io           (protocol never imports from io)
  protocol → protocol     (no cross-protocol imports)
  port → protocol         (port never imports from protocol)
  port → io               (port never imports from io)
  port → port             (no cross-port imports)
  io → port               (io never imports from port)
```

### Example
```
contract/email_fetch_protocol.ts
  import type { Email, EmailId, UserId } from '../taxonomy';
  export interface IEmailFetchProtocol { getEmail(...): Promise<Email | null>; }

contract/email_ops_io.ts
  import type { UserId, EmailId, Email } from '../taxonomy';
  export interface EmailGetInput { emailId: EmailId; userId?: UserId; }
  export interface EmailGetOutput { email: Email | null; }
```

---

## Domain 3: INFRASTRUCTURE — External Adapters

```
infrastructure/
  _adapter.ts   — Implements _port interfaces
```

### Rules
```
1. Implements contract/_port interfaces:
   class D1DatabaseAdapter implements IDatabaseQueryPort { ... }

2. Imports from taxonomy + contract (_port only).
   MUST NOT import from capabilities, agent, or surfaces.

3. One adapter per external system:
   - D1DatabaseAdapter      (Cloudflare D1)
   - CryptoPasswordAdapter  (password hashing)
   - SessionAuthAdapter     (JWT/session management)
   - AccessCodeAdapter      (access code generation)
   - HttpClientAdapter      (HTTP requests)

4. NO business logic — adapter only translates port → external API call.

5. Error handling: throw taxonomy errors, not infrastructure errors.
   throw new AuthUnauthorizedError('Invalid token');
   NOT: throw new Error('fetch failed');
```

### Example
```
infrastructure/d1_database_adapter.ts
  implements IDatabaseQueryPort
  → wraps Cloudflare D1 SQL calls
  → returns taxonomy entities

infrastructure/http_client_adapter.ts
  implements IHttpClientPort
  → wraps fetch() for API communication
  → returns branded types
```

---

## Domain 4: CAPABILITIES — Business Logic

```
capabilities/
  _actions.ts   — Implements _protocol interfaces
```

### Rules
```
1. Implements contract/_protocol interfaces:
   class EmailFetchActions implements IEmailFetchProtocol { ... }

2. Imports from taxonomy + contract (_protocol only).
   MUST NOT import from agent, surfaces, or infrastructure.

3. ALL business logic lives here:
   - Email parsing, filtering, processing
   - Account creation workflows
   - Quota checking, rate limiting
   - Notification orchestration

4. NO I/O — capabilities don't know about D1, HTTP, or Chrome CDP.
   They call ports via DI, never directly.

5. Error handling: throw taxonomy errors.
   if (!email) throw new NotFoundError('Email not found');

6. Naming: {domain}_actions.ts
```

### Example
```
capabilities/email_fetch_actions.ts
  implements IEmailFetchProtocol
  → getEmail(): fetches from DB via port, parses MIME
  → waitForEmail(): polls DB, returns when email arrives

capabilities/account_service_actions.ts
  implements IAccountServiceProtocol
  → createAccount(): creates inbox + registers with OpenRouter
  → updateVerification(): extracts link, follows it
```

---

## Domain 5: AGENT — Brain Stem

```
agent/
  _router.ts              — Domain routers (delegate to capabilities)
  request_flow_facade.ts  — Orchestrator (thin facade over routers)
  di_container_registry.ts — DI wiring
  lifecycle_state_manager.ts — State management
```

### Rules
```
1. Orchestrator = THIN FACADE, zero logic:
   login(email, password, meta) { return this.auth.login(email, password, meta); }
   Each method is a 1-line passthrough to a domain router.

2. Router = domain boundary:
   - AuthFlowRouter              → auth capabilities
   - InboxQueryRouter            → inbox capabilities
   - NotificationDispatchRouter  → notification orchestration
   - ApiQuotaRouter              → api key + rate limit + quota
   - AccountManageRouter         → account automation
   - WorkerSetupRouter           → settings + cleanup + dashboard

3. DI Container wires everything:
   - Creates capability instances
   - Injects port implementations
   - Single source of truth for dependencies

4. Agent imports from taxonomy + contract + capabilities.
   MUST NOT import from surfaces or infrastructure directly.

5. Agent KNOWS all domains — it's the god folder.
   But does NO work — routing only.

6. Notification orchestration lives IN AGENT, not in surface:
   handleEmailNotification(data) →
     1. ingest email (capability)
     2. extract verification link/code (capability)
     3. update account status (capability)
   All in one orchestrator method, not split across surface handlers.
```

### Example
```
agent/request_flow_facade.ts
  class AgentOrchestrator {
    readonly auth: AuthFlowRouter;
    readonly inbox: InboxQueryRouter;
    login(...) { return this.auth.login(...); }
    getUserInbox(...) { return this.inbox.getUserInbox(...); }
  }
```

---

## Domain 6: SURFACES — Entry Points

```
surfaces/
  api/       — HTTP REST endpoints (SvelteKit)
  web/       — Svelte UI pages
  cli/       — Commander.js CLI
  mcp/       — MCP server tools
```

### Rules
```
1. Surface = dumb sensory organ.
   NO business logic. NO I/O logic (except protocol handling).

2. Imports from agent + contract (_io) + taxonomy ONLY.
   MUST NOT import from capabilities or infrastructure.

3. Pattern (same for ALL surfaces):
   a. Receive raw input (Zod, CLI args, HTTP body)
   b. Build contract/_io Input object with branded VOs
   c. Call agent method
   d. Wrap result into contract/_io Output type
   e. Format output (JSON, text, HTTP response)

4. MCP surface:
   - 7 tools: cmf_auth, cmf_user, cmf_inbox, cmf_settings, cmf_system, cmf_status, cmf_help
   - Each tool = one domain
   - Zod schemas mirror _io Input fields
   - Output = _io Output as JSON

5. CLI surface:
   - Commander.js with subcommands
   - positional args = required fields
   - options = optional fields
   - output: printJson(response) or printTable()

6. API surface (SvelteKit):
   - REST endpoints in api/ routes
   - Request body → _io Input
   - Response body → _io Output
```

### Example
```
surfaces/mcp/mcp_tool_auth.ts
  registerAuthTool(server) {
    server.registerTool('cmf_auth', { ... }, async (args) => {
      const input: AuthLoginInput = {
        email: createEmailAddress(args.email),
        password: asPassword(args.password),
        userAgent: 'mcp-client' as any,
        clientIp: '127.0.0.1' as any,
      };
      const output: AuthLoginOutput = await agent.login(...);
      return json(output);
    });
  }

surfaces/cli/cli_user_command.ts
  user.command('create').argument('<username>').action(async (username) => {
    const input: UserCreateInput = { username: asName(username) };
    const output = await agent.createUser(input.username);
    success('Created'); printJson(output);
  });
```

---

## Build Order
```
1. taxonomy/        — branded VOs, entities, errors, events
2. contract/        — _protocol, _port, _io interfaces (equal siblings)
3. infrastructure/  — _adapter implementations (implements _port)
4. capabilities/    — _actions implementations (implements _protocol)
5. agent/           — routers, orchestrator, DI container
6. surfaces/        — API, Web, CLI, MCP (uses _io)
```

## PRD Phase Mapping
```
Phase 1 (Email):    email_ops_io, email_ingest_io, inbox_fetch_io, user_crud_io
Phase 2 (Account):  accts_manage_io, email_ingest_protocol
Phase 3 (Multi):    api_keys_io, rate_limit_io, quota_check_io
Phase 4 (Monitor):  dash_stats_io, cleanup_task_io
```
