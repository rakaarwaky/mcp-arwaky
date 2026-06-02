// surfaces/api/api_settings_entry.ts
// Settings surface — worker configuration entry points

import type { AgentEnv } from '../../agent/di_container_registry';
import { asSettingKey, asSettingValue, type SettingKey, type SettingValue } from '../../taxonomy';
import { jsonResponse, errorResponse, withRateLimitHeaders } from './http_response_util';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import type { AuthResult } from './auth_guard_util';

import { updateSettingsSchema } from '../../taxonomy/validation_schema_vo';

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

export async function handleGetSettings(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || (currentUser.role !== 'admin' && !currentUser.isOwner)) {
    return err('Forbidden: admin access required', 403, 'FORBIDDEN', auth);
  }

  try {
    const settings = await agent.getWorkerSettings();
    return ok(settings, auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Settings fetch failed';
    return err(message, 500, 'SETTINGS_FETCH_FAILED', auth);
  }
}

export async function handleUpdateSettings(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || (currentUser.role !== 'admin' && !currentUser.isOwner)) {
    return err('Forbidden: admin access required', 403, 'FORBIDDEN', auth);
  }

  const body = await request.json().catch(() => ({}));
  const validation = updateSettingsSchema.safeParse(body);
  if (!validation.success) {
    return err(
      'Invalid request: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'),
      400,
      'VALIDATION_ERROR',
      auth
    );
  }

  const { key, value } = validation.data;

  try {
    const updates: Record<SettingKey, SettingValue> = {
      [asSettingKey(key)]: asSettingValue(String(value)) as SettingValue
    };

    const updateResult = await agent.updateWorkerSettings(updates);
    return ok(updateResult, auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Settings update failed';
    return err(message, 400, 'SETTINGS_UPDATE_FAILED', auth);
  }
}
