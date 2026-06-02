// contract/api_keys_io.ts
// API keys — create, revoke, list, verify, auth

import type { ApiKeyId, Name, CreatedBy, Timestamp, ApiOperationSuccess, ApiKey, UserId, UserAgent, ClientIp, AuthToken, ApiKeyPlain, Active, Valid } from '../taxonomy';

export interface ApiKeyCreateInput { name?: Name; createdBy?: CreatedBy; }
export interface ApiKeyRevokeInput { apiKeyId: ApiKeyId; }
export interface ApiKeyListInput {}
export interface VerifyApiKeyInput { keyPlain: ApiKeyPlain; }
export interface ApiKeyAuthInput { apiKeyPlain: ApiKeyPlain; userAgent: UserAgent; clientIp: ClientIp; }
export interface ApiKeyListItem { id: ApiKeyId; name: Name | null; createdBy: CreatedBy | null; createdAt: Timestamp; isActive: Active; }
export interface ApiKeyCreateOutput { apiKey: ApiKey; plainKey: ApiKeyPlain; }
export interface ApiKeyRevokeOutput { ok: ApiOperationSuccess; }
export interface ApiKeyListOutput { keys: ApiKeyListItem[]; }
export interface VerifyApiKeyOutput { valid: Valid; apiKeyId: ApiKeyId | null; userId: UserId | null; }
export interface ApiKeyAuthOutput { token: AuthToken; apiKeyId: ApiKeyId; userId: UserId; }
