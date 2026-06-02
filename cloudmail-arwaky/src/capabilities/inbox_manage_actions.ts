// capabilities/inbox_manage_actions.ts
// Implements IInboxManageProtocol — fetch inbox with archived count

import type { Email, UserId, ArchivedCount, EmailQuickAction, EmailActionResult, Actor, EmailId, AuditEventType } from '../taxonomy';
import { asArchivedCount, entityIdFrom, asServiceName, asAction } from '../taxonomy';
import type { IInboxManageProtocol, IDatabaseQueryPort, IMetricsCollectorPort } from '../contract';
import { AuditLogActions } from './audit_log_actions';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

/**
 * Manages inbox interactions, including fetching emails and applying quick actions.
 */
export class InboxManageActions implements IInboxManageProtocol {
  constructor(
    private db: IDatabaseQueryPort, 
    private auditLog: AuditLogActions,
    private metrics: IMetricsCollectorPort
  ) { }

  /**
   * Retrieves the current inbox emails and the count of archived emails for a user.
   * 
   * @param userId Target user ID
   * @returns Inbox content and metadata
   */
  async getUserInbox(userId: UserId): Promise<{ emails: Email[]; archivedCount: ArchivedCount }> {
    return withMetrics(this.metrics, asServiceName('inbox_manage'), asAction('getUserInbox'), async () => {
      const [emails, count] = await Promise.all([
        this.db.getUserInboxEmails(userId),
        this.db.getUserArchivedCount(userId)
      ]);
      return {
        emails,
        archivedCount: asArchivedCount(count)
      };
    });
  }

  /**
   * Admin: retrieves ALL emails across all inboxes.
   * @returns Aggregated inbox content
   */
  async getAllEmails(): Promise<{ emails: Email[]; archivedCount: ArchivedCount }> {
    return withMetrics(this.metrics, asServiceName('inbox_manage'), asAction('getAllEmails'), async () => {
      const [emails, count] = await Promise.all([
        this.db.getAllEmails(),
        this.db.getAllArchivedCount()
      ]);
      return {
        emails,
        archivedCount: asArchivedCount(count)
      };
    });
  }

  /**
   * Applies a quick action (archive, delete, star, read) to an email.
   * 
   * @param userId Target user ID
   * @param emailId Target email ID
   * @param action Action to apply
   * @param actor Person or system performing the action
   * @returns Result of the update
   */
  async applyEmailAction(userId: UserId, emailId: EmailId, action: EmailQuickAction, actor: Actor): Promise<EmailActionResult> {
    return withMetrics(this.metrics, asServiceName('inbox_manage'), asAction('applyEmailAction'), async () => {
      const result = await this.db.applyEmailQuickAction(userId, emailId, action, actor);

      // Audit log for email actions
      if (result.updated) {
        const eventType: AuditEventType = action === 'star' ? 'email_starred' :
          action === 'archive' ? 'email_archived' :
            action === 'delete' ? 'email_deleted' :
              action === 'mark_read' ? 'email_read' : 'email_actioned';

        await this.auditLog.logEvent({
          eventType: eventType,
          userId: userId,
          targetId: entityIdFrom(emailId),
          targetType: 'email',
          metadata: { action, actor, emailUpdated: result.email ? true : false }
        });
      }

      return result;
    });
  }
}
