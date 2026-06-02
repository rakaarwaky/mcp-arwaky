/**
 * @module contract/inbox_manage_protocol
 * @description Protocol interface for inbox management capability.
 * Defines inbox retrieval and email action operations.
 */
// contract/inbox_manage_protocol.ts

import type { Email, UserId, EmailId, ArchivedCount, EmailQuickAction, EmailActionResult, Actor } from '../taxonomy';

export interface IInboxManageProtocol {
  getUserInbox(userId: UserId): Promise<{ emails: Email[]; archivedCount: ArchivedCount }>;
  applyEmailAction(userId: UserId, emailId: EmailId, action: EmailQuickAction, actor: Actor): Promise<EmailActionResult>;
}
