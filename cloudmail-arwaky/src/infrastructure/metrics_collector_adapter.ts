// infrastructure/metrics_collector_adapter.ts
// In-memory Prometheus metrics collector implementation

import type { IMetricsCollectorPort, MetricKey, MetricNumber, RawText } from '../contract/metrics_collector_port';
import { AttributeKey, asLogMessage } from '../taxonomy';
import { structuredLogger } from './structured_logger_util';

export class MetricsCollectorAdapter implements IMetricsCollectorPort {
  private counters: Map<MetricKey, Map<string, number>> = new Map();
  private histograms: Map<MetricKey, Map<string, number[]>> = new Map();

  incrementCounter(name: MetricKey, labels: Record<AttributeKey, string> = {}): void {
    const labelKey = this.serializeLabels(labels);
    if (!this.counters.has(name)) {
      this.counters.set(name, new Map());
    }
    const bucket = this.counters.get(name)!;
    const newVal = (bucket.get(labelKey) || 0) + 1;
    bucket.set(labelKey, newVal);

    structuredLogger.info(asLogMessage('[METRIC] counter'), { name, labels, value: newVal });
  }

  recordHistogram(name: MetricKey, value: MetricNumber, labels: Record<AttributeKey, string> = {}): void {
    const labelKey = this.serializeLabels(labels);
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Map());
    }
    const bucket = this.histograms.get(name)!;
    if (!bucket.has(labelKey)) {
      bucket.set(labelKey, []);
    }
    bucket.get(labelKey)!.push(value);

    structuredLogger.info(asLogMessage('[METRIC] histogram'), { name, labels, value });
  }

  exportPrometheusMetrics(): RawText {
    let output = '';

    // Export Counters
    for (const [name, labelsMap] of this.counters) {
      output += `# HELP ${name} Total count\n`;
      output += `# TYPE ${name} counter\n`;
      for (const [labels, value] of labelsMap) {
        output += `${name}${labels} ${value}\n`;
      }
    }

    // Export Histograms (Simple version: sum and count)
    for (const [name, labelsMap] of this.histograms) {
      output += `# HELP ${name} Histogram duration/size\n`;
      output += `# TYPE ${name} histogram\n`;
      for (const [labels, values] of labelsMap) {
        const sum = values.reduce((a, b) => a + b, 0);
        const count = values.length;
        output += `${name}_sum${labels} ${sum}\n`;
        output += `${name}_count${labels} ${count}\n`;

        // Basic bucket for 'inf'
        output += `${name}_bucket{le="+Inf",${labels.slice(1)} ${count}\n`;
      }
    }

    return output as RawText;
  }

  resetAll(): void {
    this.counters.clear();
    this.histograms.clear();
  }

  private serializeLabels(labels: Record<AttributeKey, string>): string {
    if (Object.keys(labels).length === 0) return '';
    const parts = Object.entries(labels).map(([k, v]) => `${k}="${v}"`);
    return `{${parts.join(',')}}`;
  }
}
