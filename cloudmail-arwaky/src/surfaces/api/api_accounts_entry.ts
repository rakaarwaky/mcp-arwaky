// surfaces/api/api_accounts_entry.ts
// Account CRUD for external service credentials (OpenRouter, etc.)

import {
  asUserId,
  asInboxId,
  asAccountId,
  asName,
  asCreatedBy,
  asServiceProvider,
  createEmailAddress,
  asPasswordPlain,
  asApiKeyPlain,
  asErrorMessage
} from '../../taxonomy';
import type { ServiceProvider } from '../../taxonomy';
import { createAccountSchema, completeAccountSchema, failAccountSchema } from '../../taxonomy/validation_schema_vo';
import { pathAccountIdSchema, pathUserIdSchema } from '../../taxonomy/validation_schema_vo';
import { jsonResponse, errorResponse, withRateLimitHeaders } from './http_response_util';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import type { AuthResult } from './auth_guard_util';
import type { AgentEnv } from '../../agent/di_container_registry';

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

export async function handleListAccounts(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: Record<string, string>
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const paramValidation = pathUserIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid userId format', 400, 'VALIDATION_ERROR', auth);
  }

  const targetUserId = asUserId(params.userId!);

  // Ownership check: users can only view their own accounts (admins can view any)
  if (auth.userId !== targetUserId) {
    const currentUser = await agent.getCurrentUser(auth.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return err('Forbidden: insufficient permissions', 403, 'FORBIDDEN', auth);
    }
  }

  try {
    const account = await agent.getAccountByInboxId(asInboxId(String(targetUserId)));
    return ok({ account }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'ACCOUNT_LIST_FAILED', auth);
  }
}

export async function handleCreateAccount(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  _params: Record<string, string>
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const body = await request.json().catch(() => ({}));
  const validation = createAccountSchema.safeParse(body);
  if (!validation.success) {
    return err(
      'Invalid request: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'),
      400,
      'VALIDATION_ERROR',
      auth
    );
  }

  const { inboxId, provider, targetEmail, password, apiKey } = validation.data;

  // Ownership check: users can only create accounts for their own inbox (admins can for any)
  const targetInboxUserId = asUserId(inboxId);
  if (auth.userId !== targetInboxUserId) {
    const currentUser = await agent.getCurrentUser(auth.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return err('Forbidden: insufficient permissions', 403, 'FORBIDDEN', auth);
    }
  }

  try {
    const accountId = await agent.createAccount({
      inboxId: asInboxId(inboxId),
      provider: (provider || 'openrouter') as ServiceProvider,
      targetEmail: createEmailAddress(targetEmail),
      password: password ? asPasswordPlain(password) : undefined,
      apiKey: apiKey
    });
    return ok({ accountId }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'ACCOUNT_CREATE_FAILED', auth);
  }
}

// ── Local runner endpoints ──

export async function handleListPendingAccounts(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  // Admin-only: local runner uses admin token
  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return err('Forbidden: admin only', 403, 'FORBIDDEN', auth);
  }

  try {
    const accounts = await agent.listPendingAccounts();
    return ok({ accounts }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'PENDING_ACCOUNTS_FAILED', auth);
  }
}

export async function handleCompleteAccount(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: { accountId: string }
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return err('Forbidden: admin only', 403, 'FORBIDDEN', auth);
  }

  const paramValidation = pathAccountIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid accountId format', 400, 'VALIDATION_ERROR', auth);
  }

  const body = await request.json().catch(() => ({}));
  const validation = completeAccountSchema.safeParse(body);
  if (!validation.success) {
    return err('Invalid request: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'), 400, 'VALIDATION_ERROR', auth);
  }
  const { apiKey } = validation.data;

  try {
    // Create API key record then mark account complete
    const { apiKey: createdKey } = await agent.createApiKey({ name: asName('OpenRouter-auto'), createdBy: asCreatedBy(String(currentUser.id)) });
    await agent.completeAccount(asAccountId(params.accountId), createdKey.id, asApiKeyPlain(apiKey));
    return ok({ ok: true, apiKeyId: createdKey.id }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'ACCOUNT_COMPLETE_FAILED', auth);
  }
}

export async function handleFailAccount(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: { accountId: string }
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return err('Forbidden: admin only', 403, 'FORBIDDEN', auth);
  }

  const paramValidation = pathAccountIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid accountId format', 400, 'VALIDATION_ERROR', auth);
  }

  const body = await request.json().catch(() => ({}));
  const validation = failAccountSchema.safeParse(body);
  if (!validation.success) {
    return err('Invalid request: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'), 400, 'VALIDATION_ERROR', auth);
  }
  const { error: errorMessage } = validation.data;

  try {
    await agent.failAccount(asAccountId(params.accountId), asErrorMessage(errorMessage));
    return ok({ ok: true }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'ACCOUNT_FAIL_FAILED', auth);
  }
}
