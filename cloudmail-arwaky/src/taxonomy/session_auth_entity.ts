// taxonomy/session_auth_entity.ts

import type { SessionId, UserId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { CryptoHash } from './crypto_hash_vo';
import type { UserAgent, ClientIp } from './http_context_vo';

export type SessionType = 'login';

export interface Session {
  id: SessionId;
  type: SessionType;
  tokenHash: CryptoHash;
  userId: UserId | null;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  revokedAt: Timestamp | null;
  userAgent: UserAgent;
  clientIp: ClientIp;
}

export function isSessionExpired(s: Session): boolean { return new Date(s.expiresAt).getTime() < Date.now(); }
export function isSessionActive(s: Session): boolean {
  return !s.revokedAt && !isSessionExpired(s);
}

export const SESSION_AUTH_DOMAIN = 'session_auth';
