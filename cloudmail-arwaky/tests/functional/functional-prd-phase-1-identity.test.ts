import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InboxManageActions } from '../../src/capabilities/inbox_manage_actions';
import { createMockDb, createMockMetricsCollector } from '../unit/mocks';

const mockAuditLog = { logEvent: vi.fn(), getUserAuditLogs: vi.fn() };

describe('functional: Phase 1 Identity (Inbox Management)', () => {
  let mockDb: any;
  let inbox: InboxManageActions;

  beforeEach(() => {
    mockDb = createMockDb();
    inbox = new InboxManageActions(mockDb, mockAuditLog as any, createMockMetricsCollector());
  });

  it('should fetch empty inbox correctly', async () => {
    const { asUserId } = await import('../../src/taxonomy');
    mockDb.getUserInboxEmails.mockResolvedValue([]);
    mockDb.getUserArchivedCount.mockResolvedValue(0);

    const result = await inbox.getUserInbox(asUserId('u1'));
    expect(result.emails).toHaveLength(0);
    expect(result.archivedCount).toBe(0);
  });

  it('should fetch populated inbox with archived count', async () => {
    const { asUserId, asEmailId, asSubject } = await import('../../src/taxonomy');
    const mockEmail = { id: asEmailId('e1'), subject: asSubject('Hello') } as any;
    mockDb.getUserInboxEmails.mockResolvedValue([mockEmail]);
    mockDb.getUserArchivedCount.mockResolvedValue(5);

    const result = await inbox.getUserInbox(asUserId('u1'));
    expect(result.emails).toHaveLength(1);
    expect(result.emails[0]!.id).toBe('e1');
    expect(result.archivedCount).toBe(5);
  });

  it('should apply quick actions (star/archive/delete)', async () => {
    const { asUserId, asEmailId, asActor } = await import('../../src/taxonomy');
    const userId = asUserId('u1');
    const emailId = asEmailId('e1');
    
    mockDb.applyEmailQuickAction.mockResolvedValue({ updated: true });

    const actor = asActor('user');
    const result = await inbox.applyEmailAction(userId, emailId, 'star', actor);
    expect(result.updated).toBe(true);
    expect(mockDb.applyEmailQuickAction).toHaveBeenCalledWith(userId, emailId, 'star', actor);
  });
});
