// infrastructure/telemetry_tracer_helper.ts
// Helper for wrapping methods with distributed tracing

import type { ITracerPort } from '../contract';
import type { RecordValue, SpanName, AttributeKey, LogMessage } from '../taxonomy';
import { asLogMessage } from '../taxonomy';

/**
 * Executes a function within a tracing span.
 * 
 * @param tracer Tracer implementation
 * @param spanName Name of the span
 * @param attributes Initial attributes
 * @param fn Function to execute
 */
export async function withTracing<T>(
  tracer: ITracerPort,
  spanName: SpanName,
  attributes: Record<AttributeKey, RecordValue>,
  fn: () => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(spanName, attributes);
  try {
    const result = await fn();
    return result;
  } catch (error) {
    span.recordException(error instanceof Error ? error : asLogMessage(String(error)));
    throw error;
  } finally {
    span.end();
  }
}
