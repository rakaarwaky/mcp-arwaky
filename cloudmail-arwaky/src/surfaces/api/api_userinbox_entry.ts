// surfaces/api/api_userinbox_entry.ts
// Inbox surface — user-specific and admin handlers

import {
  asUserId,
  asEmailId,
  asActor,
} from '../../taxonomy';
import { quickActionSchema } from '../../taxonomy/validation_schema_vo';
import { pathUserIdSchema, pathEmailIdSchema } from '../../taxonomy/validation_schema_vo';
import type { AgentEnv } from '../../agent/di_container_registry';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import { ok, err } from './api_inbox_util';

// ── Admin: User-specific inbox/email operations ──

export async function handleGetUserInbox(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: { userId: string }
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const paramValidation = pathUserIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid userId format', 400, 'VALIDATION_ERROR', auth);
  }

  const targetUserId = asUserId(params.userId);

  // Ownership check: users can only view their own inbox (admins can view any)
  if (auth.userId !== targetUserId) {
    const currentUser = await agent.getCurrentUser(auth.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return err('Forbidden: insufficient permissions', 403, 'FORBIDDEN', auth);
    }
  }

  try {
    const { emails, archivedCount } = await agent.getUserInbox(targetUserId);
    return ok({ userId: params.userId, emails, archivedCount }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'USER_INBOX_FAILED', auth);
  }
}

export async function handleGetUserEmail(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: { userId: string; emailId: string }
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const userIdValidation = pathUserIdSchema.safeParse({ userId: params.userId });
  if (!userIdValidation.success) {
    return err('Invalid userId format', 400, 'VALIDATION_ERROR', auth);
  }
  const emailIdValidation = pathEmailIdSchema.safeParse({ emailId: params.emailId });
  if (!emailIdValidation.success) {
    return err('Invalid emailId format', 400, 'VALIDATION_ERROR', auth);
  }

  const targetUserId = asUserId(params.userId);

  // Ownership check: users can only view their own emails (admins can view any)
  if (auth.userId !== targetUserId) {
    const currentUser = await agent.getCurrentUser(auth.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return err('Forbidden: insufficient permissions', 403, 'FORBIDDEN', auth);
    }
  }

  try {
    const email = await agent.getEmail(targetUserId, asEmailId(params.emailId));
    if (!email) {
      return err('Email not found', 404, 'EMAIL_NOT_FOUND', auth);
    }
    return ok({ email }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'USER_EMAIL_FAILED', auth);
  }
}

export async function handleUserEmailQuickAction(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: { userId: string; emailId: string }
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const userIdValidation = pathUserIdSchema.safeParse({ userId: params.userId });
  if (!userIdValidation.success) {
    return err('Invalid userId format', 400, 'VALIDATION_ERROR', auth);
  }
  const emailIdValidation = pathEmailIdSchema.safeParse({ emailId: params.emailId });
  if (!emailIdValidation.success) {
    return err('Invalid emailId format', 400, 'VALIDATION_ERROR', auth);
  }

  const targetUserId = asUserId(params.userId);

  // Ownership check: users can only act on their own emails (admins can act on any)
  if (auth.userId !== targetUserId) {
    const currentUser = await agent.getCurrentUser(auth.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return err('Forbidden: insufficient permissions', 403, 'FORBIDDEN', auth);
    }
  }

  const body = await request.json().catch(() => ({}));
  const validation = quickActionSchema.safeParse(body);
  if (!validation.success) {
    return err(
      'Invalid request: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'),
      400,
      'VALIDATION_ERROR',
      auth
    );
  }

  const { action } = validation.data;

  try {
    const result = await agent.applyEmailAction(
      targetUserId,
      asEmailId(params.emailId),
      action as 'star' | 'archive' | 'delete' | 'mark_read',
      asActor(`web:${auth.userId}`)
    );
    return ok(result, auth);
  } catch (error: any) {
    return err(error.message, 500, 'USER_ACTION_FAILED', auth);
  }
}

export async function handleDebugEmails(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  // Admin only
  const user = await agent.getCurrentUser(auth.userId);
  if (!user || user.role !== 'admin') {
    return err('Forbidden', 403, 'FORBIDDEN', auth);
  }

  try {
    const db = env.DB;
    const { results } = await db.prepare('SELECT id, message_id as messageId, inbox_id as inboxId, subject FROM emails LIMIT 100').all();
    return ok({ results }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'DEBUG_FAILED', auth);
  }
}
