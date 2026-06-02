// contract/email_io.ts
// Email — read, wait, actions (merged from email_read_io + email_act_io)

import type { UserId, EmailId, Subject, SearchFrom, TimeoutSeconds, PollIntervalSeconds, Email, TimedOut, EmailQuickAction, Actor, Reason, ActionUpdated } from '../taxonomy';

// ── Input ──
export interface EmailGetInput { emailId: EmailId; userId?: UserId; }
export interface EmailWaitInput { userId: UserId; from?: SearchFrom; subject?: Subject; timeout?: TimeoutSeconds; pollInterval?: PollIntervalSeconds; }
export interface EmailActionInput { userId: UserId; emailId: EmailId; action: EmailQuickAction; actor?: Actor; }

// ── Output ──
export interface EmailGetOutput { email: Email | null; }
export interface EmailWaitOutput { email: Email | null; timedOut: TimedOut; }
export interface EmailActionOutput { updated: ActionUpdated; email?: Email | null; reason?: Reason; }
