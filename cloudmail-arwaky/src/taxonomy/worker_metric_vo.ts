// taxonomy/worker_metric_vo.ts
// Worker metric value object for tracking worker performance metrics

import type { Timestamp } from './timestamp_epoch_vo';
import type { SettingKey } from './worker_config_vo';

export type WorkerMetricValue = number & { readonly __brand: 'WorkerMetricValue' };

/**
 * Creates a WorkerMetricValue branded number.
 * Validates non-negative integer.
 */
export function asWorkerMetricValue(n: number): WorkerMetricValue {
  return Math.max(0, Math.floor(n)) as WorkerMetricValue;
}

/**
 * WorkerMetric — immutable value object representing a single metric.
 */
export interface WorkerMetric {
  readonly key: SettingKey;
  readonly value: WorkerMetricValue;
  readonly updatedAt: Timestamp;
}

export const WORKER_METRIC_DOMAIN = 'worker_metric';
