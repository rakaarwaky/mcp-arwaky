// capabilities/inbox_cleanup_actions.ts
// Implements ICleanupMaintainPort — scheduled cleanup of expired data

import type { CleanupResult, MaxAgeHours, CleanupCount } from '../taxonomy';
import type { ICleanupProtocol } from '../contract';
import type { IDatabaseQueryPort, IMetricsCollectorPort } from '../contract';
import { asCleanupCount, nowTimestamp, asServiceName, asAction } from '../taxonomy';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

/**
 * Performs periodic cleanup of expired resource data (emails and sessions).
 */
export class InboxCleanupActions implements ICleanupProtocol {
  constructor(
    private db: IDatabaseQueryPort,
    private metrics: IMetricsCollectorPort
  ) { }

  /**
   * Runs the full cleanup suite.
   * 
   * @param maxAgeHours Maximum age for emails before they are eligible for deletion
   * @returns Cleanup results
   */
  async runCleanup(maxAgeHours: MaxAgeHours): Promise<CleanupResult> {
    return withMetrics(this.metrics, asServiceName('cleanup'), asAction('runCleanup'), async () => {
      const [expiredEmails, expiredSessions] = await Promise.all([
        this.cleanupExpiredEmails(maxAgeHours),
        this.cleanupExpiredSessions()
      ]);

      return {
        expiredEmails: asCleanupCount(expiredEmails),
        expiredSessions: asCleanupCount(expiredSessions),
        ranAt: nowTimestamp()
      };
    });
  }

  /**
   * Deletes emails older than the specified threshold.
   * 
   * @param maxAgeHours Age threshold
   * @returns Number of emails deleted
   */
  async cleanupExpiredEmails(maxAgeHours: MaxAgeHours): Promise<CleanupCount> {
    return withMetrics(this.metrics, asServiceName('cleanup'), asAction('cleanupExpiredEmails'), async () => {
      return asCleanupCount(await this.db.cleanupExpiredEmails(maxAgeHours));
    });
  }

  /**
   * Deletes all expired authentication sessions.
   * 
   * @returns Number of sessions deleted
   */
  async cleanupExpiredSessions(): Promise<CleanupCount> {
    return withMetrics(this.metrics, asServiceName('cleanup'), asAction('cleanupExpiredSessions'), async () => {
      return asCleanupCount(await this.db.deleteExpiredSessions());
    });
  }

}
