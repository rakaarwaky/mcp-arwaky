// taxonomy/not_found_error.ts
// Not found error (404) — resource does not exist

import type { ErrorCode, HttpStatusCode } from './error_code_vo';
import type { EntityType } from './entity_type_vo';
import { DomainError } from './domain_base_error';
import type { EntityId } from './id_identity_vo';
import { asEntityId } from './id_identity_vo';

// Re-export EntityId and asEntityId for backward compatibility
export { EntityId, asEntityId };

/**
 * Extends DomainError with code 'NOT_FOUND' and HTTP 404 status.
 * Includes entity type and ID for precise error context.
 *
 * @example
 *   throw new NotFoundError('Inbox', inboxId);
 *   // { error: 'NOT_FOUND', message: 'Inbox not found: xyz', entity: 'Inbox', id: 'xyz' }
 */
export class NotFoundError extends DomainError {
  public readonly code: ErrorCode = 'NOT_FOUND';
  public readonly statusCode: HttpStatusCode = 404;

  /**
   * Entity type (e.g., 'User', 'Inbox', 'Email', 'Session')
   */
  public readonly entity: EntityType;

  /**
   * ID of the entity that was not found
   */
  public readonly id: EntityId;

  /**
   * Creates a NotFoundError with entity context.
   *
   * @param entity - Type of entity that was not found
   * @param id - ID of the missing entity
   */
  constructor(entity: EntityType, id: EntityId) {
    super('NOT_FOUND', 404, `${entity} not found: ${id}`);
    this.name = 'NotFoundError';
    this.entity = entity;
    this.id = id;
  }

  /**
   * Returns extended JSON including entity and id fields.
   */
  toJSON() {
    return { error: this.code, message: this.message, statusCode: this.statusCode, entity: this.entity, id: this.id };
  }
}
