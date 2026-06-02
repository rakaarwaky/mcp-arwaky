// capabilities/apikey_auth_actions.ts
// Implements IApiKeyAuthProtocol — API key authentication flow

import type {
  ApiKeyId, AuthToken, UserId, UserAgent, ClientIp, CryptoHash, ApiKeyPlain, Valid
} from '../taxonomy';
import { asUserId, asApiKeyId, AuthUnauthorizedError, asCryptoHash, VALID, INVALID, asCacheKey, asTtlSeconds, asServiceName, asAction } from '../taxonomy';
import type {
  IApiKeyAuthProtocol,
  IAPIKeyManagementProtocol,
  ISessionAuthPort,
  IDatabaseQueryPort,
  IPasswordHashPort,
  IMetricsCollectorPort,
  ICachePort,
  ITracerPort
} from '../contract';
import type { ApiKeyAuthOutput } from '../contract/api_keys_io';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

export class ApiKeyAuthActions implements IApiKeyAuthProtocol {
  constructor(
    private keyManagement: IAPIKeyManagementProtocol,
    private sessionAuth: ISessionAuthPort,
    private db: IDatabaseQueryPort,
    private hasher: IPasswordHashPort,
    private metrics: IMetricsCollectorPort,
    private cache: ICachePort,
    private tracer: ITracerPort
  ) { }

  async authenticateWithApiKey(
    apiKeyPlain: ApiKeyPlain,
    userAgent: UserAgent,
    clientIp: ClientIp
  ): Promise<ApiKeyAuthOutput> {
    return withMetrics(this.metrics, asServiceName('api_key_auth'), asAction('authenticateWithApiKey'), async () => {
      const validation = await this.keyManagement.verifyApiKeyPlain(apiKeyPlain);
      if (!validation.valid || !validation.apiKeyId) {
        throw new AuthUnauthorizedError('Invalid or revoked API key');
      }

      // API key sessions use a synthetic userId derived from the key
      // The apiKeyId is stored in the session for later validation
      const syntheticUserId = asUserId(`apikey:${validation.apiKeyId}`);
      const { token } = await this.sessionAuth.createSession(syntheticUserId, { userAgent, clientIp });

      return {
        token,
        apiKeyId: validation.apiKeyId,
        userId: syntheticUserId
      };
    });
  }

  async validateApiKeyToken(
    token: AuthToken
  ): Promise<{ valid: Valid; apiKeyId: ApiKeyId | null; userId: UserId | null }> {
    return withMetrics(this.metrics, asServiceName('api_key_auth'), asAction('validateApiKeyToken'), async () => {
      // 1. Check cache first
      const cacheKey = asCacheKey(`auth:session:${token}`);
      const cached = await this.cache.get<{ apiKeyId: ApiKeyId; userId: UserId }>(cacheKey);
      if (cached) {
        return { valid: VALID, apiKeyId: cached.apiKeyId, userId: cached.userId };
      }

      // 2. Hash the token and look up session directly (no user join)
      const normalized = String(token).trim();
      if (!normalized) {
        return { valid: INVALID, apiKeyId: null, userId: null };
      }
      const tokenHash = await this.hasher.sha256Hex(asCryptoHash(normalized));
      const session = await this.db.getLoginSessionByTokenHash(tokenHash);
      if (!session) {
        return { valid: INVALID, apiKeyId: null, userId: null };
      }

      // 3. Ensure this is an API key session (synthetic userId prefix)
      if (!session.userId || !session.userId.startsWith('apikey:')) {
        return { valid: INVALID, apiKeyId: null, userId: null };
      }

      // 4. Extract apiKeyId from synthetic userId
      const extractedApiKeyId = asApiKeyId(session.userId.replace('apikey:', ''));

      // 5. Fetch the actual API key record to verify it exists and is not revoked
      const apiKey = await this.db.getApiKeyById(extractedApiKeyId);
      if (!apiKey || apiKey.revokedAt) {
        return { valid: INVALID, apiKeyId: extractedApiKeyId, userId: null };
      }

      // 6. Return the real owning userId (createdBy) for downstream authorization
      const realUserId = apiKey.createdBy ? asUserId(apiKey.createdBy) : null;
      if (!realUserId) {
        return { valid: INVALID, apiKeyId: extractedApiKeyId, userId: null };
      }

      const result = {
        valid: VALID,
        apiKeyId: extractedApiKeyId,
        userId: realUserId
      };

      // 7. Populate cache (TTL 5 minutes)
      await this.cache.set(cacheKey, { apiKeyId: extractedApiKeyId, userId: realUserId }, asTtlSeconds(300));

      return result;
    });
  }
}
