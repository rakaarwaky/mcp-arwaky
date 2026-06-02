import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockDb } from './mocks';
import {
  asUserId, asEmailId, asMaxAgeHours, nowTimestamp, createEmailAddress
} from '../../src/taxonomy';
import { InboxManageActions } from '../../src/capabilities/inbox_manage_actions';
import { EmailFetchActions } from '../../src/capabilities/email_fetch_actions';
import { EmailIngestActions } from '../../src/capabilities/email_ingest_actions';
import { InboxCleanupActions } from '../../src/capabilities/inbox_cleanup_actions';
import { AuditLogActions } from '../../src/capabilities/audit_log_actions';
import { createMockLogger, createMockMetricsCollector, createMockPush } from './mocks';

describe('Capabilities: Inbox & Email', () => {
  let db: any;
  let logger: any;
  let metrics: any;
  let push: any;
  let auditLog: AuditLogActions;

  beforeEach(() => {
    db = createMockDb();
    logger = createMockLogger();
    metrics = createMockMetricsCollector();
    push = createMockPush();
    auditLog = new AuditLogActions(db, logger, metrics);
  });

  describe('InboxManageActions', () => {
    it('should list user inbox and apply actions', async () => {
      const actions = new InboxManageActions(db, auditLog, metrics);
      db.getUserInboxEmails.mockResolvedValue([{ id: 'e1' }]);
      db.getUserArchivedCount.mockResolvedValue(10);

      const inbox = await actions.getUserInbox(asUserId('u1'));
      expect(inbox.emails).toHaveLength(1);
      expect(Number(inbox.archivedCount)).toBe(10);

      db.applyEmailQuickAction.mockResolvedValue({ updated: true });
      const res = await actions.applyEmailAction(asUserId('u1'), asEmailId('e1'), 'archive' as any, 'user' as any);
      expect(res.updated).toBe(true);
    });
  });

  describe('EmailFetchActions', () => {
    it('should fetch single email', async () => {
      const actions = new EmailFetchActions(db, metrics, push);
      db.getEmailById.mockResolvedValue({ id: 'e1' });

      const email = await actions.getEmail(asUserId('u1'), asEmailId('e1'));
      expect(email?.id).toBe('e1');
    });

    it('should wait for email with polling', async () => {
      const actions = new EmailFetchActions(db, metrics, push);
      db.findEmail
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'e2', subject: 'Match' as any });

      const result = await actions.waitForEmail(asUserId('u1'), {
        subject: 'Match' as any,
        timeout: 1 as any,
        pollInterval: 0.1 as any
      });
      expect(result?.id).toBe('e2');
    });
  });

  describe('EmailIngestActions', () => {
    it('should ingest new email', async () => {
      const actions = new EmailIngestActions(db, metrics, push);
      db.upsertEmail.mockResolvedValue({ stored: true });

      const res = await actions.ingestEmail({
        emailId: asEmailId('e-new'),
        sender: 'alice@test.com',
        recipient: 'bob@test.com',
        subject: 'Hi',
        receivedAt: nowTimestamp(),
      } as any);

      expect(res.stored).toBe(true);
      expect(db.upsertEmail).toHaveBeenCalled();
    });
  });

  describe('InboxCleanupActions', () => {
    it('should run all cleanup tasks', async () => {
      const actions = new InboxCleanupActions(db, metrics);
      db.cleanupExpiredEmails.mockResolvedValue(5);
      db.deleteExpiredSessions.mockResolvedValue(2);

      const result = await actions.runCleanup(asMaxAgeHours(24));
      expect(Number(result.expiredEmails)).toBe(5);
      expect(Number(result.expiredSessions)).toBe(2);
    });
  });
});
