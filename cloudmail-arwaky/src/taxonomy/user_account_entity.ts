// taxonomy/user_account_entity.ts

import type { UserId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { EmailAddress } from './email_address_vo';
import type { CryptoHash } from './crypto_hash_vo';
import type { DisplayName } from './text_content_vo';

export type UserRole = 'admin' | 'agent' | 'user';

export function asUserRole(s: string): UserRole {
  const allowed: UserRole[] = ['admin', 'agent', 'user'];
  if (allowed.includes(s as UserRole)) return s as UserRole;
  return 'user';
}

export interface User {
  id: UserId;
  email: EmailAddress;
  displayName: DisplayName | null;
  role: UserRole;
  isOwner: boolean;
  passwordHash: CryptoHash | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A user object with sensitive security fields (like passwordHash) removed.
 * Use this for sending user data to the client.
 */
export interface SanitizedUser extends Omit<User, 'passwordHash'> { }

/**
 * Removes sensitive fields from a User object for safe propagation.
 * @param user The full User object including passwordHash
 */
export function sanitizeUser(user: User): SanitizedUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

export function isAdmin(u: User): boolean { return u.role === 'admin'; }
export function userDisplayName(u: User): string { return u.displayName || u.email.full; }

