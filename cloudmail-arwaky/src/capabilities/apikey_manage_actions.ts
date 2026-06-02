// capabilities/apikey_manage_actions.ts
// Implements IAPIKeyManagementProtocol — API key lifecycle management

import type {
  ApiKey, ApiKeyId, CryptoHash, Name, CreatedBy, Timestamp, UserId, ApiKeyPlain, Valid
} from '../taxonomy';
import {
  asByteLength, asCryptoHash, newApiKeyId, asApiKeyId, asName, asCreatedBy, asTimestamp, asUserId,
  API_KEY_RANDOM_BYTES, MASK_KEY_VISIBLE_CHARS,
  ValidationFieldError, asFieldName, asApiKeyPlain, VALID, INVALID, ACTIVE, INACTIVE,
  asCacheKey, asTtlSeconds, asSpanName, asServiceName, asAction
} from '../taxonomy';
import type {
  IAPIKeyManagementProtocol,
  ApiKeyCreateInput,
  ApiKeyRevokeInput,
  ApiKeyListItem,
  VerifyApiKeyOutput,
  IDatabaseQueryPort,
  IPasswordHashPort,
  IMetricsCollectorPort,
  ICachePort,
  ITracerPort
} from '../contract';
import { AuditLogActions } from './audit_log_actions';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';
import { withTracing } from '../infrastructure/telemetry_tracer_helper';

export class ApiKeyManagementActions implements IAPIKeyManagementProtocol {
  constructor(
    private db: IDatabaseQueryPort,
    private hasher: IPasswordHashPort,
    private auditLog: AuditLogActions,
    private metrics: IMetricsCollectorPort,
    private cache: ICachePort,
    private tracer: ITracerPort
  ) { }

  /**
   * Generates a new API key and stores its hash.
   * The plain key is returned only once at creation time.
   *
   * @param input Optional name and creator metadata
   * @returns The masked API key record and the plaintext secret
   */
  async createApiKey(input: ApiKeyCreateInput): Promise<{ apiKey: ApiKey; plainKey: ApiKeyPlain }> {
    return withTracing(this.tracer, asSpanName('api_key_management.createApiKey'), {}, async () => {
      return withMetrics(this.metrics, asServiceName('api_key_management'), asAction('createApiKey'), async () => {
        this.validateApiKeyName(input.name);

        const id = asApiKeyId(crypto.randomUUID());
        const randomPart = this.hasher.randomToken(asByteLength(API_KEY_RANDOM_BYTES));
        const plainKey = asApiKeyPlain('sk-' + randomPart);
        const keyHash = await this.hasher.sha256Hex(asCryptoHash(plainKey));
        const name = input.name ? asName(input.name) : null;
        const createdBy = input.createdBy ?? null;

        await this.db.createApiKeyRecord(id, keyHash, name, createdBy);

        const now = asTimestamp(new Date().toISOString());
        // SECURITY: Return masked version in the object
        const apiKey: ApiKey = {
          id: this.maskApiKey(id),
          keyHash: asCryptoHash('**** (masked for security)'),
          name,
          createdBy,
          createdAt: now,
          revokedAt: null
        };

        // Audit log (with real ID for backend tracking)
        await this.auditLog.logEvent({
          eventType: 'apikey_created',
          userId: createdBy as unknown as UserId | null,
          apiKeyId: id,
          metadata: { name: name ?? undefined }
        });

        return { apiKey, plainKey };
      });
    });
  }

  /**
   * Revokes an existing API key, preventing future authentication attempts.
   */
  async revokeApiKey(input: ApiKeyRevokeInput): Promise<void> {
    return withTracing(this.tracer, asSpanName('api_key_management.revokeApiKey'), {}, async () => {
      return withMetrics(this.metrics, asServiceName('api_key_management'), asAction('revokeApiKey'), async () => {
        await this.db.revokeApiKeyRecord(input.apiKeyId);

        // Invalidate revocation status cache (branded key + TTL)
        await this.cache.set(asCacheKey(`apikey:revoked:${input.apiKeyId}`), ACTIVE, asTtlSeconds(3600));

        // Audit log
        await this.auditLog.logEvent({
          eventType: 'apikey_revoked',
          apiKeyId: input.apiKeyId,
          metadata: undefined
        });
      });
    });
  }

