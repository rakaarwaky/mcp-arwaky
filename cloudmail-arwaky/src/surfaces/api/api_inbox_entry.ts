// surfaces/api/api_inbox_entry.ts
// Inbox surface — email inbox entry points

import {
  asUserId,
  asEmailId,
  asSearchFrom,
  asSubject,
  asTimeoutSeconds,
  asPollIntervalSeconds,
  asInboxId,
  asActor,
  asName,
  createEmailAddress
} from '../../taxonomy';
import { quickActionSchema } from '../../taxonomy/validation_schema_vo';
import { pathUserIdSchema, pathEmailIdSchema, pathInboxIdSchema } from '../../taxonomy/validation_schema_vo';
import { jsonResponse, errorResponse, withRateLimitHeaders } from './http_response_util';
import type { AgentEnv } from '../../agent/di_container_registry';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import type { AuthResult } from './auth_guard_util';
import type { ServiceProvider } from '../../taxonomy';
import { ok, err } from './api_inbox_util';

export async function handleGetInbox(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  try {
    // Admin sees all emails across all inboxes; regular users see their own inbox
    const isAdmin = auth.role === 'admin';
    const result = isAdmin
      ? await agent.getAllEmails()
      : await agent.getUserInbox(auth.userId);
    // DEBUG
    console.log('[INBOX] role:', auth.role, 'isAdmin:', isAdmin, 'emails count:', result.emails?.length ?? result?.emails?.length ?? 0);
    const resp = ok(result, auth);
    resp.headers.set('X-Admin-Role', auth.role);
    resp.headers.set('X-Emails-Count', String(result.emails?.length ?? 0));
    return resp;
  } catch (error: any) {
    console.error('[INBOX_ERROR]', error);
    return err(error.message, 500, 'INBOX_FETCH_FAILED', auth);
  }
}

export async function handleGetEmail(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: { emailId: string }
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const paramValidation = pathEmailIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid emailId format', 400, 'VALIDATION_ERROR', auth);
  }

  try {
    console.log(`[GET_EMAIL] ID: "${params.emailId}", Actor: ${auth.userId}, Role: ${auth.role}`);
    const emailId = asEmailId(params.emailId);
    const email = auth.role === 'admin' 
    ? await agent.getEmailGlobal(emailId)
    : await agent.getEmail(auth.userId, emailId);
    
    if (!email) {
      console.warn(`[GET_EMAIL] 404 Not Found for ID: "${params.emailId}" (Role: ${auth.role})`);
      return err('Email not found', 404, 'EMAIL_NOT_FOUND', auth);
    }
    console.log(`[GET_EMAIL] Success: found email owned by ${email.inboxId}`);
    return ok({ email }, auth);
  } catch (error: any) {
    console.error('[GET_EMAIL_ERROR]', error);
    return err(error.message, 500, 'EMAIL_FETCH_FAILED', auth);
  }
}

export async function handleGetEmailGlobal(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: { emailId: string }
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const paramValidation = pathEmailIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid emailId format', 400, 'VALIDATION_ERROR', auth);
  }

  // Admin check
  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return err('Forbidden: admin only', 403, 'FORBIDDEN', auth);
  }

  try {
    const email = await agent.getEmailGlobal(asEmailId(params.emailId));
    if (!email) {
      return err('Email not found', 404, 'EMAIL_NOT_FOUND', auth);
    }
    return ok({ email }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'EMAIL_FETCH_FAILED', auth);
  }
}

export async function handleWaitForEmail(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const url = new URL(request.url);
  const fromRaw = url.searchParams.get('from');
  const subjectRaw = url.searchParams.get('subject');
  const timeoutRaw = url.searchParams.get('timeout');
  const pollIntervalRaw = url.searchParams.get('pollInterval');

  try {
    const email = await agent.waitForEmail(auth.userId, {
      from: fromRaw ? asSearchFrom(fromRaw) : undefined,
      subject: subjectRaw ? asSubject(subjectRaw) : undefined,
      timeout: timeoutRaw ? asTimeoutSeconds(Number(timeoutRaw)) : undefined,
      pollInterval: pollIntervalRaw ? asPollIntervalSeconds(Number(pollIntervalRaw)) : undefined,
    });

    if (!email) {
      return err('Timeout waiting for email', 408, 'POLL_TIMEOUT', auth);
    }
    return ok({ email }, auth);
  } catch (error: any) {
    return err(error.message, 500, 'WAIT_FOR_EMAIL_FAILED', auth);
  }
}

export async function handleEmailQuickAction(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext,
  params: { emailId: string }
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const paramValidation = pathEmailIdSchema.safeParse(params);
  if (!paramValidation.success) {
    return err('Invalid emailId format', 400, 'VALIDATION_ERROR', auth);
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
    console.log(`[QUICK_ACTION] ID: "${params.emailId}", Action: ${action}, Actor: ${auth.userId}, Role: ${auth.role}`);
    // Admins can act on any email; resolve owner first
    const email = await agent.getEmailGlobal(asEmailId(params.emailId));
    if (!email) {
      console.warn(`[QUICK_ACTION] 404 Not Found: "${params.emailId}"`);
      return err('Email not found', 404, 'EMAIL_NOT_FOUND', auth);
    }

    // Authorization: self or admin
    if ((email.inboxId as string) !== (auth.userId as string) && auth.role !== 'admin') {
      console.warn(`[QUICK_ACTION] 403 Forbidden: Owner is ${email.inboxId}, Actor is ${auth.userId}`);
      return err('Forbidden: you do not own this email', 403, 'FORBIDDEN', auth);
    }

    console.log(`[QUICK_ACTION] Applying ${action} for owner ${email.inboxId} by actor ${auth.userId}`);
    const result = await agent.applyEmailAction(
      asUserId(email.inboxId as string), // Use the actual owner's ID
      asEmailId(params.emailId),
      action as 'star' | 'archive' | 'delete' | 'mark_read',
      asActor(`web:${auth.userId}`)
    );
    return ok(result, auth);
  } catch (error: any) {
    console.error('[QUICK_ACTION_ERROR]', error);
    return err(error.message, 500, 'ACTION_FAILED', auth);
  }
}

// Inbox CRUD operations
export { handleCreateInbox, handleDeleteInbox, handleListInboxes } from './api_inbox_crud';

// User-specific inbox/email operations (admin-access)
export { handleGetUserInbox, handleGetUserEmail, handleUserEmailQuickAction } from './api_userinbox_entry';