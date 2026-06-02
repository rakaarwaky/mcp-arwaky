import type {
  GlobalStats, DashboardMetric, UserId, MetricStatus, ApiKeyId,
  InboxCount, EmailCount, RequestCount, QuotaStatus,
  SettingKey, SettingValue, WorkerSettings,
  AuditLog, AuditEventType, AuditTargetType,
  AuditLogId, EntityId, IpAddress, UserAgent, CorrelationId, PageSize,
  DashboardStatsVO, Count, Timestamp, ArchivedCount, Email
} from '../taxonomy';
import {
  asCount, asMetricKey, asMetricLabel, asMetricValue, asMetricStatus,
  asInboxCount, asEmailCount, asRequestCount,
  asSettingKey, asSettingValue, asTimestamp,
  asUserId, asApiKeyId,
  asAuditLogId, asEntityId, asIpAddress, asUserAgent, asCorrelationId, asPageSize,
  asHealthStatus, asArchivedCount
} from '../taxonomy';
import type { IDatabaseQueryPort } from '../contract';

export class D1UtilityModule {
  constructor(private db: D1Database, private adapter: IDatabaseQueryPort) { }

  async getGlobalStats(): Promise<GlobalStats> {
    const counts = await this.db.prepare(`
      SELECT 
        (SELECT count(*) FROM users) as user_count,
        (SELECT count(*) FROM accounts) as inbox_count,
        (SELECT count(*) FROM emails) as email_count
    `).first<Record<string, number>>();

    return {
      totalUsers: asCount(counts?.user_count ?? 0),
      totalInboxes: asCount(counts?.inbox_count ?? 0),
      totalEmails: asCount(counts?.email_count ?? 0)
    };
  }

  async getDashboardMetrics(userId: UserId): Promise<DashboardMetric[]> {
    const stats = await this.getDashboardStats(userId);

    return [
      { key: asMetricKey('total_users'), label: asMetricLabel('Total Users'), value: asMetricValue(String(stats.totalUsers)), status: asMetricStatus('ok') },
      { key: asMetricKey('inboxes'), label: asMetricLabel('Total Inboxes'), value: asMetricValue(String(stats.inboxCount)), status: asMetricStatus('ok') },
      { key: asMetricKey('api_usage'), label: asMetricLabel('API Usage (24h)'), value: asMetricValue(String(stats.apiUsage)), status: asMetricStatus('ok') },
      { key: asMetricKey('active_keys'), label: asMetricLabel('Active API Keys'), value: asMetricValue(String(stats.apiKeysActive)), status: asMetricStatus('ok') },
      { key: asMetricKey('pending_accounts'), label: asMetricLabel('Pending Accounts'), value: asMetricValue(String(stats.pendingAccounts)), status: asMetricStatus(Number(stats.pendingAccounts) > 0 ? 'warning' : 'ok') },
      { key: asMetricKey('unread'), label: asMetricLabel('Unread Emails'), value: asMetricValue(String(stats.unreadEmails)), status: asMetricStatus(Number(stats.unreadEmails) > 0 ? 'warning' : 'ok') },
      { key: asMetricKey('emails'), label: asMetricLabel('Total Emails'), value: asMetricValue(String(stats.totalEmails)), status: asMetricStatus('ok') },
      { key: asMetricKey('archived'), label: asMetricLabel('Archived Emails'), value: asMetricValue(String(stats.archivedEmails)), status: asMetricStatus('ok') },
    ];
  }

  async getDashboardStats(_userId?: UserId): Promise<DashboardStatsVO> {
    const counts = await this.getBatchGlobalCounts();

    return {
      totalUsers: asCount(counts.user_count),
      inboxCount: asInboxCount(counts.inbox_count),
      emailCount: asEmailCount(counts.emails),
      apiKeysActive: asCount(counts.api_keys),
      pendingAccounts: asCount(counts.pending_accounts),
      linkedAccounts: asCount(counts.linked_accounts),
      unreadEmails: asEmailCount(counts.unread_emails),
      starredEmails: asEmailCount(counts.starred_emails),
      totalEmails: asEmailCount(counts.total_emails),
      archivedEmails: asEmailCount(counts.archived_emails),
      apiUsage: asRequestCount(counts.api_usage),
      systemHealthy: asHealthStatus('healthy'),
      lastUpdated: asTimestamp(new Date().toISOString())
    };
  }

