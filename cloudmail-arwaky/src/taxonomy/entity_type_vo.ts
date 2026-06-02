/**
 * @module taxonomy/entity_type_vo
 * @description Value Object for system entity types.
 * Defines valid entity names for consistency across audits, 
 * error messages, and repository lookups.
 * This ensures type safety across the entire AES architecture.
 */

export type EntityType = 'User' | 'Inbox' | 'Email' | 'Session' | 'Account' | 'ApiKey';
export const ALL_ENTITY_TYPES: EntityType[] = ['User', 'Inbox', 'Email', 'Session', 'Account', 'ApiKey'];
