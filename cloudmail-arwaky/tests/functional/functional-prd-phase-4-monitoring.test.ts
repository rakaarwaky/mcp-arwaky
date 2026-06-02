import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardMetricsActions } from '../../src/capabilities/dashboard_metrics_actions';
import { createMockDb, createMockMetricsCollector } from '../unit/mocks';
describe('functional: Phase 4 Monitoring (Dashboard Metrics)', () => {
  let mockDb: any;
  let dashboard: DashboardMetricsActions;

  beforeEach(() => {
    mockDb = createMockDb();
    dashboard = new DashboardMetricsActions(mockDb, createMockMetricsCollector());
  });

  it('should retrieve metrics from database correctly', async () => {
    const { asMetricKey, asMetricLabel, asMetricValue, asUserId } = await import('../../src/taxonomy');
    const mockMetrics = [
      { key: asMetricKey('users'), label: asMetricLabel('Users'), value: asMetricValue('10'), status: 'ok' },
      { key: asMetricKey('unread'), label: asMetricLabel('Unread'), value: asMetricValue('99+'), status: 'warning' }
    ] as any;

    const userId = asUserId('u1');
    mockDb.getDashboardMetrics.mockResolvedValue(mockMetrics);

    const result = await dashboard.getMetrics(userId);
    
    expect(result).toHaveLength(2);
    expect(result[0]!.key).toBe('users');
    expect(result[1]!.status).toBe('warning');
    expect(mockDb.getDashboardMetrics).toHaveBeenCalledWith(userId);
  });
});
