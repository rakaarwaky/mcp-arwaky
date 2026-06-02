// taxonomy/duration_vo.ts
// Time duration and interval value objects with validation

export type TimeoutSeconds = number & { readonly __brand: 'TimeoutSeconds' };
export type PollIntervalSeconds = number & { readonly __brand: 'PollIntervalSeconds' };
export type SessionMaxAge = number & { readonly __brand: 'SessionMaxAge' };
export type MaxAgeHours = number & { readonly __brand: 'MaxAgeHours' };
export type WindowSeconds = number & { readonly __brand: 'WindowSeconds' };
export type TimeoutMs = number & { readonly __brand: 'TimeoutMs' };
export type TtlSeconds = number & { readonly __brand: 'TtlSeconds' };
export type CacheTtlSeconds = number & { readonly __brand: 'CacheTtlSeconds' };


/** Milliseconds per hour (constant) */
export type MsPerHour = number & { readonly __brand: 'MsPerHour' };

/** Latency in milliseconds (non-negative integer) */
export type LatencyMs = number & { readonly __brand: 'LatencyMs' };

/** Sleep duration in milliseconds (non-negative integer) */
export type SleepMs = number & { readonly __brand: 'SleepMs' };

/**
 * Alias for TimeoutSeconds - used in rate limiting context.
 * Semantically identical to TimeoutSeconds.
 */
export type RetryAfterSeconds = TimeoutSeconds;
export const asRetryAfterSeconds = asTimeoutSeconds;

/**
 * Validates timeout in seconds (must be non-negative integer)
 */
export function asTimeoutSeconds(n: number): TimeoutSeconds {
  return Math.max(0, Math.floor(n)) as TimeoutSeconds;
}

/**
 * Validates poll interval in seconds (must be non-negative integer)
 */
export function asPollIntervalSeconds(n: number): PollIntervalSeconds {
  return Math.max(0, Math.floor(n)) as PollIntervalSeconds;
}

/**
 * Validates session max age in seconds (must be non-negative integer)
 */
export function asSessionMaxAge(n: number): SessionMaxAge {
  return Math.max(0, Math.floor(n)) as SessionMaxAge;
}

/**
 * Validates max age in hours (must be non-negative integer)
 */
export function asMaxAgeHours(n: number): MaxAgeHours {
  return Math.max(0, Math.floor(n)) as MaxAgeHours;
}

/** Validates time window in seconds (must be non-negative integer) */
export function asWindowSeconds(n: number): WindowSeconds {
  return Math.max(0, Math.floor(n)) as WindowSeconds;
}

/** Validates timeout in milliseconds (must be non-negative integer) */
export function asTimeoutMs(n: number): TimeoutMs {
  return Math.max(0, Math.floor(n)) as TimeoutMs;
}

/** Validates TTL in seconds (must be non-negative integer) */
export function asTtlSeconds(n: number): TtlSeconds {
  return Math.max(0, Math.floor(n)) as TtlSeconds;
}

/** Validates cache TTL in seconds (must be non-negative integer) */
export function asCacheTtlSeconds(seconds: number): CacheTtlSeconds {
  return Math.max(0, Math.floor(seconds)) as CacheTtlSeconds;
}


export function asMsPerHour(n: number): MsPerHour {
  return Math.max(0, Math.floor(n)) as MsPerHour;
}

export function asLatencyMs(n: number): LatencyMs {
  return Math.max(0, Math.floor(n)) as LatencyMs;
}

export function asSleepMs(n: number): SleepMs {
  return Math.max(0, Math.floor(n)) as SleepMs;
}

// --- Time Constants ---
export const MS_PER_MINUTE = 60 * 1000;
export const MS_PER_SECOND = 1000;
export const MS_PER_HOUR: MsPerHour = asMsPerHour(3_600_000);


export const DEFAULT_SESSION_MAX_AGE_SECONDS = 3600 * 24 * 7; // 7 days

// --- General Timeouts & Sleep ---
export const SHORT_SLEEP_MS = 500;
export const MEDIUM_SLEEP_MS = 2000;
export const LONG_SLEEP_MS = 5000;

// --- OpenRouter Automation Constants ---
export const OPENROUTER_INIT_SLEEP_MS = 2000 as SleepMs;
export const OPENROUTER_OTP_WAIT_MS = 30000 as TimeoutMs;
export const OPENROUTER_REDIRECTION_SLEEP_MS = 5000 as SleepMs;
export const OPENROUTER_MODAL_SLEEP_MS = 1500 as SleepMs;
export const OPENROUTER_FORM_SLEEP_MS = 1000 as SleepMs;
export const DEFAULT_SELECTOR_TIMEOUT_MS = 10000 as TimeoutMs;
