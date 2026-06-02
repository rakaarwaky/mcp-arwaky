// taxonomy/id_identity_vo.ts
// Branded ID types — prevents accidental ID mixups at compile time

/**
 * Branded ID types — prevents accidental ID mixups at compile time
 * Use these types instead of raw strings to catch type errors at compile time
 */
export type UserId = string & { readonly __brand: 'UserId' };
export type InboxId = string & { readonly __brand: 'InboxId' };
export type EmailId = string & { readonly __brand: 'EmailId' };
export type SessionId = string & { readonly __brand: 'SessionId' };
export type AccountId = string & { readonly __brand: 'AccountId' };
export type ApiKeyId = string & { readonly __brand: 'ApiKeyId' };

/**
 * Generic entity ID used in NotFoundError context.
 * This is a generic ID type for entities without their own specific ID type.
 */
export type EntityId = string & { readonly __brand: 'EntityId' };

function ensureNotEmpty(s: string, fieldName: string): string {
  if (!s || s.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  return s;
}

export function newUserId(): UserId { return crypto.randomUUID() as UserId; }
export function newInboxId(): InboxId { return crypto.randomUUID() as InboxId; }
export function newEmailId(): EmailId { return crypto.randomUUID() as EmailId; }
export function newSessionId(): SessionId { return crypto.randomUUID() as SessionId; }
export function newAccountId(): AccountId { return crypto.randomUUID() as AccountId; }
export function newApiKeyId(): ApiKeyId { return crypto.randomUUID() as ApiKeyId; }

export function asUserId(s: string): UserId { return ensureNotEmpty(s, 'User ID') as UserId; }
export function asInboxId(s: string): InboxId { return ensureNotEmpty(s, 'Inbox ID') as InboxId; }
export function asEmailId(s: string): EmailId { return ensureNotEmpty(s, 'Email ID') as EmailId; }
export function asSessionId(s: string): SessionId { return ensureNotEmpty(s, 'Session ID') as SessionId; }
export function asAccountId(s: string): AccountId { return ensureNotEmpty(s, 'Account ID') as AccountId; }
export function asApiKeyId(s: string): ApiKeyId { return ensureNotEmpty(s, 'API Key ID') as ApiKeyId; }
export function asEntityId(s: string): EntityId { return ensureNotEmpty(s, 'Entity ID') as EntityId; }

export function entityIdFrom<T extends { toString(): string }>(id: T): EntityId {
  return asEntityId(String(id));
}
