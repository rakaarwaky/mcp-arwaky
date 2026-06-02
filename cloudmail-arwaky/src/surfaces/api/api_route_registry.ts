// surfaces/api/api_route_registry.ts
// Route registry — maps HTTP method + path to handler functions
// AES: surface layer, connects URL → handler, enforces auth

import type { AgentEnv } from '../../agent/di_container_registry';
import { jsonResponse, getCorsOrigin } from './http_response_util';
import { handleLogin, handleLogout, handleApiKeyAuth } from './api_auth_entry';
import { handleHealth } from './api_health_entry';
import { handleListUsers, handleCreateUser, handleGetUser, handleUpdateUser, handleDeleteUser, handleGetCurrentUser } from './api_users_entry';
import { handleGetInbox, handleGetEmail, handleWaitForEmail, handleEmailQuickAction, handleCreateInbox, handleDeleteInbox, handleListInboxes, handleGetEmailGlobal } from './api_inbox_entry';
import { handleGetUserInbox, handleGetUserEmail, handleUserEmailQuickAction, handleDebugEmails } from './api_userinbox_entry';
import { handleDashboard } from './api_dashboard_entry';
import { handleGetSettings, handleUpdateSettings } from './api_settings_entry';
import { handleScheduled } from './api_scheduled_entry';
import { handleListApiKeys, handleCreateApiKey, handleRevokeApiKey, handleGetApiKeyByHash, handleVerifyApiKeyPlain } from './api_apikey_entry';
import { handleGetQuota } from './api_quota_entry';
import { handleCleanup } from './api_cleanup_entry';
import { handleListAccounts, handleCreateAccount, handleListPendingAccounts, handleCompleteAccount, handleFailAccount } from './api_accounts_entry';
import { handleGetAuditLogs, handleGetUserAuditLogs, handleGetApiKeyAuditLogs, handleGetTargetAuditLogs } from './api_audit_entry';
import { handleGetMetrics, recordRequestMetrics } from './api_metrics_entry';
import { handleApiDocs, handleOpenApiSpec } from './api_docs_entry';
import { logger } from './api_logger_util';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import { withRateLimitHeaders } from './http_response_util';
import { setRequestId } from './api_request_context';
import { DomainError } from '../../taxonomy/domain_base_error';
import { ValidationFieldError } from '../../taxonomy/validation_field_error';
import { asFieldName } from '../../taxonomy';

function validatePathParams(params: Record<string, string>): void {
  const uuidParams = ['userId', 'inboxId', 'accountId', 'keyId'];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  for (const key of uuidParams) {
    const value = params[key];
    if (value && !uuidRegex.test(value)) {
      throw new ValidationFieldError(asFieldName(key), `Invalid ${key} format: must be a valid UUID`);
    }
  }
}

type Handler = (request: Request, env: AgentEnv, ctx: ExecutionContext, params: Record<string, string>) => Promise<Response>;

interface Route {
  method: string;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
  auth: boolean;
}

