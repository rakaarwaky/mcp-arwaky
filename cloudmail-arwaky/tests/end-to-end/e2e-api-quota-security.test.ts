import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator } from '../../src/agent/request_flow_facade';
import { createTestContainer } from './test_utils';
import { 
  asUserId, asRequestCount, asApiKeyId, asAccountId, 
  asClientIp, asUserAgent, asAuthToken, asName, asCreatedBy,
  asWindowSeconds, asApiKeyPlain,
  type ApiKeyId, type UserId
} from '../../src/taxonomy';

/**
 * E2E: API Quota & Security
 * 
 * Responsibility:
 * Verifies the orchestration of rate limiting, quota enforcement, and 
 * identity-based security boundaries. Ensures that API keys can be managed
 * through their full lifecycle and that users are isolated.
 */
describe('E2E: API Quota & Security', () => {
  let mockDb: any;
  let orchestrator: AgentOrchestrator;
  let mockSessionAuth: any;
  let mockCrypto: any;

  beforeEach(() => {
    const container = createTestContainer();
    mockDb = container.database;
    mockCrypto = container.crypto;
    mockSessionAuth = container.session;
    orchestrator = new AgentOrchestrator(container);
  });

  describe('Rate Limiting Orchestration', () => {
    it('enforces strict isolation between users for rate limits', async () => {
      const u1 = asUserId('user_01');
      const u2 = asUserId('user_02');
      const limit = asRequestCount(10);
      const window = asWindowSeconds(60);

      // User 1 is over limit
      mockDb.getRequestCountInWindow.mockImplementation((_keyId: ApiKeyId | null, userId: UserId | null, _windowStart: string) => {
        if (userId === u1) return Promise.resolve(11);
        if (userId === u2) return Promise.resolve(5);
        return Promise.resolve(0);
      });

      const res1 = await orchestrator.checkRateLimit(null, u1, limit, window);
      const res2 = await orchestrator.checkRateLimit(null, u2, limit, window);

      expect(res1.allowed).toBe(false);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(5);
    });

    it('identifies and enforces limits based on API Keys', async () => {
      const keyId = asApiKeyId('key_99');
      const limit = asRequestCount(5);

      mockDb.getRequestCountInWindow.mockResolvedValue(6);

      const result = await orchestrator.checkRateLimit(keyId, null, limit, asWindowSeconds(60));
      expect(result.allowed).toBe(false);
      expect(mockDb.getRequestCountInWindow).toHaveBeenCalledWith(keyId, null, expect.any(String));
    });

    it('records requests correctly to the database', async () => {
      const u1 = asUserId('u1');
      mockDb.recordApiRequest.mockResolvedValue(true);

      await orchestrator.recordRequest(null, u1);
      expect(mockDb.recordApiRequest).toHaveBeenCalledWith(null, u1);
    });
  });

  describe('Quota Management Lifecycle', () => {
    it('verifies complex quota usage across multiple metrics', async () => {
      const u1 = asUserId('u1');
      
      mockDb.getUserInboxCount.mockResolvedValue(8);
      mockDb.getUserEmailCount.mockResolvedValue(950);
      mockDb.getRequestsLastMinute.mockResolvedValue(45);

      const usage = await orchestrator.getQuotaUsage(null, u1);
      
      expect(usage.currentInboxes).toBe(8);
      expect(usage.currentEmails).toBe(950);
      expect(usage.requestsLastMinute).toBe(45);
    });

    it('enforces creation blockage when quota is exceeded', async () => {
      const u1 = asUserId('u1');
      // Mock checkQuota to return allowed=false
      // Note: In real life checkQuota might call getQuotaStats internally
      // and compare with a global config. Here we test the orchestrator's proxying.
      
      mockDb.getUserInboxCount.mockResolvedValue(55); // Over the limit of 50
      
      const status = await orchestrator.checkQuota(null, u1);
      expect(status.allowed).toBe(false);
    });
  });

  describe('API Key Security Lifecycle', () => {
    const userId = asUserId('user_secure');
    const accountId = asAccountId('acc_1');

    it('performs full: Create -> Verify -> List -> Revoke -> Reject', async () => {
      // 1. Create
      mockDb.createApiKeyRecord.mockResolvedValue({ id: 'key_1', name: 'DevKey' });
      mockCrypto.randomToken.mockReturnValue('raw_key_material');
      mockCrypto.sha256Hex.mockResolvedValue('hashed_material');

      const created = await orchestrator.createApiKey({ 
        name: asName('DevKey'),
        createdBy: asCreatedBy(userId)
      });
      
      const actualKeyId = created.apiKey.id;
      expect(actualKeyId).toBeDefined();
      expect(created.plainKey).toBe('sk-raw_key_material');
      expect(mockDb.createApiKeyRecord).toHaveBeenCalledWith(expect.any(String), 'hashed_material', 'DevKey', asCreatedBy(userId));

      // 2. Verify
      mockDb.getApiKeyByHash.mockResolvedValue({
        id: actualKeyId,
        userId,
        isActive: true,
        revokedAt: null
      });

      const verified = await orchestrator.verifyApiKeyPlain(asApiKeyPlain('sk-raw_key_material'));
      expect(verified.valid).toBe(true);
      expect(verified.apiKeyId).toBe(actualKeyId);

      // 3. List
      mockDb.listApiKeys.mockResolvedValue([
        { id: actualKeyId, name: 'DevKey', createdAt: '2024', lastUsedAt: '2024' }
      ]);
      const list = await orchestrator.listApiKeys();
      expect(list).toHaveLength(1);
      expect(list[0]!.name).toBe('DevKey');

      // 4. Revoke
      mockDb.revokeApiKeyRecord.mockResolvedValue(true);
      await orchestrator.revokeApiKey({ apiKeyId: actualKeyId });
      expect(mockDb.revokeApiKeyRecord).toHaveBeenCalledWith(actualKeyId);

      // 5. Reject (Verification after revocation)
      mockDb.getApiKeyByHash.mockResolvedValue({
         id: actualKeyId,
         revokedAt: '2024-01-01',
         isActive: false
      });
      const rejected = await orchestrator.verifyApiKeyPlain(asApiKeyPlain('sk-raw_key_material'));
      expect(rejected.valid).toBe(false);
    });
  });

  describe('Identity & Resource Protection', () => {
    it('authenticates a request using an API key and generates a session', async () => {
      const meta = { userAgent: asUserAgent('Mobile-App'), clientIp: asClientIp('8.8.8.8') };
      
      // Mock key verification
      mockCrypto.sha256Hex.mockResolvedValue('hash');
      mockDb.getApiKeyByHash.mockResolvedValue({
        id: 'key_abc',
        userId: 'u_123',
        revokedAt: null
      });

      // Mock session creation
      mockSessionAuth.createSession.mockResolvedValue({ token: 'api_token_123' });

      const authRes = await orchestrator.authenticateWithApiKey(asApiKeyPlain('sk-secret_key'), meta.userAgent, meta.clientIp);
      
      expect(authRes.token).toBe('api_token_123');
      expect(mockSessionAuth.createSession).toHaveBeenCalledWith('apikey:key_abc', expect.any(Object));
    });

    it('cross-verifies token for API Key access', async () => {
      const token = asAuthToken('session_abc');
      
      // Mock DB calls that ApiKeyAuthActions.validateApiKeyToken actually uses
      mockDb.getLoginSessionByTokenHash.mockResolvedValue({
        id: 's_456',
        userId: asUserId('apikey:key_123'),
        tokenHash: 'hash_abc'
      });
      mockDb.getApiKeyById.mockResolvedValue({
        id: asApiKeyId('key_123'),
        createdBy: asCreatedBy('u_123'),
        revokedAt: null
      });

      const validation = await orchestrator.validateApiKeyToken(token);
      expect(validation.valid).toBe(true);
      expect(validation.userId).toBe('u_123'); // Implementation returns real owner ID
      expect(validation.apiKeyId).toBe('key_123');
    });
  });
});
