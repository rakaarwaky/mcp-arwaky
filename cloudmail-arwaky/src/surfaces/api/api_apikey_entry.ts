// surfaces/api/api_apikey_entry.ts
// API key surface — list, create, revoke

import type { AgentEnv } from '../../agent/di_container_registry';
import { asName, asApiKeyId, asCryptoHash, asApiKeyPlain, VALID } from '../../taxonomy';
import { jsonResponse, errorResponse, withRateLimitHeaders } from './http_response_util';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import type { AuthResult } from './auth_guard_util';
import { createApiKeySchema } from '../../taxonomy/validation_schema_vo';
import { pathKeyIdSchema } from '../../taxonomy/validation_schema_vo';
import type { ApiKeyListItem, VerifyApiKeyOutput } from '../../contract/api_keys_io';
import type { CryptoHash } from '../../taxonomy';

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

export async function handleListApiKeys(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return err('Forbidden: admin access required', 403, 'FORBIDDEN', auth);
  }

  try {
    const keys = await agent.listApiKeys();
    return ok({ keys }, auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'List API keys failed';
    return err(message, 500, 'APIKEY_LIST_FAILED', auth);
  }
}

export async function handleCreateApiKey(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return err('Forbidden: admin access required', 403, 'FORBIDDEN', auth);
  }

  const body = await request.json().catch(() => ({}));
  const result = createApiKeySchema.safeParse(body);
  if (!result.success) {
    return err(
      'Invalid request: ' + (result.error.issues[0]?.message ?? 'Unknown validation error'),
      400,
      'VALIDATION_ERROR',
      auth
    );
  }

  try {
    const keyResult = await agent.createApiKey({ name: result.data.name ? asName(result.data.name) : undefined });
    return ok(keyResult, auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Create API key failed';
    return err(message, 400, 'APIKEY_CREATE_FAILED', auth);
  }
}

export async function handleRevokeApiKey(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return err('Forbidden: admin access required', 403, 'FORBIDDEN', auth);
  }

  const paramValidation = pathKeyIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid keyId format', 400, 'VALIDATION_ERROR', auth);
  }

  try {
    await agent.revokeApiKey({ apiKeyId: asApiKeyId(params.keyId!) });
    return ok({ ok: true }, auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Revoke API key failed';
    return err(message, 400, 'APIKEY_REVOKE_FAILED', auth);
  }
}

export async function handleGetApiKeyByHash(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return err('Forbidden: admin access required', 403, 'FORBIDDEN', auth);
  }

  const hash = params.hash;
  if (!hash || typeof hash !== 'string' || hash.length < 1) {
    return err('Invalid hash format', 400, 'VALIDATION_ERROR', auth);
  }

  try {
    const key = await agent.getApiKeyByHash(asCryptoHash(hash));
    if (!key) {
      return err('API key not found', 404, 'NOT_FOUND', auth);
    }
    return ok(key, auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Get API key by hash failed';
    return err(message, 500, 'APIKEY_GET_FAILED', auth);
  }
}

export async function handleVerifyApiKeyPlain(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  // Any authenticated user can verify their own API key
  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser) {
    return err('User not found', 404, 'NOT_FOUND', auth);
  }

  const body = (await request.json().catch(() => ({}))) as any;
  const keyPlain = body.keyPlain;
  if (!keyPlain || typeof keyPlain !== 'string') {
    return err('keyPlain (string) is required', 400, 'VALIDATION_ERROR', auth);
  }

  try {
    const result = await agent.apiQuota.verifyApiKeyPlain(asApiKeyPlain(keyPlain));
    if (result.valid === VALID) {
      return ok(result, auth);
    }
    return err('Invalid API key', 403, 'APIKEY_INVALID', auth);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verify API key failed';
    return err(message, 500, 'APIKEY_VERIFY_FAILED', auth);
  }
}
