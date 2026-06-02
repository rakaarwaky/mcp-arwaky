// taxonomy/forbidden_access_error.ts
// Forbidden error (403) — insufficient permissions

import type { ErrorCode, HttpStatusCode } from './error_code_vo';
import { DomainError } from './domain_base_error';

/**
 * Error thrown when user lacks permission to perform the requested action.
 * Extends DomainError with code 'FORBIDDEN' and HTTP 403 status.
 *
 * @example
 *   throw new ForbiddenError('Cannot delete other user inbox');
 */
export class ForbiddenError extends DomainError {
  /**
   * Creates a ForbiddenError.
   * @param message - Permission denial description (default: 'Forbidden')
   */
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', 403, message);
    this.name = 'ForbiddenError';
  }
}
