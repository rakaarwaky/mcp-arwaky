// taxonomy/resilience_retry_vo.ts
// Branded types for operation retry logic

/** Number of retry attempts */
export type RetryCount = number & { readonly __brand: 'RetryCount' };

/** Exponential backoff factor */
export type RetryFactor = number & { readonly __brand: 'RetryFactor' };

export function asRetryCount(n: number): RetryCount {
    return Math.max(0, Math.floor(n)) as RetryCount;
}

export function asRetryFactor(n: number): RetryFactor {
    return Math.max(1, n) as RetryFactor;
}
