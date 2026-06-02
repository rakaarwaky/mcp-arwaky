// taxonomy/auth_unauthorized_error.ts
// Authentication required error (401)

import type { ErrorCode, HttpStatusCode } from './error_code_vo';
import { DomainError } from './domain_base_error';

/**
 * Error thrown when authentication is required but not provided or invalid.
 * Extends DomainError with code 'UNAUTHORIZED' and HTTP 401 status.
 *
 * @example
 *   throw new AuthUnauthorizedError('Invalid token');
 */
export class AuthUnauthorizedError extends DomainError {
  /**
   * Creates an AuthUnauthorizedError.
   * @param message - Error description (default: 'Unauthorized')
   */
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', 401, message);
    this.name = 'AuthUnauthorizedError';
  }
}
