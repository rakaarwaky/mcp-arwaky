// taxonomy/telemetry_record_vo.ts
// Value types for telemetry/tracing record attributes

/**
 * RecordValue - union type for telemetry attribute values
 * Supports common OpenTelemetry attribute value types
 */
export type RecordValue = string | number | boolean | undefined;

export function asRecordValue(value: unknown): RecordValue {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === undefined) {
        return value as RecordValue;
    }
    // Convert other types to string as fallback
    return String(value);
}

/** Audit metadata record */
export type AuditMetadata = Record<string, unknown> & { readonly __brand: 'AuditMetadata' };

export function asAuditMetadata(r: Record<string, unknown>): AuditMetadata {
    return r as AuditMetadata;
}