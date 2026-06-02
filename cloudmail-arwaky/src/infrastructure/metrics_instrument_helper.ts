// infrastructure/metrics_instrument_helper.ts
// Helper utility for instrumenting capability methods with metrics

import type { IMetricsCollectorPort } from '../contract/metrics_collector_port';
import { tracer } from './telemetry_tracer_adapter';
import { asMetricKey, asMetricNumber, ServiceName, Action, AttributeKey, asAttributeKey, asSpanName } from '../taxonomy';

/**
 * Standardized wrapper for instrumenting async operations with metrics and tracing.
 * Tracks duration, total operations, error counts, and creates OTel-compatible spans.
 * 
 * @param metrics Collector instance to use
 * @param capability Name of the capability (domain)
 * @param method Name of the specific method
 * @param action Async operation to execute
 * @returns Result of the operation
 */
export async function withMetrics<T>(
  metrics: IMetricsCollectorPort | undefined,
  capability: ServiceName,
  method: Action,
  action: () => Promise<T>
): Promise<T> {
  if (!metrics) {
    return action();
  }
  const labels: Record<AttributeKey, string> = { 
    [asAttributeKey('capability')]: String(capability), 
    [asAttributeKey('method')]: String(method) 
  };
  const span = tracer.startSpan(asSpanName(`${capability}.${method}`), labels);
  const start = Date.now();
  try {
    const result = await action();
    const duration = asMetricNumber((Date.now() - start) / 1000);

    metrics.recordHistogram(asMetricKey('operation_duration_seconds'), duration, { ...labels, [asAttributeKey('success')]: 'true' });
    metrics.incrementCounter(asMetricKey('operations_total'), { ...labels, [asAttributeKey('success')]: 'true' });

    span.setAttribute(asAttributeKey('success'), true);
    span.end();

    return result;
  } catch (err) {
    const duration = asMetricNumber((Date.now() - start) / 1000);
    const errorType = err instanceof Error ? err.name : 'UnknownError';

    metrics.recordHistogram(asMetricKey('operation_duration_seconds'), duration, { ...labels, [asAttributeKey('success')]: 'false' });
    metrics.incrementCounter(asMetricKey('operations_total'), { ...labels, [asAttributeKey('success')]: 'false' });
    metrics.incrementCounter(asMetricKey('errors_total'), { ...labels, [asAttributeKey('error_type')]: errorType });

    span.setAttribute(asAttributeKey('success'), false);
    if (err instanceof Error) {
      span.recordException(err);
    }
    span.end();

    throw err;
  }
}

/**
 * Standardized wrapper for instrumenting sync operations with metrics.
 * 
 * @param metrics Collector instance to use
 * @param capability Name of the capability (domain)
 * @param method Name of the specific method
 * @param action Sync operation to execute
 * @returns Result of the operation
 */
export function withMetricsSync<T>(
  metrics: IMetricsCollectorPort | undefined,
  capability: ServiceName,
  method: Action,
  action: () => T
): T {
  if (!metrics) {
    return action();
  }
  const labels: Record<AttributeKey, string> = { 
    [asAttributeKey('capability')]: String(capability), 
    [asAttributeKey('method')]: String(method) 
  };
  const start = Date.now();
  try {
    const result = action();
    const duration = asMetricNumber((Date.now() - start) / 1000);

    metrics.recordHistogram(asMetricKey('operation_duration_seconds'), duration, { ...labels, [asAttributeKey('success')]: 'true' });
    metrics.incrementCounter(asMetricKey('operations_total'), { ...labels, [asAttributeKey('success')]: 'true' });

    return result;
  } catch (err) {
    const duration = asMetricNumber((Date.now() - start) / 1000);
    const errorType = err instanceof Error ? err.name : 'UnknownError';

    metrics.recordHistogram(asMetricKey('operation_duration_seconds'), duration, { ...labels, [asAttributeKey('success')]: 'false' });
    metrics.incrementCounter(asMetricKey('operations_total'), { ...labels, [asAttributeKey('success')]: 'false' });
    metrics.incrementCounter(asMetricKey('errors_total'), { ...labels, [asAttributeKey('error_type')]: errorType });

    throw err;
  }
}
