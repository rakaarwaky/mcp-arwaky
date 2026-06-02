// taxonomy/dashboard_stats_vo.ts
// DashboardStatsVO — value object for dashboard metrics

import type { EmailCount, Count, RequestCount } from './counter_value_vo';
import type { InboxCount } from './quota_limit_vo';
import type { HealthStatus } from './health_status_vo';
import type { Timestamp } from './timestamp_epoch_vo';

export interface DashboardStatsVO {
  readonly totalUsers: Count;
  readonly inboxCount: InboxCount;
  readonly emailCount: EmailCount;
  readonly apiKeysActive: Count;
  readonly pendingAccounts: Count;
  readonly linkedAccounts: Count;
  readonly unreadEmails: EmailCount;
  readonly starredEmails: EmailCount;
  readonly totalEmails: EmailCount;
  readonly archivedEmails: EmailCount;
  readonly apiUsage: RequestCount;
  readonly systemHealthy: HealthStatus;
  readonly lastUpdated: Timestamp;
}
