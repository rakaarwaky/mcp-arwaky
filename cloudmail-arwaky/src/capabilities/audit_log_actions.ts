// capabilities/audit_log_actions.ts
// Audit logging capability — records security and operational events

import type { AuditLog, AuditEventType, AuditTargetType } from '../taxonomy/audit_log_entity';
import { newAuditLogId, asTimestamp, maskSecret } from '../taxonomy';
import type { IDatabaseQueryPort, IAppLoggerPort, IMetricsCollectorPort } from '../contract';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

import type { UserId, ApiKeyId, EntityId, IpAddress, UserAgent, CorrelationId } from '../taxonomy';
import { asLogMessage, asEntityId, asLogContext, asServiceName, asAction } from '../taxonomy';

export interface AuditLogInput {
  eventType: AuditEventType;
  userId?: UserId | null;
  apiKeyId?: ApiKeyId | null;
  targetId?: EntityId;
  targetType?: AuditTargetType;
  ipAddress?: IpAddress;
  userAgent?: UserAgent;
  correlationId?: CorrelationId | null;
  metadata?: Record<string, unknown>;
}

/**
 * Capability for tracking and managing security-critical system events.
 * Provides structured logging and persistent audit trails.
 */
export class AuditLogActions {
  constructor(
    private db: IDatabaseQueryPort,
    private logger: IAppLoggerPort,
    private metrics: IMetricsCollectorPort
  ) { }

  /**
   * Records a new audit event in the system.
   * Events are stored in the database persistently and also emitted via structured logging.
   *
   * @param input Detailed event data including type, context, and custom metadata
   */
  async logEvent(input: AuditLogInput): Promise<void> {
    return withMetrics(this.metrics, asServiceName('audit'), asAction('logEvent'), async () => {
      const log: AuditLog = {
        id: newAuditLogId(),
        timestamp: asTimestamp(new Date().toISOString()),
        eventType: input.eventType,
        userId: input.userId || null,
        apiKeyId: input.apiKeyId || null,
        targetId: input.targetId,
        targetType: input.targetType,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        correlationId: input.correlationId || null,
        metadata: input.metadata
      };

      // Store in DB
      try {
        await this.db.createAuditLog(log);
      } catch (err) {
        this.logger.error(asLogMessage('Failed to log audit event'), err, {
          eventType: input.eventType,
          userId: input.userId
        }, asLogContext('audit'));
        // Do not rethrow here to prevent audit failures from breaking application flow
        // but we still record the failure in withMetrics
      }
    });
  }

  /**
   * Retrieves audit logs for a specific user ID.
   * Sensitive identifiers like API keys are masked in the returned list.
   *
   * @param userId The unique user identifier
   * @returns Array of masked audit logs
   */
  async getUserAuditLogs(userId: UserId): Promise<AuditLog[]> {
    return withMetrics(this.metrics, asServiceName('audit'), asAction('getUserAuditLogs'), async () => {
      const logs = await this.db.getAuditLogsByUserId(userId);
      return logs.map(l => this.maskAuditLog(l));
    });
  }

  /**
   * Retrieves audit logs for a specific API key ID.
   * Sensitive identifiers remain masked for security.
   *
   * @param apiKeyId The unique API key identifier
   * @returns Array of masked audit logs
   */
  async getApiKeyAuditLogs(apiKeyId: ApiKeyId): Promise<AuditLog[]> {
    return withMetrics(this.metrics, asServiceName('audit'), asAction('getApiKeyAuditLogs'), async () => {
      const logs = await this.db.getAuditLogsByApiKeyId(apiKeyId);
      return logs.map(l => this.maskAuditLog(l));
    });
  }

  // ── Internal Helpers ──

  /**
   * Masks sensitive IDs within an audit log entry for safe display.
   */
  private maskAuditLog(log: AuditLog): AuditLog {
    return {
      ...log,
      apiKeyId: log.apiKeyId ? (maskSecret(log.apiKeyId) as unknown as ApiKeyId) : null,
      targetId: log.targetType === 'apikey' && log.targetId
        ? (maskSecret(log.targetId) as unknown as EntityId)
        : log.targetId
    };
  }
}