  /**
   * Lists all API keys. IDs are masked for security.
   */
  async listApiKeys(): Promise<ApiKeyListItem[]> {
    return withTracing(this.tracer, asSpanName('api_key_management.listApiKeys'), {}, async () => {
      return withMetrics(this.metrics, asServiceName('api_key_management'), asAction('listApiKeys'), async () => {
        const keys = await this.db.listApiKeys();
        return keys.map(k => ({
          id: this.maskApiKey(k.id),
          name: k.name,
          createdBy: k.createdBy,
          createdAt: k.createdAt,
          isActive: k.revokedAt === null ? ACTIVE : INACTIVE
        }));
      });
    });
  }

  /**
   * Verifies if a plaintext key matches any active hashed key in the database.
   * Returns verification status, the matching API key ID (if valid), and the
   * owning user's ID (createdBy). The userId may be null for system keys.
   */
  async verifyApiKeyPlain(keyPlain: ApiKeyPlain): Promise<VerifyApiKeyOutput> {
    return withTracing(this.tracer, asSpanName('api_key_management.verifyApiKeyPlain'), {}, async () => {
      return withMetrics(this.metrics, asServiceName('api_key_management'), asAction('verifyApiKeyPlain'), async () => {
        try {
          const keyHash = await this.hasher.sha256Hex(asCryptoHash(keyPlain));

          // Check cache first (fast path)
          const cacheKey = asCacheKey(`apikey:hash:${keyHash}`);
          const cached = await this.cache.get<VerifyApiKeyOutput>(cacheKey);
          if (cached) return cached;

          // Fetch the key by its hash
          const key = await this.db.getApiKeyByHash(keyHash);

          // Key not found or revoked → invalid
          if (!key || key.revokedAt !== null) {
            const result = { valid: INVALID, apiKeyId: null, userId: null };
            await this.cache.set(cacheKey, result, asTtlSeconds(600));
            return result;
          }

          // Convert CreatedBy (may be null) to UserId | null
          const result: VerifyApiKeyOutput = { 
            valid: VALID, 
            apiKeyId: key.id, 
            userId: key.createdBy ? asUserId(key.createdBy) : null 
          };
          await this.cache.set(cacheKey, result, asTtlSeconds(600)); // 10 min cache
          return result;
        } catch (err) {
          // Structured logging via audit log
          await this.auditLog.logEvent({
            eventType: 'api_request',
            metadata: { success: false, error: 'verification_failed' }
          });
          throw err;
        }
      });
    });
  }

  /**
   * Retrieves an API key by its hash.
   * Used for admin lookup and debugging.
   */
  async getApiKeyByHash(keyHash: CryptoHash): Promise<ApiKeyListItem | null> {
    return withTracing(this.tracer, asSpanName('api_key_management.getApiKeyByHash'), {}, async () => {
      return withMetrics(this.metrics, asServiceName('api_key_management'), asAction('getApiKeyByHash'), async () => {
        const key = await this.db.getApiKeyByHash(keyHash);
        if (!key) return null;
        return {
          id: this.maskApiKey(key.id),
          name: key.name,
          createdBy: key.createdBy,
          createdAt: key.createdAt,
          isActive: key.revokedAt === null ? ACTIVE : INACTIVE
        };
      });
    });
  }

  // ── Internal helpers ──

  /**
   * Validates API key name for length and characters.
   * Validation moved to taxonomy.asName() factory.
   */
  private validateApiKeyName(name?: string | null): void {
    if (name) asName(name);
  }

  private maskApiKey(id: ApiKeyId): ApiKeyId {
    const full = String(id);
    if (full.length <= MASK_KEY_VISIBLE_CHARS) return id;
    return asApiKeyId(`****-****-${full.slice(-MASK_KEY_VISIBLE_CHARS)}`);
  }
}
