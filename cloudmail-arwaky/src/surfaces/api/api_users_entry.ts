// surfaces/api/api_users_entry.ts
// Users surface — user management entry points

import type { AgentEnv } from '../../agent/di_container_registry';
import { asUserId, asName, asPassword, createEmailAddress, sanitizeUser, SUCCESS, DELETED } from '../../taxonomy';
import { createUserSchema, updateUserSchema } from '../../taxonomy/validation_schema_vo';
import type { SanitizedUser } from '../../taxonomy';
import { jsonResponse, errorResponse, withRateLimitHeaders } from './http_response_util';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse, requireAdmin, authorizeSelfOrAdmin } from './auth_guard_util';
import type { AuthResult } from './auth_guard_util';
import type { UserIdParams, CreateUserBody, UpdateUserBody } from '../../taxonomy/route_params_vo';
import { pathUserIdSchema } from '../../taxonomy/validation_schema_vo';

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

export async function handleListUsers(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const forbidden = requireAdmin(auth);
  if (forbidden) return forbidden;

  const users = await agent.listUsers();
  const sanitized = (users ?? []).map((u) => sanitizeUser(u));
  return ok({ users: sanitized }, auth);
}

export async function handleCreateUser(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const forbidden = requireAdmin(auth);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => ({}));
  const validation = createUserSchema.safeParse(body);
  if (!validation.success) {
    return err('Invalid input: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'), 400, 'VALIDATION_ERROR', auth);
  }

  const { email, password, displayName } = validation.data;

  try {
    const username = asName(displayName || email.split('@')[0]!);
    const { user, credentials } = await agent.createUser(username);
    return ok({ ok: SUCCESS, user: sanitizeUser(user), credentials }, auth);
  } catch (error: any) {
    const status = error.name === 'ValidationFieldError' ? 400 : 400;
    const code = error.name === 'ValidationFieldError' ? 'VALIDATION_ERROR' : 'CREATE_FAILED';
    return err(error.message, status, code, auth);
  }
}

export async function handleGetUser(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: UserIdParams
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const paramValidation = pathUserIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid userId format', 400, 'VALIDATION_ERROR', auth);
  }

  const forbidden = authorizeSelfOrAdmin(auth, asUserId(params.userId));
  if (forbidden) return forbidden;

  const user = await agent.getUser(asUserId(params.userId));
  if (!user) {
    return err('User not found', 404, 'USER_NOT_FOUND', auth);
  }
  return ok({ user: sanitizeUser(user) }, auth);
}

export async function handleUpdateUser(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: UserIdParams
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const paramValidation = pathUserIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid userId format', 400, 'VALIDATION_ERROR', auth);
  }

  if (auth.userId !== params.userId && auth.role !== 'admin') {
    return err('Forbidden', 403, 'FORBIDDEN', auth);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return err('Invalid JSON body', 400, 'VALIDATION_ERROR', auth);
  }
  const validation = updateUserSchema.safeParse(body);
  if (!validation.success) {
    return err('Invalid input: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'), 400, 'VALIDATION_ERROR', auth);
  }

  const { email, password, displayName } = validation.data;

  try {
    const updates: Record<string, any> = {};
    if (email) updates.email = createEmailAddress(email.toLowerCase());
    if (displayName) updates.displayName = asName(displayName);
    if (password) updates.password = asPassword(password);

    const updateResult = await agent.updateUser(asUserId(params.userId), updates);
    if (!updateResult) return err('User not found', 404, 'USER_NOT_FOUND', auth);
    return ok({ user: sanitizeUser(updateResult) }, auth);
  } catch (error: any) {
    const status = error.name === 'ValidationFieldError' ? 400 : 500;
    const code = error.name === 'ValidationFieldError' ? 'VALIDATION_ERROR' : 'UPDATE_FAILED';
    return err(error.message, status, code, auth);
  }
}

export async function handleDeleteUser(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: UserIdParams
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const paramValidation = pathUserIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid userId format', 400, 'VALIDATION_ERROR', auth);
  }

  if (auth.userId !== params.userId && auth.role !== 'admin') {
    return err('Forbidden', 403, 'FORBIDDEN', auth);
  }

  const result = await agent.softDeleteUser(asUserId(params.userId));
  if (!result.deleted) {
    const failure = result as any;
    const status = failure.reason === 'not_found' ? 404 : failure.reason === 'protected_owner' ? 400 : 400;
    const message = failure.reason === 'not_found' ? 'User not found'
      : failure.reason === 'protected_owner' ? 'Owner account cannot be soft deleted'
        : 'User already deleted';
    return err(message, status, failure.reason as string, auth);
  }
  return ok({ deleted: DELETED }, auth);
}

export async function handleGetCurrentUser(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const user = await agent.getCurrentUser(auth.userId);
  if (!user) {
    return err('User not found', 404, 'USER_NOT_FOUND', auth);
  }
  return ok({ user: sanitizeUser(user) }, auth);
}
