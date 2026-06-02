// infrastructure/telemetry_tracer_adapter.ts
// Performance tracing — OpenTelemetry-lite implementation for Workers/CLI

import type { ITracerPort, ISpan } from '../contract';
import type { RecordValue, SpanName, AttributeKey, LogMessage } from '../taxonomy';
import { asLogMessage, asAttributeKey } from '../taxonomy';
import { structuredLogger } from './structured_logger_util';

/**
 * Functional Tracer that logs spans to console in structured format.
 * Bridging to @opentelemetry/api would happen here in full Node.js environments.
 */
export class TracerAdapter implements ITracerPort {
  startSpan(name: SpanName, attributes: Record<AttributeKey, RecordValue> = {}): ISpan {
    return new StructuredSpan(name, attributes);
  }
}

class StructuredSpan implements ISpan {
  private startTime: number;

  constructor(private name: SpanName, private attrs: Record<AttributeKey, RecordValue>) {
    this.startTime = Date.now();
    // Unique trace ID for request correlation (short-lived)
    if (!this.attrs[asAttributeKey('trace.id')]) {
      this.attrs[asAttributeKey('trace.id')] = Math.random().toString(36).substring(2, 10);
    }
  }

  setAttribute(key: AttributeKey, value: RecordValue): ISpan {
    this.attrs[key] = value;
    return this;
  }

  end(): void {
    const duration = Date.now() - this.startTime;
    structuredLogger.info(asLogMessage('[TELEMETRY] span_end'), {
      name: this.name,
      duration_ms: duration,
      ...this.attrs
    });
  }

  recordException(error: Error | LogMessage): void {
    const message = error instanceof Error ? error.message : error;
    this.attrs[asAttributeKey('exception.message')] = message;
    this.attrs[asAttributeKey('status')] = 'error';
    if (error instanceof Error && error.stack) {
      this.attrs[asAttributeKey('exception.stacktrace')] = error.stack;
    }
  }
}

export const tracer = new TracerAdapter();

