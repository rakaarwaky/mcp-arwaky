// agent/api_quota_router.ts
// API domain router — API key management, rate limiting, quota enforcement
// Owns: API key lifecycle, request throttling, usage quotas

import type { AgentContainer } from './di_container_registry';
import type { ApiKeyId, UserId, RequestCount, ApiKeyPlain, WindowSeconds, CryptoHash } from '../taxonomy';
import type { ApiKeyCreateInput, ApiKeyRevokeInput, ApiKeyListItem } from '../contract/api_keys_io';
import { asApiKeyPlain, asWindowSeconds, asCryptoHash } from '../taxonomy';

export class ApiQuotaRouter {
  constructor(private container: AgentContainer) {}

  // ── API Key Management ──

  async createApiKey(input: ApiKeyCreateInput) {
    return this.container.apiKeyManagement.createApiKey(input);
  }

  async revokeApiKey(input: ApiKeyRevokeInput) {
    return this.container.apiKeyManagement.revokeApiKey(input);
  }

  async listApiKeys(): Promise<ApiKeyListItem[]> {
    return this.container.apiKeyManagement.listApiKeys();
  }

  async getApiKeyByHash(keyHash: CryptoHash) {
    return this.container.apiKeyManagement.getApiKeyByHash(keyHash);
  }

  async verifyApiKeyPlain(keyPlain: ApiKeyPlain) {
    return this.container.apiKeyManagement.verifyApiKeyPlain(asApiKeyPlain(keyPlain));
  }

  // ── Rate Limiting ──

  async checkRateLimit(apiKeyId: ApiKeyId | null, userId: UserId | null, limit: RequestCount, windowSeconds: WindowSeconds) {
    return this.container.rateLimit.checkLimit(apiKeyId, userId, limit, asWindowSeconds(windowSeconds));
  }

  async recordRequest(apiKeyId: ApiKeyId | null, userId: UserId | null) {
    return this.container.rateLimit.recordRequest(apiKeyId, userId);
  }

  // ── Quota Management ──

  async checkQuota(apiKeyId: ApiKeyId | null, userId: UserId | null) {
    return this.container.quotaManagement.checkQuota(apiKeyId, userId);
  }

  async getQuotaUsage(apiKeyId: ApiKeyId | null, userId: UserId | null) {
    return this.container.quotaManagement.getQuotaUsage(apiKeyId, userId);
  }

  async getQuotaLimits(apiKeyId: ApiKeyId | null, userId: UserId | null) {
    return this.container.quotaManagement.getQuotaLimits(apiKeyId, userId);
  }

  async incrementInboxCount(apiKeyId: ApiKeyId | null, userId: UserId | null) {
    return this.container.quotaManagement.incrementInboxCount(apiKeyId, userId);
  }

  async incrementEmailCount(apiKeyId: ApiKeyId | null, userId: UserId | null) {
    return this.container.quotaManagement.incrementEmailCount(apiKeyId, userId);
  }
}
