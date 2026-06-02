/**
 * @module contract/dash_stat_protocol
 * @description Protocol interface for dashboard metrics capability.
 * Provides user-scoped metrics and system-wide health queries.
 */

import type { DashboardMetric, UserId, SystemHealth } from '../taxonomy';

export interface IDashboardMetricsProtocol {
  getMetrics(userId: UserId): Promise<DashboardMetric[]>;
  getSystemHealth(): Promise<SystemHealth>;
}
