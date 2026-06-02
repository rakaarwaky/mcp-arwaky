// agent/worker_setup_router.ts
// Worker domain router — settings, dashboard metrics, cleanup, audit logs
// Owns: worker configuration, observability, maintenance, audit trail

import type { SettingKey, SettingValue, Url, MaxAgeHours, UserId, AuditLog, AuditTargetType, PageSize, EntityId } from '../taxonomy';
import type { AgentContainer } from './di_container_registry';
import { asMaxAgeHours, asPageSize, asEntityId } from '../taxonomy';

export class WorkerSetupRouter {
  constructor(private container: AgentContainer) { }

  // ── Settings ──

  async getWorkerSettings() {
    return this.container.workerSettings.getSettings();
  }

  async updateWorkerSettings(updates: Record<SettingKey, SettingValue>) {
    return this.container.workerSettings.updateSettings(updates);
  }

  async registerWorker(_userId: UserId, config: Record<SettingKey, SettingValue>) {
    return this.container.workerSettings.updateSettings(config);
  }

  async updateWorkerConfig(_userId: UserId, _workerId: string, config: Record<SettingKey, SettingValue>) {
    return this.container.workerSettings.updateSettings(config);
  }

  // ── Dashboard ──

  async getDashboardMetrics(userId: UserId) {
    return this.container.dashboardMetrics.getMetrics(userId);
  }

  async getDashboardStats(userId?: UserId) {
    return this.container.dashboardFetch.getStats(userId);
  }

  // ── Cleanup ──

  async runCleanup(maxAgeHours: MaxAgeHours) {
    return this.container.cleanup.runCleanup(maxAgeHours);
  }

  async performSystemCleanup() {
    const emailsRemoved = await this.container.database.cleanupExpiredEmails(asMaxAgeHours(24));
    return { emailsRemoved };
  }

  // ── Audit Logging ──

  async getRecentAuditLogs(limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    return this.container.database.getRecentAuditLogs(limit);
  }

  async getUserAuditLogs(userId: UserId, limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    return this.container.database.getAuditLogsByUserId(userId, limit);
  }

  async getApiKeyAuditLogs(apiKeyId: import('../taxonomy').ApiKeyId, limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    return this.container.database.getAuditLogsByApiKeyId(apiKeyId, limit);
  }

  async getTargetAuditLogs(targetId: EntityId, targetType?: AuditTargetType, limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    return this.container.database.getAuditLogsByTarget(targetId, targetType, limit);
  }
}
