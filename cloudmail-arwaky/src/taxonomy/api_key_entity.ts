// taxonomy/api_key_entity.ts

import type { ApiKeyId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { CryptoHash } from './crypto_hash_vo';
import type { Name, CreatedBy } from './generic_identity_vo';

export interface ApiKey {
  id: ApiKeyId;
  keyHash: CryptoHash;
  name: Name | null;
  createdBy: CreatedBy | null;
  createdAt: Timestamp;
  revokedAt: Timestamp | null;
}

export function isRevoked(key: ApiKey): boolean { return key.revokedAt !== null; }
export function isActive(key: ApiKey): boolean { return key.revokedAt === null; }
