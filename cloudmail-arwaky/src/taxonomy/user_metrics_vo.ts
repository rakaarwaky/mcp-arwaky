// taxonomy/user_metrics_vo.ts
// UserMetrics — flat metric object for E2E tests and dashboard

/**
 * High-level user metrics for dashboard display.
 * Expected by E2E lifecycle tests.
 */
export interface UserMetrics {
  totalInboxes: number;
  totalEmails: number;
  archivedCount: number;
  usagePercent: number;
}
