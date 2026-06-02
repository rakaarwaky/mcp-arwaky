// taxonomy/conflict_state_error.ts
// Conflict error (409) — resource state conflict

import type { ErrorCode, HttpStatusCode } from './error_code_vo';
import { DomainError } from './domain_base_error';

/**
 * Error thrown when a request conflicts with current resource state.
 * Common scenarios: duplicate key, version mismatch, concurrent modification.
 * Extends DomainError with code 'CONFLICT' and HTTP 409 status.
 *
 * @example
 *   throw new ConflictError('Inbox already exists');
 */
export class ConflictError extends DomainError {
  /**
   * Creates a ConflictError.
   * @param message - Description of the conflict
   */
  constructor(message: string) {
    super('CONFLICT', 409, message);
    this.name = 'ConflictError';
  }
}
