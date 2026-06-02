// contract/dash_stats_protocol.ts
/**
 * @module contract/dash_stats_protocol
 * @description Protocol interface for dashboard metrics capability.
 */

import type { UserId, DashboardStatsVO, DashboardMetric, SystemHealth } from '../taxonomy';

export interface IDashboardMetricsProtocol {
  getMetrics(userId: UserId): Promise<DashboardMetric[]>;
  getSystemHealth(): Promise<SystemHealth>;
}

export interface IDashboardStatsProtocol {
  getStats(userId?: UserId): Promise<DashboardStatsVO>;
}

/** Legacy alias if needed */
export type IDashboardProtocol = IDashboardStatsProtocol;
