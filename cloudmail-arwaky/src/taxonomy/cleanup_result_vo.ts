// taxonomy/cleanup_result_vo.ts
// Cleanup operation results for scheduled maintenance

import type { Timestamp } from './timestamp_epoch_vo';

/** Number of rows affected by cleanup */
export type CleanupCount = number & { readonly __brand: 'CleanupCount' };

export function asCleanupCount(n: number): CleanupCount {
  return Math.max(0, Math.floor(n)) as CleanupCount;
}

export interface CleanupResult {
  /** Emails soft-deleted (>24h old) */
  expiredEmails: CleanupCount;
  /** Login sessions purged (expired) */
  expiredSessions: CleanupCount;
  /** Timestamp of cleanup run */
  ranAt: Timestamp;
}
