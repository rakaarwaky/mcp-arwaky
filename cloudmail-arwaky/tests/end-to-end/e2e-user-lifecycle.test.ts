import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator } from '../../src/agent/request_flow_facade';
import { createMockDb, createMockPasswordHash, createMockSessionAuth } from '../unit/mocks';
import { 
  asUserId, asName, createEmailAddress, asTimestamp, asEmailCount, 
  asArchivedCount, asUserAgent, asClientIp, asAccountId, asEmailId, asInboxId
} from '../../src/taxonomy';
import { UserLoginActions } from '../../src/capabilities/user_login_actions';
import { InboxManageActions } from '../../src/capabilities/inbox_manage_actions';
import { createTestContainer, createMockEmail } from './test_utils';

/**
 * E2E: User Lifecycle & Visibility
 * 
 * Responsibility:
 * Verifies the dashboard experience, including metric aggregation,
 * profile updates, and the real-time impact of inbox actions on
 * overall user statistics.
 */
describe('e2e: User Dashboard & Profile Lifecycle', () => {
  let mockDb: any;
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    const container = createTestContainer();
    mockDb = container.database;
    orchestrator = new AgentOrchestrator(container);
  });

  describe('Dashboard Metrics Aggregation', () => {
    it('aggregates data across multiple inboxes for a single dashboard view', async () => {
      const u1 = asUserId('u_dashboard');
      
      // Mock metrics from multiple perspectives
      mockDb.getUserInboxCount.mockResolvedValue(5);
      mockDb.getUserEmailCount.mockResolvedValue(125);
      mockDb.getUserArchivedCount.mockResolvedValue(40);
      mockDb.getQuotaStatus.mockResolvedValue({ usagePercent: 25, limit: 100, current: 25 });

      const metrics = await orchestrator.getUserMetrics(u1);
      
      expect(metrics.totalInboxes).toBe(5);
      expect(metrics.totalEmails).toBe(125);
      expect(metrics.archivedCount).toBe(40);
      expect(metrics.usagePercent).toBe(25);
    });

    it('updates metrics immediately after a quick action is performed', async () => {
      const u1 = asUserId('u_action');
      const emailId = asEmailId('msg_1');

      // 1. Initial State
      mockDb.getUserInboxEmails.mockResolvedValue([createMockEmail({ id: emailId, isRead: false })]);
      const before = await orchestrator.getUserInbox(u1);
      expect(before.emails[0]!.isRead).toBe(false);

      // 2. Perform Quick Action
      mockDb.applyEmailQuickAction.mockResolvedValue(true);
      await orchestrator.applyEmailAction(u1, emailId, 'mark_read');

      // 3. System re-queries
      mockDb.getUserInboxEmails.mockResolvedValue([createMockEmail({ id: emailId, isRead: true })]);
      const after = await orchestrator.getUserInbox(u1);
      expect(after.emails[0]!.isRead).toBe(true);
    });
  });

  describe('Profile & Settings Management', () => {
    it('updates user display name and verifies persistence', async () => {
      const u1 = asUserId('u_prof');
      const newName = asName('Updated Name');

      mockDb.updateUser.mockResolvedValue({ success: true });
      mockDb.getUserById.mockResolvedValue({ id: u1, displayName: newName });

      await orchestrator.updateUser(u1, { displayName: newName });
      
      const identity = await orchestrator.getUserIdentity(u1);
      expect(identity!.displayName).toBe('Updated Name');
      expect(mockDb.updateUser).toHaveBeenCalledWith(u1, expect.objectContaining({
        displayName: newName
      }));
    });
  });

  describe('Multi-Account Conflict Handling', () => {
    it('prevents creating duplicate accounts for the same provider/inbox pair', async () => {
      const inboxId = asInboxId('in_dup');
      const provider = 'AWS' as any;
      
      mockDb.createAccountRecord.mockRejectedValue(new Error('DUPLICATE_ACCOUNT'));

      await expect(orchestrator.createAccount({ inboxId, provider, targetEmail: createEmailAddress('a@b.com') }))
        .rejects.toThrow('DUPLICATE_ACCOUNT');
    });
  });

  describe('Cleanup & Expiration', () => {
    it('orchestrates a full system cleanup from the user context', async () => {
      // Simulate an admin or power user clearing out expired data
      mockDb.cleanupExpiredEmails.mockResolvedValue(50);

      const report = await orchestrator.performSystemCleanup();

      expect(report.emailsRemoved).toBe(50);
    });
  });
});
