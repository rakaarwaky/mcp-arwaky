import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDb, createMockMetricsCollector } from './mocks';
import { 
  asUserId, asApiKeyId, asRequestCount, asWindowSeconds
} from '../../src/taxonomy';
import { DashboardMetricsActions } from '../../src/capabilities/dashboard_metrics_actions';
import { WorkerSettingsActions } from '../../src/capabilities/worker_settings_actions';
import { RateLimitActions } from '../../src/capabilities/rate_limit_actions';
import { QuotaManagementActions } from '../../src/capabilities/quota_management_actions';

describe('Capabilities: System Management', () => {
  let db: any;

  beforeEach(() => {
    db = createMockDb();
  });

  describe('DashboardMetricsActions', () => {
    it('should fetch metrics from DB', async () => {
      const actions = new DashboardMetricsActions(db, createMockMetricsCollector());
      db.getDashboardMetrics.mockResolvedValue([{ key: 'test', value: 100 }]);
      const metrics = await actions.getMetrics(asUserId('test'));
      expect(metrics).toHaveLength(1);
    });
  });

  describe('WorkerSettingsActions', () => {
    it('should get and set settings', async () => {
      const config = { api: { baseUrl: 'url' }, email: { defaultDomain: 'd' }, quota: { maxEmailsPerInbox: 10, maxInboxesPerKey: 5 } };
      const actions = new WorkerSettingsActions(db, config as any, createMockMetricsCollector());
      db.getWorkerSettings.mockResolvedValue([{ key: 'k1', value: 'v1' }]);
      
      const { settings } = await actions.getSettings();
      expect(settings).toBeDefined();
      
      await actions.updateSettings({ k2: 'v2' } as any);
      expect(db.setWorkerSetting).toHaveBeenCalledWith('k2', 'v2');
    });
  });

  describe('RateLimitActions', () => {
    it('should check rate limits', async () => {
      const actions = new RateLimitActions(db, createMockMetricsCollector());
      db.getRequestCountInWindow.mockResolvedValue(10);
      const result = await actions.checkLimit(null, asUserId('u1'), asRequestCount(60), asWindowSeconds(60));
      expect(result.allowed).toBe(true);
    });
  });

  describe('QuotaManagementActions', () => {
    it('should check quotas', async () => {
      const actions = new QuotaManagementActions(db, createMockMetricsCollector());
      db.getUserInboxCount.mockResolvedValue(1);
      const result = await actions.checkQuota(null as any, asUserId('u1'));
      expect(result.allowed).toBe(true);
    });
  });
});
