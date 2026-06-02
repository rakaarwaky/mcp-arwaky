// taxonomy/dashboard_metrics_vo.ts
// DashboardMetrics — immutable metric display for dashboard

export type MetricStatus = 'ok' | 'warning' | 'critical';
export type MetricKey = string & { readonly __brand: 'MetricKey' };
export type MetricLabel = string & { readonly __brand: 'MetricLabel' };
export type MetricValue = string & { readonly __brand: 'MetricValue' };
export type MetricDelta = string & { readonly __brand: 'MetricDelta' };
export type MetricNumber = number & { readonly __brand: 'MetricNumber' };

export function asMetricKey(s: string): MetricKey { return s as MetricKey; }
export function asMetricLabel(s: string): MetricLabel { return s as MetricLabel; }
export function asMetricValue(s: string): MetricValue { return s as MetricValue; }
export function asMetricDelta(s: string): MetricDelta { return s as MetricDelta; }
export function asMetricNumber(n: number): MetricNumber { return n as MetricNumber; }
export function asMetricStatus(s: string): MetricStatus {
  if (['ok', 'warning', 'critical'].includes(s)) return s as MetricStatus;
  return 'ok';
}

export interface DashboardMetric {
  readonly key: MetricKey;
  readonly label: MetricLabel;
  readonly value: MetricValue;
  readonly delta?: MetricDelta;
  readonly status: MetricStatus;
}

export interface DashboardMetrics {
  readonly metrics: DashboardMetric[];
}

export interface GlobalStats {
  totalUsers: import('./counter_value_vo').Count;
  totalInboxes: import('./counter_value_vo').Count;
  totalEmails: import('./counter_value_vo').Count;
}

export interface SystemHealth {
  readonly status: import('./health_status_vo').HealthStatus;
  readonly components: {
    readonly name: string;
    readonly status: import('./health_status_vo').HealthStatus;
    readonly latencyMs?: number;
    readonly message?: string;
  }[];
}
