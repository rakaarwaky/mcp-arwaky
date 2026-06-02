// contract/metrics_collector_port.ts
// Port for application metrics collection (Prometheus compatible)

import type { MetricKey, MetricNumber, RawText, AttributeKey } from '../taxonomy';

export type { MetricKey, MetricNumber, RawText } from '../taxonomy';

export interface IMetricsCollectorPort {
  /**
   * Increments a counter by 1.
   * Counters are for values that only increase (e.g. request totals).
   */
  incrementCounter(name: MetricKey, labels?: Record<AttributeKey, string>): void;

  /**
   * Records a value in a histogram.
   * Histograms are for measuring durations or sizes (e.g. request latency).
   */
  recordHistogram(name: MetricKey, value: MetricNumber, labels?: Record<AttributeKey, string>): void;

  /**
   * Returns all collected metrics in Prometheus text format.
   */
  exportPrometheusMetrics(): RawText;

  /**
   * Resets all metrics in memory.
   */
  resetAll(): void;
}
