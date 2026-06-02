// contract/apikey_proto_protocol.ts
// API key + auth — pure protocol interfaces (merged from api_key_auth + api_key_management)

import type { ApiKey, ApiKeyId, AuthToken, UserId, UserAgent, ClientIp, ApiKeyPlain, Valid, CryptoHash } from '../taxonomy';
import type { ApiKeyCreateInput, ApiKeyRevokeInput, ApiKeyListItem, ApiKeyAuthOutput, VerifyApiKeyOutput } from './api_keys_io';
export type { ApiKeyCreateInput, ApiKeyRevokeInput, ApiKeyListItem, ApiKeyAuthOutput, VerifyApiKeyOutput } from './api_keys_io';

export interface IAPIKeyManagementProtocol {
  createApiKey(input: ApiKeyCreateInput): Promise<{ apiKey: ApiKey; plainKey: ApiKeyPlain }>;
  revokeApiKey(input: ApiKeyRevokeInput): Promise<void>;
  listApiKeys(): Promise<ApiKeyListItem[]>;
  verifyApiKeyPlain(keyPlain: ApiKeyPlain): Promise<VerifyApiKeyOutput>;
  getApiKeyByHash(keyHash: CryptoHash): Promise<ApiKeyListItem | null>;
}

export interface IApiKeyAuthProtocol {
  authenticateWithApiKey(apiKeyPlain: ApiKeyPlain, userAgent: UserAgent, clientIp: ClientIp): Promise<ApiKeyAuthOutput>;
  validateApiKeyToken(token: AuthToken): Promise<{ valid: Valid; apiKeyId: ApiKeyId | null; userId: UserId | null }>;
}