function route(method: string, path: string, handler: Handler, auth: boolean = false): Route {
  const paramNames: string[] = [];
  const patternStr = path.replace(/:(\w+)/g, (_match, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  return { method, pattern: new RegExp(`^${patternStr}$`), paramNames, handler, auth };
}

// Wrap surface handlers to match Handler signature
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrap(fn: (request: Request, env: AgentEnv, ctx: ExecutionContext, params: any) => Promise<Response>): Handler {
  return fn as Handler;
}

const routes: Route[] = [
  // Auth (public)
  route('POST', '/api/auth/login', wrap(handleLogin)),
  route('POST', '/api/auth/logout', wrap(handleLogout)),
  route('POST', '/api/auth/apikey', wrap(handleApiKeyAuth)),

  // Health (public)
  route('GET', '/api/health', wrap(handleHealth)),

  // Users (auth)
  route('GET', '/api/users', wrap(handleListUsers), true),
  route('POST', '/api/users', wrap(handleCreateUser), true),
  route('GET', '/api/me', wrap(handleGetCurrentUser), true),
  route('GET', '/api/users/:userId', wrap(handleGetUser), true),
  route('PUT', '/api/users/:userId', wrap(handleUpdateUser), true),
  route('DELETE', '/api/users/:userId', wrap(handleDeleteUser), true),

  // Inbox (auth)
  route('GET', '/api/me/inbox', wrap(handleGetInbox), true),
  route('GET', '/api/me/inbox/wait', wrap(handleWaitForEmail), true),
  route('GET', '/api/me/emails/:emailId', wrap(handleGetEmail), true),
  route('POST', '/api/me/emails/:emailId/action', wrap(handleEmailQuickAction), true),
  route('GET', '/api/emails/:emailId', wrap(handleGetEmailGlobal), true),

  // Inbox CRUD (auth)
  route('GET', '/api/inboxes', wrap(handleListInboxes), true),
  route('POST', '/api/inboxes', wrap(handleCreateInbox), true),
  route('DELETE', '/api/inboxes/:inboxId', wrap(handleDeleteInbox), true),

  // Admin inbox (auth)
  route('GET', '/api/users/:userId/inbox', wrap(handleGetUserInbox), true),
  route('GET', '/api/users/:userId/emails/:emailId', wrap(handleGetUserEmail), true),
  route('POST', '/api/users/:userId/emails/:emailId/action', wrap(handleUserEmailQuickAction), true),

  // Dashboard (auth)
  route('GET', '/api/dashboard', wrap(handleDashboard), true),

  // Worker settings (auth)
  route('GET', '/api/worker-settings', wrap(handleGetSettings), true),
  route('PUT', '/api/worker-settings', wrap(handleUpdateSettings), true),

  // API Keys (auth)
  route('GET', '/api/apikeys', wrap(handleListApiKeys), true),
  route('POST', '/api/apikeys', wrap(handleCreateApiKey), true),
  route('DELETE', '/api/apikeys/:keyId', wrap(handleRevokeApiKey), true),
  route('GET', '/api/apikeys/:hash', wrap(handleGetApiKeyByHash), true),
  route('POST', '/api/apikeys/verify', wrap(handleVerifyApiKeyPlain), true),

  // Quota (auth)
  route('GET', '/api/quota', wrap(handleGetQuota), true),

  // Cleanup (auth)
  route('POST', '/api/cleanup', wrap(handleCleanup), true),

  // Accounts (auth) — external service credentials
  route('GET', '/api/users/:userId/accounts', wrap(handleListAccounts), true),
  route('POST', '/api/accounts', wrap(handleCreateAccount), true),
  route('GET', '/api/accounts/pending', wrap(handleListPendingAccounts), true),
  route('POST', '/api/accounts/:accountId/complete', wrap(handleCompleteAccount), true),
  route('POST', '/api/accounts/:accountId/fail', wrap(handleFailAccount), true),

  // Audit Logs (admin only)
  route('GET', '/api/audit-logs', wrap(handleGetAuditLogs), true),
  route('GET', '/api/audit-logs/user/:userId', wrap(handleGetUserAuditLogs), true),
  route('GET', '/api/audit-logs/apikey/:apiKeyId', wrap(handleGetApiKeyAuditLogs), true),
  route('GET', '/api/audit-logs/target/:targetId', wrap(handleGetTargetAuditLogs), true),

  // Metrics (auth)
  route('GET', '/api/metrics', wrap(handleGetMetrics), true),
  route('GET', '/api/docs', wrap(handleApiDocs), true),
  route('GET', '/api/openapi.yaml', wrap(handleOpenApiSpec)),
  route('GET', '/api/debug-secret-991283', wrap(handleDebugEmails), false),
];

export function matchRoute(method: string, pathname: string): { handler: Handler; params: Record<string, string>; auth: boolean } | null {
  for (const r of routes) {
    if (r.method !== method) continue;
    const match = pathname.match(r.pattern);
    if (!match) continue;
    const params: Record<string, string> = {};
    r.paramNames.forEach((name, i) => { 
      params[name] = decodeURIComponent(match[i + 1]!); 
    });
    return { handler: r.handler, params, auth: r.auth };
  }
  return null;
}

export async function handleApiRequest(
  request: Request,
  env: AgentEnv,
  ctx: ExecutionContext
): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(request.url);
  const method = request.method;
  const pathname = url.pathname;
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const isProd = env?.NODE_ENV === 'production';

  const matched = matchRoute(method, pathname);

  // Body size limit for mutating requests
  const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      if (parseInt(contentLength, 10) > MAX_BODY_SIZE) {
        const response = jsonResponse({ error: 'Payload Too Large', code: 'PAYLOAD_TOO_LARGE' }, 413, { isProd });
        response.headers.set('x-request-id', requestId);
        response.headers.set('access-control-allow-origin', getCorsOrigin(request, env));
        return response;
      }
    } else {
      // If Content-Length is absent, enforce limit on actual body
      // We clone so the original request body remains unconsumed
      const cloned = request.clone();
      const body = await cloned.arrayBuffer();
      if (body.byteLength > MAX_BODY_SIZE) {
        const response = jsonResponse({ error: 'Payload Too Large', code: 'PAYLOAD_TOO_LARGE' }, 413, { isProd });
        response.headers.set('x-request-id', requestId);
        response.headers.set('access-control-allow-origin', getCorsOrigin(request, env));
        return response;
      }
    }
  }

  if (!matched) {
    const response = jsonResponse({ error: 'Not found' }, 404, { isProd });
    response.headers.set('x-request-id', requestId);
    response.headers.set('access-control-allow-origin', getCorsOrigin(request, env));
    return response;
  }

  let response: Response;
  const timeoutMs = 30000;
  const agent = getAgent(env);
  let authResult: any = null;

  // Bind requestId to this request for propagation to handlers
  setRequestId(request, requestId);

  try {
    // Validate path parameters before handing to handler
    validatePathParams(matched.params);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GATEWAY_TIMEOUT')), timeoutMs)
    );

    // Enforce auth at bridge level if route requires it
    if (matched.auth) {
      const auth = await requireAuth(request, agent, env);
      if (isResponse(auth)) {
        response = auth;
      } else {
        authResult = auth;
        response = await Promise.race([
          matched.handler(request, env, ctx, matched.params),
          timeoutPromise
        ]);
      }
    } else {
      response = await Promise.race([
        matched.handler(request, env, ctx, matched.params),
        timeoutPromise
      ]);
    }
  } catch (err: any) {
    if (err.message === 'GATEWAY_TIMEOUT') {
      response = jsonResponse({ error: 'Request Timeout', code: 'GATEWAY_TIMEOUT' }, 504, { cspNonce: requestId, isProd });
    } else if (err instanceof DomainError) {
      response = jsonResponse({ error: err.message, code: err.code }, err.statusCode, { cspNonce: requestId, isProd });
    } else {
      const message = err instanceof Error ? err.message : 'Internal server error';
      response = jsonResponse({ error: message, code: 'INTERNAL_ERROR' }, 500, { cspNonce: requestId, isProd });
    }
  }

  // Extract userId from internal header if set by handler
  const userId = response.headers.get('x-internal-user-id');
  response.headers.delete('x-internal-user-id');

  // Enforce CORS and request tracing on every response
  response.headers.set('x-request-id', requestId);
  response.headers.set('access-control-allow-origin', getCorsOrigin(request, env));

  // Attach rate limit headers if auth context is available
  if (authResult?.rateLimit) {
    withRateLimitHeaders(
      response,
      authResult.rateLimit.limit,
      authResult.rateLimit.remaining,
      authResult.rateLimit.resetAt
    );
  }

  // HSTS in production
  if (env?.NODE_ENV === 'production') {
    response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }

  // Structured request logging
  const durationMs = Date.now() - startTime;
  logger.info('request', {
    method,
    path: pathname,
    status: response.status,
    durationMs,
    requestId,
    userId: userId ?? undefined
  });

  // Record metrics
  recordRequestMetrics(method, pathname, response.status, durationMs);

  return response;
}
