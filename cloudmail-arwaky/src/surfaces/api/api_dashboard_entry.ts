// surfaces/api/api_dashboard_entry.ts
// Dashboard surface — metrics and analytics entry point

import type { AgentEnv } from '../../agent/di_container_registry';
import { jsonResponse, errorResponse, withRateLimitHeaders } from './http_response_util';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
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

export async function handleDashboard(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  try {
    const stats = await agent.getDashboardStats(auth.userId);
    
    // Construct metrics array directly from stats to avoid a second DB call
    const metrics = [
      { key: 'inboxes', label: 'Inboxes', value: String(stats.inboxCount), status: 'ok' },
      { key: 'api_usage', label: 'API Usage (24h)', value: String(stats.apiUsage), status: 'ok' },
      { key: 'active_keys', label: 'Active API Keys', value: String(stats.apiKeysActive), status: 'ok' },
      { key: 'pending_accounts', label: 'Pending Accounts', value: String(stats.pendingAccounts), status: Number(stats.pendingAccounts) > 0 ? 'warning' : 'ok' },
      { key: 'unread', label: 'Unread Emails', value: String(stats.unreadEmails), status: Number(stats.unreadEmails) > 0 ? 'warning' : 'ok' },
      { key: 'emails', label: 'Total Emails', value: String(stats.totalEmails), status: 'ok' },
      { key: 'archived', label: 'Archived Emails', value: String(stats.archivedEmails), status: 'ok' }
    ];

    const summary = {
      totalEmails: stats.totalEmails,
      archivedEmails: stats.archivedEmails,
      lastUpdated: stats.lastUpdated,
    };
    const response = ok({ summary, metrics, stats }, auth);
    response.headers.set('Cache-Control', 'private, max-age=30');
    return response;
  } catch (error: any) {
    return err(error.message || 'Dashboard fetch failed', 500, 'DASHBOARD_METRICS_FAILED', auth);
  }
}
