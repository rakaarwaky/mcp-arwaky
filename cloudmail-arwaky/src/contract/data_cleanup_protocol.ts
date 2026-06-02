// contract/data_cleanup_protocol.ts
// Protocol for scheduled cleanup/maintenance operations — business capability

import type { CleanupResult, MaxAgeHours, CleanupCount } from '../taxonomy';

export interface ICleanupProtocol {
  /**
   * Run full cleanup cycle:
   * 1. Soft-delete emails older than maxAgeHours
   * 2. Purge expired login sessions
   */
  runCleanup(maxAgeHours: MaxAgeHours): Promise<CleanupResult>;

  /** Soft-delete emails older than maxAgeHours (set deleted_at) */
  cleanupExpiredEmails(maxAgeHours: MaxAgeHours): Promise<CleanupCount>;

  /** Delete expired login sessions */
  cleanupExpiredSessions(): Promise<CleanupCount>;

}
