// tests/functional/functional-quota-enforcement.test.ts
// Functional: verify quota enforcement logic
// Covers: checkQuota logic with limits

import { describe, it, expect, vi } from 'vitest';
import { QuotaManagementActions } from '../../src/capabilities/quota_management_actions';
import { createMockDb, createMockMetricsCollector } from '../unit/mocks';
describe('functional: Quota enforcement logic', () => {
  it('should allow creation when under limit', async () => {
    const { asUserId } = await import('../../src/taxonomy');
    const mockDb = createMockDb();
    mockDb.getUserInboxCount.mockResolvedValue(2);
    mockDb.getUserEmailCount.mockResolvedValue(10);
    mockDb.getRequestsLastMinute.mockResolvedValue(5);

    const quotaActions = new QuotaManagementActions(mockDb, createMockMetricsCollector());
    const userId = asUserId('u1');

    const result = await quotaActions.checkQuota(null as any, userId);
    expect(result.allowed).toBe(true);
    expect(result.remainingInboxes).toBeGreaterThan(0);
  });

  it('should block creation when inbox limit reached', async () => {
    const { asUserId } = await import('../../src/taxonomy');
    const mockDb = createMockDb();
    // Default limit is usually 5 or 10. Let's assume it's small for test.
    mockDb.getUserInboxCount.mockResolvedValue(100); 
    mockDb.getUserEmailCount.mockResolvedValue(10);
    mockDb.getRequestsLastMinute.mockResolvedValue(5);

    const quotaActions = new QuotaManagementActions(mockDb, createMockMetricsCollector());
    const userId = asUserId('u1');

    const result = await quotaActions.checkQuota(null as any, userId);
    expect(result.allowed).toBe(false);
  });

  it('should block when requests per minute exceeded', async () => {
    const { asUserId } = await import('../../src/taxonomy');
    const mockDb = createMockDb();
    mockDb.getUserInboxCount.mockResolvedValue(1);
    mockDb.getUserEmailCount.mockResolvedValue(1);
    mockDb.getRequestsLastMinute.mockResolvedValue(1000); // Exceed default 60

    const quotaActions = new QuotaManagementActions(mockDb, createMockMetricsCollector());
    const userId = asUserId('u1');

    const result = await quotaActions.checkQuota(null as any, userId);
    expect(result.allowed).toBe(false);
  });
});
