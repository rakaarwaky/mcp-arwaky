// contract/tracer_port.ts
// Interface for distributed tracing (OpenTelemetry compatible)

import type { RecordValue, SpanName, AttributeKey, LogMessage } from '../taxonomy';

export interface ISpan {
  /**
   * Sets an attribute on the span.
   */
  setAttribute(key: AttributeKey, value: RecordValue): ISpan;

  /**
   * Records an exception to the span.
   */
  recordException(error: Error | LogMessage): void;

  /**
   * Ends the span.
   */
  end(): void;
}

export interface ITracerPort {
  /**
   * Starts a new span and makes it active.
   * 
   * @param name Name of the span
   * @param attributes Initial attributes
   * @returns The created span
   */
  startSpan(name: SpanName, attributes?: Record<AttributeKey, RecordValue>): ISpan;
}
