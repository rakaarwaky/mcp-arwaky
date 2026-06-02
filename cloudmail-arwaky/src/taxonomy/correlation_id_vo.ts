// taxonomy/correlation_id_vo.ts
// Branded correlation/trace ID for request tracking

export type CorrelationId = string & { readonly __brand: 'CorrelationId' };

export function asCorrelationId(s: string): CorrelationId {
  if (!s || s.trim().length === 0) {
    throw new Error('Correlation ID cannot be empty');
  }
  return s as CorrelationId;
}

export function newCorrelationId(): CorrelationId {
  // UUID v4 for traceability
  return crypto.randomUUID() as CorrelationId;
}
