/**
 * @module contract/dash_stats_io
 * @description IO contract for dashboard statistics queries.
 */

import type { DashboardStatsVO, DashboardMetric, EmailCount, ArchivedCount, Timestamp } from '../taxonomy';

export interface DashboardMetricsInput { 
  userId?: string; 
}

export interface DashboardMetricsOutput { 
  summary: {
    totalEmails: EmailCount;
    archivedEmails: ArchivedCount;
    lastUpdated: Timestamp | string;
  };
  metrics: DashboardMetric[];
  stats: DashboardStatsVO;
}