  private async getBatchGlobalCounts(): Promise<any> {
    // Optimization: Batch all dashboard counts into a single query
    const row = await this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM accounts) as inbox_count,
        (SELECT COUNT(*) FROM emails WHERE deleted_at IS NULL) as emails,
        (SELECT COUNT(*) FROM api_keys WHERE revoked_at IS NULL) as api_keys,
        (SELECT COUNT(*) FROM accounts WHERE status IN ('created', 'pending', 'verifying', 'verified')) as pending_accounts,
        (SELECT COUNT(*) FROM accounts WHERE status = 'key_extracted') as linked_accounts,
        (SELECT COUNT(*) FROM emails WHERE status = 'unread' AND deleted_at IS NULL) as unread_emails,
        (SELECT COUNT(*) FROM emails WHERE is_starred = 1 AND deleted_at IS NULL) as starred_emails,
        (SELECT COUNT(*) FROM emails WHERE status = 'archived' AND deleted_at IS NULL) as archived_emails,
        (SELECT COUNT(*) FROM rate_limits WHERE created_at >= datetime('now', '-1 day')) as api_usage
    `).first<Record<string, number>>();

    return {
      user_count: row?.user_count || 0,
      inbox_count: row?.inbox_count || 0,
      emails: row?.emails || 0,
      api_keys: row?.api_keys || 0,
      pending_accounts: row?.pending_accounts || 0,
      linked_accounts: row?.linked_accounts || 0,
      unread_emails: row?.unread_emails || 0,
      starred_emails: row?.starred_emails || 0,
      archived_emails: row?.archived_emails || 0,
      total_emails: row?.emails || 0,
      api_usage: row?.api_usage || 0
    };
  }

  async getUserInboxCount(userId: UserId): Promise<InboxCount> {
    const row = await this.db.prepare(
      'SELECT COUNT(*) AS count FROM users WHERE id = ?'
    ).bind(userId).first<Record<string, number>>();
    return asInboxCount(Number(row?.count ?? 0));
  }

  async getUserEmailCount(userId: UserId): Promise<EmailCount> {
    const row = await this.db.prepare(
      'SELECT COUNT(*) AS count FROM emails WHERE inbox_id = ? AND deleted_at IS NULL'
    ).bind(userId).first<Record<string, number>>();
    return asEmailCount(Number(row?.count ?? 0));
  }

  async getRequestsLastMinute(userId: UserId): Promise<RequestCount> {
    const row = await this.db.prepare(`
      SELECT COUNT(*) AS count FROM rate_limits
      WHERE user_id = ? AND created_at >= datetime('now', '-1 minute')
    `).bind(userId).first<Record<string, number>>();
    return asRequestCount(Number(row?.count ?? 0));
  }

  async getQuotaStatus(userId: UserId): Promise<QuotaStatus | null> {
    const emailCount = await this.getUserEmailCount(userId);
    const limit = 1000; // Default limit
    return {
      usagePercent: (Number(emailCount) / limit) * 100,
      limit,
      current: Number(emailCount)
    };
  }

  // --- Settings ---
  async getWorkerSettings(): Promise<WorkerSettings[]> {
    const { results } = await this.db.prepare(
      'SELECT key, value, updated_at FROM worker_settings'
    ).all<Record<string, string>>();
    return (results ?? []).map(row => ({
      key: asSettingKey(row.key!),
      value: row.value ? asSettingValue(row.value) : null,
      updatedAt: asTimestamp(row.updated_at!)
    }));
  }

  async setWorkerSetting(key: SettingKey, value: SettingValue): Promise<void> {
    await this.db.prepare(`
      INSERT INTO worker_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).bind(key, value).run();
  }

  // --- Audit Logging ---

  async createAuditLog(log: AuditLog): Promise<void> {
    const metadataJson = log.metadata ? JSON.stringify(log.metadata) : null;
    await this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, event_type, user_id, api_key_id, target_id, target_type, ip_address, user_agent, correlation_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      log.id,
      log.timestamp,
      log.eventType as string,
      log.userId ?? null,
      log.apiKeyId ?? null,
      log.targetId ?? null,
      log.targetType ?? null,
      log.ipAddress ?? null,
      log.userAgent ?? null,
      log.correlationId ?? null,
      metadataJson
    ).run();
  }

  async getAuditLogsByUserId(userId: UserId, limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    const { results } = await this.db.prepare(`
      SELECT id, timestamp, event_type, user_id, api_key_id, target_id, target_type, ip_address, user_agent, correlation_id, metadata
      FROM audit_logs
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(userId, limit).all<Record<string, unknown>>();
    return (results ?? []).map(row => this.mapAuditLog(row));
  }

  async getAuditLogsByApiKeyId(apiKeyId: ApiKeyId, limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    const { results } = await this.db.prepare(`
      SELECT id, timestamp, event_type, user_id, api_key_id, target_id, target_type, ip_address, user_agent, correlation_id, metadata
      FROM audit_logs
      WHERE api_key_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(apiKeyId, limit).all<Record<string, unknown>>();
    return (results ?? []).map(row => this.mapAuditLog(row));
  }

  async getAuditLogsByTarget(targetId: string, targetType?: AuditTargetType, limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    let query = `
      SELECT id, timestamp, event_type, user_id, api_key_id, target_id, target_type, ip_address, user_agent, correlation_id, metadata
      FROM audit_logs
      WHERE target_id = ?
    `;
    const params: unknown[] = [targetId];
    if (targetType) {
      query += ' AND target_type = ?';
      params.push(targetType as string);
    }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    const { results } = await this.db.prepare(query).bind(...params).all<Record<string, unknown>>();
    return (results ?? []).map(row => this.mapAuditLog(row));
  }

  async getRecentAuditLogs(limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    const { results } = await this.db.prepare(`
      SELECT id, timestamp, event_type, user_id, api_key_id, target_id, target_type, ip_address, user_agent, correlation_id, metadata
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(limit).all<Record<string, unknown>>();
    return (results ?? []).map(row => this.mapAuditLog(row));
  }

  async healthCheck(): Promise<void> {
    await this.db.prepare('SELECT 1').run();
  }

  private mapAuditLog(row: Record<string, unknown>): AuditLog {
    let metadata: Record<string, unknown> | undefined;
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      } catch {
        metadata = undefined;
      }
    }
    return {
      id: asAuditLogId(String(row.id)),
      timestamp: asTimestamp(String(row.timestamp ?? '')),
      eventType: row.event_type as AuditEventType,
      userId: row.user_id ? asUserId(String(row.user_id)) : null,
      apiKeyId: row.api_key_id ? asApiKeyId(String(row.api_key_id)) : null,
      targetId: row.target_id ? asEntityId(String(row.target_id)) : undefined,
      targetType: row.target_type ? (row.target_type as AuditTargetType) : undefined,
      ipAddress: row.ip_address ? asIpAddress(String(row.ip_address)) : undefined,
      userAgent: row.user_agent ? asUserAgent(String(row.user_agent)) : undefined,
      correlationId: row.correlation_id ? asCorrelationId(String(row.correlation_id)) : null,
      metadata
    };
  }

  async getUserArchivedCount(userId: UserId): Promise<ArchivedCount> {
    const result = await this.db.prepare("SELECT COUNT(*) AS count FROM emails WHERE inbox_id = ? AND status = 'archived' AND deleted_at IS NULL").bind(userId).first<Record<string, number>>();
    return asArchivedCount(result?.count ?? 0);
  }

  async getAllEmails(): Promise<Email[]> {
    const { results } = await this.db.prepare('SELECT * FROM emails WHERE deleted_at IS NULL ORDER BY received_at DESC').all<Email>();
    return results || [];
  }

  async getAllArchivedCount(): Promise<ArchivedCount> {
    const result = await this.db.prepare("SELECT COUNT(*) AS count FROM emails WHERE status = 'archived' AND deleted_at IS NULL").first<Record<string, number>>();
    return asArchivedCount(result?.count ?? 0);
  }
}
