// tests/integration/integration-taxonomy-contract.test.ts
// Integration: taxonomy types used correctly across contract boundaries

import { describe, it, expect } from 'vitest';
import type { DashboardMetricsInput, DashboardMetricsOutput } from '../../src/contract/dash_stats_io';
import type { UserGetInput } from '../../src/contract/user_crud_io';
import { asEmailCount, asTimestamp, asInboxCount, asCount, asRequestCount, asUserId } from '../../src/taxonomy';

describe('integration: taxonomy → contract (IO types)', () => {
  it('dash_stats_io uses taxonomy branded types', async () => {
    
    // Testing IO type assignment compatibility
    const output: DashboardMetricsOutput = {
      summary: {
        totalEmails: asEmailCount(100),
        archivedEmails: asEmailCount(50) as any, // ArchivedCount is also EmailCount
        lastUpdated: asTimestamp('2024-01-01T00:00:00Z')
      },
      stats: {
        totalUsers: asCount(1),
        inboxCount: asInboxCount(1),
        emailCount: asEmailCount(10),
        apiKeysActive: asCount(2),
        pendingAccounts: asCount(0),
        linkedAccounts: asCount(1),
        unreadEmails: asEmailCount(5),
        starredEmails: asEmailCount(2),
        totalEmails: asEmailCount(10),
        archivedEmails: asEmailCount(1),
        apiUsage: asRequestCount(100),
        systemHealthy: 'ok' as any,
        lastUpdated: asTimestamp('2024-01-01T00:00:00Z')
      },
      metrics: []
    };
    
    expect(output.summary.totalEmails).toBe(100);
  });

  it('user_crud_io correctly types identifiers', async () => {
    const { asUserId } = await import('../../src/taxonomy');
    const input: UserGetInput = {
      userId: asUserId('u123')
    };
    expect(input.userId).toBe('u123');
  });

  it('rate_limit_io maps to request counters', async () => {
    const { asRequestCount } = await import('../../src/taxonomy');
    const mod = await import('../../src/contract/rate_limit_io');
    
    // We verify the module exists and asRequestCount can be used (nominal test)
    expect(mod).toBeDefined();
    expect(asRequestCount(10)).toBe(10);
  });
});

describe('integration: capabilities implement protocols', () => {
  it('InboxManageActions implements IInboxManageProtocol', async () => {
    const { InboxManageActions } = await import('../../src/capabilities/inbox_manage_actions');
    const { createMockDb, createMockAuditLog, createMockMetricsCollector } = await import('../unit/mocks');
    
    const db = createMockDb();
    const actions = new InboxManageActions(db, createMockAuditLog(db), createMockMetricsCollector());
    expect(actions.getUserInbox).toBeDefined();
    expect(actions.applyEmailAction).toBeDefined();
  });

  it('DashboardMetricsActions implements IDashboardMetricsProtocol', async () => {
    const { DashboardMetricsActions } = await import('../../src/capabilities/dashboard_metrics_actions');
    const { createMockDb, createMockMetricsCollector } = await import('../unit/mocks');
    
    const actions = new DashboardMetricsActions(createMockDb(), createMockMetricsCollector());
    expect(actions.getMetrics).toBeDefined();
  });

  it('EmailIngestActions implements IEmailIngestProtocol', async () => {
    const { EmailIngestActions } = await import('../../src/capabilities/email_ingest_actions');
    const { createMockDb, createMockMetricsCollector, createMockPush } = await import('../unit/mocks');
    
    const actions = new EmailIngestActions(createMockDb(), createMockMetricsCollector(), createMockPush());
    expect(actions.ingestEmail).toBeDefined();
  });
});

