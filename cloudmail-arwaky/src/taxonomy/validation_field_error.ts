// taxonomy/validation_field_error.ts
// Validation error (400) — field-level validation failure

import type { ErrorCode, HttpStatusCode } from './error_code_vo';
import type { FieldName } from './field_name_vo';
import type { Reason } from './health_status_vo';
import { DomainError } from './domain_base_error';
import { asReason } from './health_status_vo';

/**
 * Error thrown when a field fails validation.
 * Extends DomainError with code 'VALIDATION_ERROR' and HTTP 400 status.
 * Includes field name and validation error details.
 *
 * @example
 *   throw new ValidationFieldError('email', 'Invalid email format');
 *   // { error: 'VALIDATION_ERROR', message: 'Field validation failed', field: 'email', reason: 'Invalid email format' }
 */
export class ValidationFieldError extends DomainError {
  public readonly code: ErrorCode = 'VALIDATION_ERROR';
  public readonly statusCode: HttpStatusCode = 400;

  /**
   * Name of the field that failed validation
   */
  public readonly field: FieldName;

  /**
   * Detailed reason for validation failure
   */
  public readonly reason: Reason;

  /**
   * Creates a ValidationFieldError.
   *
   * @param field - Name of the field that failed validation
   * @param reason - Human-readable reason for the validation failure
   */
  constructor(field: FieldName, reason: string) {
    super('VALIDATION_ERROR', 400, 'Field validation failed');
    this.name = 'ValidationFieldError';
    this.field = field;
    this.reason = asReason(reason);
  }

  /**
   * Returns JSON with field and reason fields included.
   */
  toJSON() {
    return { error: this.code, message: this.message, statusCode: this.statusCode, field: this.field, reason: this.reason };
  }
}
