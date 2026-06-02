import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimitActions } from '../../src/capabilities/rate_limit_actions';
import { ApiKeyAuthActions } from '../../src/capabilities/apikey_auth_actions';
import { createMockDb, createMockMetricsCollector, createMockCache, createMockTracer } from '../unit/mocks';

describe('functional: Phase 3 Security (Rate Limiting & API Auth)', () => {
  let mockDb: any;
  let rateLimit: RateLimitActions;
  let metrics: any;
  let cache: any;
  let tracer: any;

  beforeEach(() => {
    mockDb = createMockDb();
    metrics = createMockMetricsCollector();
    cache = createMockCache();
    tracer = createMockTracer();
    rateLimit = new RateLimitActions(mockDb, metrics);
  });

  describe('RateLimitActions', () => {
    it('should allow requests below limit', async () => {
      const { asApiKeyId, asRequestCount, asWindowSeconds } = await import('../../src/taxonomy');
      mockDb.getRequestCountInWindow.mockResolvedValue(5);
      const result = await rateLimit.checkLimit(asApiKeyId('k1'), null as any, asRequestCount(10), asWindowSeconds(60));
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });

    it('should block requests at limit', async () => {
      const { asApiKeyId, asRequestCount, asWindowSeconds } = await import('../../src/taxonomy');
      mockDb.getRequestCountInWindow.mockResolvedValue(10);
      const result = await rateLimit.checkLimit(asApiKeyId('k1'), null as any, asRequestCount(10), asWindowSeconds(60));
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should record requests in DB', async () => {
      const { asApiKeyId, asUserId } = await import('../../src/taxonomy');
      await rateLimit.recordRequest(asApiKeyId('k1'), asUserId('u1'));
      expect(mockDb.recordApiRequest).toHaveBeenCalledWith(asApiKeyId('k1'), asUserId('u1'));
    });
  });

  describe('ApiKeyAuthActions', () => {
    let auth: ApiKeyAuthActions;
    let mockKeyMgmt: any;
    let mockSessionAuth: any;
    let mockHasher: any;

    beforeEach(() => {
      mockKeyMgmt = { verifyApiKeyPlain: vi.fn() };
      mockSessionAuth = {
        createSession: vi.fn().mockResolvedValue({ token: 't123' as any, session: { id: 's1', userId: 'apikey:k1' } }),
        validateSession: vi.fn().mockResolvedValue({ valid: true, userId: 'apikey:k1', sessionId: 's1' })
      };
      mockHasher = {
        hashPassword: vi.fn(),
        sha256Hex: vi.fn().mockResolvedValue('mockhash' as any)
      };
      auth = new ApiKeyAuthActions(mockKeyMgmt, mockSessionAuth, mockDb, mockHasher, metrics, cache, tracer);
    });

    it('should authenticate valid API key and create session', async () => {
      const { asApiKeyId, asAuthToken, asApiKeyPlain } = await import('../../src/taxonomy');
      mockKeyMgmt.verifyApiKeyPlain.mockResolvedValue({ valid: true, apiKeyId: asApiKeyId('k1') });

      const result = await auth.authenticateWithApiKey(asApiKeyPlain('sk-plain_key'), 'ua' as any, '1.1.1.1' as any);

      expect(result.token).toBe('t123');
      expect(result.apiKeyId).toBe('k1');
      expect(result.userId).toBe('apikey:k1');
    });

    it('should validate API key token', async () => {
      const { asUserId, asAuthToken } = await import('../../src/taxonomy');
      mockSessionAuth.validateSession.mockResolvedValue({
        userId: asUserId('apikey:k1'),
        sessionId: 's1'
      });

      const result = await auth.validateApiKeyToken(asAuthToken('t123'));
      expect(result.valid).toBe(true);
      expect(result.apiKeyId).toBe('k1');
    });

    it('should reject non-apikey session tokens', async () => {
      const { asUserId, asAuthToken } = await import('../../src/taxonomy');
      // Override DB to return session with regular user (not apiKey-prefixed)
      mockDb.getLoginSessionByTokenHash.mockResolvedValue({
        id: 's2',
        userId: asUserId('user123'),
        tokenHash: 'hash456'
      });
      // Ensure API key lookup returns nothing for this session's extracted key
      mockDb.getApiKeyById.mockResolvedValue(null);

      const result = await auth.validateApiKeyToken(asAuthToken('t123'));
      expect(result.valid).toBe(false);
    });
  });
});
