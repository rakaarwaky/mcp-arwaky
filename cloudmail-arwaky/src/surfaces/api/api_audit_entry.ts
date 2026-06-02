// surfaces/api/api_audit_entry.ts
// Audit log surface — admin-only audit trail endpoints

import type { AgentEnv } from '../../agent/di_container_registry';
import { jsonResponse, errorResponse, withRateLimitHeaders } from './http_response_util';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import { asUserId, asApiKeyId } from '../../taxonomy';
import type { AuthResult } from './auth_guard_util';

function ok<T>(data: T, auth: AuthResult): Response {
  const r = jsonResponse(data);
  r.headers.set('x-internal-user-id', String(auth.userId));
  if (!auth.rateLimit) return r;
  return withRateLimitHeaders(r, auth.rateLimit.limit, auth.rateLimit.remaining, auth.rateLimit.resetAt);
}

function err(message: string, status: number, code: string, auth?: AuthResult): Response {
  const r = errorResponse(message, status, code);
  if (auth) {
    r.headers.set('x-internal-user-id', String(auth.userId));
    if (auth.rateLimit) {
      withRateLimitHeaders(r, auth.rateLimit.limit, auth.rateLimit.remaining, auth.rateLimit.resetAt);
    }
  }
  return r;
}

export async function handleGetAuditLogs(
    request: Request,
    env: AgentEnv,
    _ctx: ExecutionContext
): Promise<Response> {
    const agent = getAgent(env);
    const auth = await requireAuth(request, agent);
    if (isResponse(auth)) return auth;

    try {
        // Only admin can view audit logs
        const currentUser = await agent.getCurrentUser(auth.userId);
        if (!currentUser || currentUser.role !== 'admin') {
            return err('Forbidden: admin access required', 403, 'FORBIDDEN', auth);
        }

        const url = new URL(request.url);
        const limitRaw = url.searchParams.get('limit');
        const limit = limitRaw ? Math.min(parseInt(limitRaw, 10), 1000) : 100;

        const logs = await agent.getRecentAuditLogs(limit);
        return ok({ logs, count: logs.length }, auth);
    } catch (error: any) {
        return err(error.message, 500, 'AUDIT_LOGS_FAILED', auth);
    }
}

export async function handleGetUserAuditLogs(
    request: Request,
    env: AgentEnv,
    _ctx: ExecutionContext,
    params: { userId: string }
): Promise<Response> {
    const agent = getAgent(env);
    const auth = await requireAuth(request, agent);
    if (isResponse(auth)) return auth;

    const targetUserId = params.userId;

    try {
        // Admin can view any user's logs; users can only view their own
        if (auth.userId !== targetUserId) {
            const currentUser = await agent.getCurrentUser(auth.userId);
            if (!currentUser || currentUser.role !== 'admin') {
                return err('Forbidden: insufficient permissions', 403, 'FORBIDDEN', auth);
            }
        }

        const limitRaw = new URL(request.url).searchParams.get('limit');
        const limit = limitRaw ? Math.min(parseInt(limitRaw, 10), 1000) : 100;

        const logs = await agent.getUserAuditLogs(asUserId(targetUserId), limit);
        return ok({ logs, count: logs.length }, auth);
    } catch (error: any) {
        return err(error.message, 500, 'USER_AUDIT_LOGS_FAILED', auth);
    }
}

export async function handleGetApiKeyAuditLogs(
    request: Request,
    env: AgentEnv,
    _ctx: ExecutionContext,
    params: { apiKeyId: string }
): Promise<Response> {
    const agent = getAgent(env);
    const auth = await requireAuth(request, agent);
    if (isResponse(auth)) return auth;

    try {
        // Only admin can view API key audit logs
        const currentUser = await agent.getCurrentUser(auth.userId);
        if (!currentUser || currentUser.role !== 'admin') {
            return err('Forbidden: admin access required', 403, 'FORBIDDEN', auth);
        }

        const limitRaw = new URL(request.url).searchParams.get('limit');
        const limit = limitRaw ? Math.min(parseInt(limitRaw, 10), 1000) : 100;

        const logs = await agent.getApiKeyAuditLogs(asApiKeyId(params.apiKeyId), limit);
        return ok({ logs, count: logs.length }, auth);
    } catch (error: any) {
        return err(error.message, 500, 'APIKEY_AUDIT_LOGS_FAILED', auth);
    }
}

export async function handleGetTargetAuditLogs(
    request: Request,
    env: AgentEnv,
    _ctx: ExecutionContext,
    params: { targetId: string }
): Promise<Response> {
    const agent = getAgent(env);
    const auth = await requireAuth(request, agent);
    if (isResponse(auth)) return auth;

    try {
        // Only admin can view target audit logs
        const currentUser = await agent.getCurrentUser(auth.userId);
        if (!currentUser || currentUser.role !== 'admin') {
            return err('Forbidden: admin access required', 403, 'FORBIDDEN', auth);
        }

        const url = new URL(request.url);
        const limitRaw = url.searchParams.get('limit');
        const typeRaw = url.searchParams.get('type');
        const limit = limitRaw ? Math.min(parseInt(limitRaw, 10), 1000) : 100;

        const targetType = typeRaw as 'user' | 'inbox' | 'email' | 'apikey' | 'account' | 'session' | undefined;
        const logs = await agent.getTargetAuditLogs(params.targetId, targetType, limit);
        return ok({ logs, count: logs.length }, auth);
    } catch (error: any) {
        return err(error.message, 500, 'TARGET_AUDIT_LOGS_FAILED', auth);
    }
}
