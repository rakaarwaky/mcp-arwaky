// surfaces/api/api_inbox_crud.ts
// Inbox CRUD handlers — extracted from api_inbox_entry to reduce file size

import {
  asUserId,
  asEmailId,
  asInboxId,
  asActor,
  asName,
  SUCCESS,
  DELETED,
} from '../../taxonomy';
import { createInboxSchema } from '../../taxonomy/validation_schema_vo';
import { pathInboxIdSchema, pathUserIdSchema } from '../../taxonomy/validation_schema_vo';
import type { AgentEnv } from '../../agent/di_container_registry';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import type { AuthResult } from './auth_guard_util';
import { ok, err } from './api_inbox_util';

export async function handleCreateInbox(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  // Check quota before creating
  const quotaCheck = await agent.checkQuota(null, auth.userId);
  if (!quotaCheck.allowed) {
    return err(
      'Quota exceeded. Maximum inboxes: ' + quotaCheck.remainingInboxes,
      429,
      'QUOTA_EXCEEDED',
      auth
    );
  }

  // Parse body for optional username/email
  const body = await request.json().catch(() => ({}));
  const validation = createInboxSchema.safeParse(body);
  if (!validation.success) {
    return err(
      'Invalid request: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'),
      400,
      'VALIDATION_ERROR',
      auth
    );
  }

  let username: string | undefined;
  if (validation.data.username) {
    username = validation.data.username.trim().toLowerCase();
  } else if (validation.data.email) {
    username = validation.data.email.split('@')[0]!.trim().toLowerCase();
  }

  if (!username) {
    username = `inbox-${Math.random().toString(36).slice(2, 10)}`;
  }

  try {
    const { user, credentials } = await agent.createUser(asName(username));
    return ok(
      {
        ok: SUCCESS,
        inbox: {
          id: user.id,
          email: user.email.full,
          createdAt: user.createdAt,
        },
        credentials: {
          username: credentials.username,
          email: credentials.email.full,
          password: credentials.password,
        },
      },
      auth
    );
  } catch (error: any) {
    return err(error.message, 500, 'INBOX_CREATE_FAILED', auth);
  }
}

export async function handleDeleteInbox(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: { inboxId: string }
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const paramValidation = pathInboxIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid inboxId format', 400, 'VALIDATION_ERROR', auth);
  }

  const targetUserId = asUserId(params.inboxId);
  const targetInboxId = asInboxId(params.inboxId);

  // Admin can delete any inbox, users can only delete their own
  if (auth.userId !== targetUserId) {
    const currentUser = await agent.getCurrentUser(auth.userId);
    if (!currentUser || currentUser.role !== 'admin') {
      return err('Forbidden: insufficient permissions', 403, 'FORBIDDEN', auth);
    }
  }

  try {
    const result = await agent.softDeleteUser(targetUserId);
    if (!result.deleted) {
      const failure = result as any; // Narrowing workaround
      const status = failure.reason === 'not_found' ? 404 : 400;
      const message =
        failure.reason === 'not_found'
          ? 'Inbox not found'
          : failure.reason === 'protected_owner'
          ? 'Owner inbox cannot be deleted'
          : 'Inbox already deleted';
      return err(message, status, failure.reason as string, auth);
    }

    // Archive all emails for this inbox
    try {
      const { emails } = await agent.getUserInbox(targetUserId);
      for (const email of emails) {
        await agent.applyEmailAction(targetUserId, email.id, 'archive', asActor('user'));
      }
    } catch {
      // Ignore email archive errors during deletion
    }

    return ok({ deleted: DELETED, deletedInboxId: params.inboxId }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'INBOX_DELETE_FAILED', auth);
  }
}

export async function handleListInboxes(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  try {
    const user = await agent.getCurrentUser(auth.userId);
    if (!user) {
      return err('User not found', 404, 'USER_NOT_FOUND', auth);
    }

    const quotaUsage = await agent.getQuotaUsage(null, auth.userId);
    const quotaLimits = await agent.checkQuota(null, auth.userId);

    return ok(
      {
        inboxes: [
          {
            id: auth.userId,
            email: user.email.full,
            createdAt: user.createdAt,
          },
        ],
        quota: {
          used: quotaUsage.currentInboxes,
          limit: quotaLimits.remainingInboxes,
        },
      },
      auth
    );
  } catch (error: any) {
    return err(error.message, 500, 'INBOX_LIST_FAILED', auth);
  }
}
