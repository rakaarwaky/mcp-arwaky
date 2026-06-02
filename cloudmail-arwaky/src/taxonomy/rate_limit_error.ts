// taxonomy/rate_limit_error.ts
// Rate limit exceeded error (429)

import type { ErrorCode, HttpStatusCode } from './error_code_vo';
import type { RetryAfterSeconds } from './time_duration_vo';
import { asRetryAfterSeconds } from './time_duration_vo';
import { DomainError } from './domain_base_error';

// Re-export for backward compatibility
export { RetryAfterSeconds, asRetryAfterSeconds };

/**
 * Error thrown when rate limit is exceeded.
 * Extends DomainError with code 'RATE_LIMITED' and HTTP 429 status.
 * Includes retry-after seconds for client backoff.
 *
 * @example
 *   throw new RateLimitError(asRetryAfterSeconds(60));
 *   // { error: 'RATE_LIMITED', message: 'Rate limited. Retry after 60s', retryAfter: 60 }
 */
export class RateLimitError extends DomainError {
  public readonly code: ErrorCode = 'RATE_LIMITED';
  public readonly statusCode: HttpStatusCode = 429;

  /**
   * Seconds after which the client should retry.
   * Used by clients to implement exponential backoff.
   */
  public readonly retryAfterSeconds: RetryAfterSeconds;

  /**
   * Creates a RateLimitError.
   *
   * @param retryAfterSeconds - Seconds to wait before retrying
   */
  constructor(retryAfterSeconds: RetryAfterSeconds) {
    super('RATE_LIMITED', 429, `Rate limited. Retry after ${retryAfterSeconds}s`);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /**
   * Returns JSON with retryAfter field included.
   */
  toJSON() {
    return { error: this.code, message: this.message, statusCode: this.statusCode, retryAfter: this.retryAfterSeconds };
  }
}
