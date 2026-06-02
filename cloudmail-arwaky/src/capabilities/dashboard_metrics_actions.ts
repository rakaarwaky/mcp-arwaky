// capabilities/dashboard_metrics_actions.ts
// Implements IDashboardMetricsProtocol — gather system metrics

import type { DashboardMetric, UserId, SystemHealth } from '../taxonomy';
import { HEALTHY, asHealthStatus, asServiceName, asAction } from '../taxonomy';
import type { IDashboardMetricsProtocol, IDatabaseQueryPort, IMetricsCollectorPort } from '../contract';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

export class DashboardMetricsActions implements IDashboardMetricsProtocol {
  constructor(
    private db: IDatabaseQueryPort,
    private metrics: IMetricsCollectorPort
  ) { }

  async getMetrics(userId: UserId): Promise<DashboardMetric[]> {
    return withMetrics(this.metrics, asServiceName('dashboard_metrics'), asAction('getMetrics'), () =>
      this.db.getDashboardMetrics(userId)
    );
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return withMetrics(this.metrics, asServiceName('dashboard_metrics'), asAction('getSystemHealth'), async () => {
      const start = Date.now();
      let dbStatus = HEALTHY;
      let dbLatency = 0;

      try {
        await this.db.healthCheck();
        dbLatency = Date.now() - start;
      } catch (err) {
        dbStatus = asHealthStatus('unhealthy');
      }

      return {
        status: dbStatus,
        components: [
          { name: 'Database', status: dbStatus, latencyMs: dbLatency }
        ]
      };
    });
  }
}
