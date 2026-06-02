// taxonomy/domain_base_error.ts
// Base error class for all domain errors in the taxonomy

import type { ErrorCode, HttpStatusCode } from './error_code_vo';

/**
 * Abstract base class for all domain-specific errors.
 * Extends the native Error class with structured domain error properties.
 *
 * All taxonomy error classes (AuthUnauthorizedError, NotFoundError, etc.) extend this base.
 * Provides consistent JSON serialization via toJSON() for API responses.
 *
 * @example
 *   throw new AuthUnauthorizedError('Invalid credentials');
 *   // { error: 'UNAUTHORIZED', message: 'Invalid credentials', statusCode: 401 }
 */
export abstract class DomainError extends Error {
  /**
   * Machine-readable error code from the ErrorCode union.
   * Maps to HTTP status codes via ERROR_STATUS_MAP.
   */
  public readonly code: ErrorCode;

  /**
   * HTTP status code associated with this error.
   * Used in API response status.
   */
  public readonly statusCode: HttpStatusCode;

  /**
   * Creates a new DomainError with standardized properties.
   *
   * @param code - Error code from ErrorCode union
   * @param statusCode - HTTP status code (400, 401, 403, 404, 409, 429, 500)
   * @param message - Human-readable error message
   */
  constructor(code: ErrorCode, statusCode: HttpStatusCode, message: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    // Maintains proper stack trace for where our error was thrown (V8 only)
    if ('captureStackTrace' in Error) {
      (Error as unknown as { captureStackTrace: (target: object, ctor: Function) => void }).captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a plain object representation suitable for JSON serialization.
   * Used by API error handlers to format error responses.
   *
   * @returns Object with error code, message, and HTTP status code
   */
  toJSON(): { error: ErrorCode; message: string; statusCode: HttpStatusCode } {
    return { error: this.code, message: this.message, statusCode: this.statusCode };
  }
}
