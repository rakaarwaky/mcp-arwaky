/**
 * @module contract/cleanup_task_io
 * @description IO contract for system cleanup operations.
 * Defines input parameters and output shape for expired data purge tasks.
 * Used by: InboxCleanupActions (capability), api_cleanup_entry (surface).
 */

import type { MaxAgeHours, CleanupCount, Timestamp } from '../taxonomy';

export interface CleanupInput { maxAgeHours: MaxAgeHours; }
export interface CleanupOutput { expiredEmails: CleanupCount; expiredSessions: CleanupCount; ranAt: Timestamp; }
