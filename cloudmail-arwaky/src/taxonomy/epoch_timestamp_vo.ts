// taxonomy/epoch_timestamp_vo.ts
// Branded type for numeric Unix timestamps (milliseconds)

/** Epoch timestamp in milliseconds (from Date.now()) */
export type TimestampEpochMs = number & { readonly __brand: 'TimestampEpochMs' };
export type TimestampMs = number & { readonly __brand: 'TimestampMs' };

export function asTimestampEpochMs(n: number): TimestampEpochMs {
    return Math.max(0, Math.floor(n)) as TimestampEpochMs;
}

export function asTimestampMs(n: number): TimestampMs {
    return Math.max(0, Math.floor(n)) as TimestampMs;
}
