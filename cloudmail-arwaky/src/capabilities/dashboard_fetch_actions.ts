// capabilities/dashboard_fetch_actions.ts
// Implements IDashboardProtocol — gather system metrics

import type { UserId, DashboardStatsVO } from '../taxonomy';
import { asServiceName, asAction } from '../taxonomy';
import type { IDashboardProtocol, IDatabaseQueryPort, IMetricsCollectorPort } from '../contract';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

export class DashboardFetchActions implements IDashboardProtocol {
  constructor(
    private db: IDatabaseQueryPort,
    private metrics: IMetricsCollectorPort
  ) { }

  async getStats(userId?: UserId): Promise<DashboardStatsVO> {
    return withMetrics(this.metrics, asServiceName('dashboard'), asAction('getStats'), () =>
      this.db.getDashboardStats(userId)
    );
  }
}
