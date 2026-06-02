// capabilities/quota_management_actions.ts
// Implements IQuotaManagementProtocol — resource quota enforcement per API key/user

import type {
  ApiKeyId, UserId, InboxCount, EmailCount, RequestCount, MaxInboxes,
  QuotaLimits, QuotaUsage, Allowed
} from '../taxonomy';
import { DEFAULT_QUOTA, asMaxInboxes, asInboxCount, asRequestCount, asEmailCount, asAllowed, asServiceName, asAction } from '../taxonomy';
import type { IQuotaManagementProtocol } from '../contract/quota_proto_protocol';
import type { IDatabaseQueryPort, IMetricsCollectorPort } from '../contract';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

/**
 * Manages resource quotas (inboxes, emails) and API request limits.
 * Enforcement is performed by checking current usage against configured limits.
 */
export class QuotaManagementActions implements IQuotaManagementProtocol {
  constructor(
    private db: IDatabaseQueryPort,
    private metrics: IMetricsCollectorPort
  ) { }

  /**
   * Retrieves quota limits for a specific API key or user.
   * 
   * @param _apiKeyId Target API key ID
   * @param _userId Target user ID
   * @returns Configured quota limits
   */
  async getQuotaLimits(
    _apiKeyId: ApiKeyId | null,
    _userId: UserId | null
  ): Promise<QuotaLimits> {
    return withMetrics(this.metrics, asServiceName('quota'), asAction('getQuotaLimits'), async () => {
      // For now, return default quota for all users
      // Future: per-user/per-key limits from worker_settings or DB
      return DEFAULT_QUOTA;
    });
  }

  /**
   * Calculates current resource usage for a user.
   * 
   * @param _apiKeyId Target API key ID (currently unused as usage is aggregated at user level)
   * @param userId Target user ID
   * @returns Current usage statistics
   */
  async getQuotaUsage(
    _apiKeyId: ApiKeyId | null,
    userId: UserId | null
  ): Promise<QuotaUsage> {
    return withMetrics(this.metrics, asServiceName('quota'), asAction('getQuotaUsage'), async () => {
      if (!userId) {
        return {
          currentInboxes: asInboxCount(0),
          currentEmails: asEmailCount(0),
          requestsLastMinute: asRequestCount(0)
        };
      }

      const [currentInboxes, currentEmails, requestsLastMinute] = await Promise.all([
        this.db.getUserInboxCount(userId),
        this.db.getUserEmailCount(userId),
        this.db.getRequestsLastMinute(userId)
      ]);

      return {
        currentInboxes: asInboxCount(currentInboxes),
        currentEmails: asEmailCount(currentEmails),
        requestsLastMinute: asRequestCount(requestsLastMinute)
      };
    });
  }

  /**
   * Checks if an operation is allowed within the current quota.
   * 
   * @param apiKeyId Target API key ID
   * @param userId Target user ID
   * @returns Authorization result and remaining resources
   */
  async checkQuota(
    apiKeyId: ApiKeyId | null,
    userId: UserId | null
  ): Promise<{
    allowed: Allowed;
    remainingInboxes: MaxInboxes;
    currentInboxes: InboxCount;
    currentEmails: EmailCount;
    requestsLastMinute: RequestCount;
  }> {
    return withMetrics(this.metrics, asServiceName('quota'), asAction('checkQuota'), async () => {
      const [limits, usage] = await Promise.all([
        this.getQuotaLimits(apiKeyId, userId),
        this.getQuotaUsage(apiKeyId, userId)
      ]);

      const remainingInboxes = asMaxInboxes(Math.max(0, limits.maxInboxes - usage.currentInboxes));
      const allowed = asAllowed(
        usage.currentInboxes < limits.maxInboxes
        && usage.requestsLastMinute < limits.requestsPerMinute
      );

      return {
        allowed,
        remainingInboxes,
        currentInboxes: usage.currentInboxes,
        currentEmails: usage.currentEmails,
        requestsLastMinute: usage.requestsLastMinute
      };
    });
  }

  /**
   * @deprecated No-op. Inbox count is derived dynamically from users table.
   */
  async incrementInboxCount(
    _apiKeyId: ApiKeyId | null,
    _userId: UserId | null
  ): Promise<void> {
    // Inbox count is derived from users table — no separate counter needed
    // This is a no-op; quota is checked via getUserInboxCount
  }

  /**
   * @deprecated No-op. Email count is derived dynamically from emails table.
   */
  async incrementEmailCount(
    _apiKeyId: ApiKeyId | null,
    _userId: UserId | null
  ): Promise<void> {
    // Email count is derived from emails table — no separate counter needed
    // This is a no-op; quota is checked via getUserEmailCount
  }

  /**
   * @deprecated No-op. Request recording is handled by RateLimitActions.
   */
  async recordApiRequest(
    _apiKeyId: ApiKeyId | null,
    _userId: UserId | null
  ): Promise<void> {
    // No-op: request recording is handled by RateLimitActions.recordRequest()
    // Quota is read-only — it checks resource counts, not request rates
  }
}
