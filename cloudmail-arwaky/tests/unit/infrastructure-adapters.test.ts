import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClientAdapter } from '../../src/infrastructure/http_client_adapter';
import { CryptoPasswordAdapter } from '../../src/infrastructure/crypto_password_adapter';
import { SessionAuthAdapter } from '../../src/infrastructure/session_auth_adapter';
import { createEmailAddress, ValidationFieldError } from '../../src/taxonomy';
import { vi as vitestVi } from 'vitest';

// Mock config before anything else
vi.mock('../../src/infrastructure/config_loader_adapter', () => ({
  getConfig: () => ({
    session: { maxAgeSeconds: 604800 },
    cloudflare: { accountId: 'mock-id', d1Token: 'mock-token' }
  }),
  loadConfig: () => ({
    session: { maxAgeSeconds: 604800, cookieName: 'mailflare_session' },
    email: { defaultDomain: 'mailflare.local', cleanupMaxAgeHours: 24, pollIntervalSeconds: 5, pollTimeoutSeconds: 60 },
    api: { baseUrl: 'http://localhost:8787', timeoutMs: 30000 },
    account: { expiryHours: 24 },
    rateLimit: { defaultLimit: 100, windowSeconds: 60 },
    quota: { maxInboxesPerKey: 10, maxEmailsPerInbox: 1000, maxRequestsPerMinute: 100 },
    admin: { email: 'admin@mailflare.local', password: '', displayName: 'Admin' },
    featureFlags: {},
    resilience: { faultInjection: {} }
  })
}));

// Robust crypto polyfill for tests
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  const nodeCrypto = require('node:crypto');
  const webcrypto = nodeCrypto.webcrypto;

  if (typeof globalThis.crypto === 'undefined') {
    vi.stubGlobal('crypto', webcrypto || {
      randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(7),
      subtle: webcrypto?.subtle || {
        digest: async () => new Uint8Array(32),
        importKey: async () => ({}),
        deriveBits: async () => new Uint8Array(32)
      },
      getRandomValues: (arr: any) => nodeCrypto.randomFillSync(arr)
    });
  } else if (!globalThis.crypto.randomUUID) {
    // Only patch missing parts if possible, but stubGlobal is cleaner for entire replacement
    vi.stubGlobal('crypto', {
      ...globalThis.crypto,
      randomUUID: () => 'mock-uuid-' + Math.random().toString(36).substring(7)
    });
  }
}

// mocks for SessionAuth
// crypto setup done above

class MockD1PreparedStatement {
  constructor(public query: string, public binds: any[] = []) { }
  bind(...values: any[]) { return new MockD1PreparedStatement(this.query, values); }
  async first<T>() { return null as T | null; }
  async run() { return { meta: { changes: 0 } }; }
}
class MockD1Database {
  prepare(query: string) { return new MockD1PreparedStatement(query); }
}

describe('infrastructure: Additional Adapters', () => {

  describe('HttpClientAdapter', () => {
    const config = { baseUrl: 'https://api.test' as any, token: 'secret' as any };
    let adapter: HttpClientAdapter;

    beforeEach(() => {
      adapter = new HttpClientAdapter(config);
      vi.stubGlobal('fetch', vi.fn());
    });

    it('makes standard requests with correct headers', async () => {
      const mockResponse = { ok: true, json: async () => ({ users: [] }) };
      (fetch as any).mockResolvedValue(mockResponse);

      const users = await adapter.getUsers();
      expect(fetch).toHaveBeenCalledWith('https://api.test/api/users', expect.objectContaining({
        method: 'GET',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer secret'
        }
      }));
      expect(users).toEqual([]);
    });

    it('handles network errors', async () => {
      (fetch as any).mockRejectedValue(new Error('no internet'));
      await expect(adapter.getUsers()).rejects.toThrow('HTTP request failed: no internet');
    });

    it('handles invalid JSON', async () => {
      const mockResponse = { ok: true, status: 200, json: async () => { throw new Error('syntax'); } };
      (fetch as any).mockResolvedValue(mockResponse);
      await expect(adapter.getUsers()).rejects.toThrow('HTTP 200: invalid JSON response');
    });

    it('handles API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        json: async () => ({ error: 'forbidden' })
      };
      (fetch as any).mockResolvedValue(mockResponse);
      await expect(adapter.getUsers()).rejects.toThrow('forbidden');
    });
  });

  describe('CryptoPasswordAdapter', () => {
    const adapter = new CryptoPasswordAdapter();

    it('hashes and verifies passwords correctly', async () => {
      const password = 'CorrectHorseBatteryStaple' as any;
      const hash = await adapter.hashPassword(password);
      expect(hash).toContain('pbkdf2_sha256');

      const match = await adapter.verifyPassword(password, hash);
      expect(match).toBe(true); // MATCH from taxonomy is true

      const fail = await adapter.verifyPassword('wrong' as any, hash);
      expect(fail).toBe(false); // NO_MATCH from taxonomy is false
    });

    it('generates secure passwords of requested length', () => {
      const p1 = adapter.generateSecurePassword(12 as any);
      expect(p1.length).toBe(12);

      const p2 = adapter.generateSecurePassword();
      expect(p2.length).toBe(18);

      // ValidationFieldError thrown with specific reason
      expect(() => adapter.generateSecurePassword(11 as any)).toThrow(ValidationFieldError);
      try {
        adapter.generateSecurePassword(11 as any);
      } catch (err) {
        expect((err as any).reason).toBe('Password length must be at least 12');
      }
    });

    it('generates random tokens', () => {
      const t1 = adapter.randomToken();
      expect(t1.length).toBeGreaterThan(30);

      const t2 = adapter.randomToken(16 as any);
      expect(t2).toBeDefined();
    });

    it('computes sha256 hex', async () => {
      const input = 'test' as any;
      const hex = await adapter.sha256Hex(input);
      // echo -n test | sha256sum -> 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
      expect(hex).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });
  });

  describe('SessionAuthAdapter', () => {
    let db: MockD1Database;
    let cryptoMock: any;
    let adapter: SessionAuthAdapter;

    beforeEach(() => {
      db = new MockD1Database();
      cryptoMock = {
        randomToken: vi.fn().mockReturnValue('mock-token'),
        sha256Hex: vi.fn().mockResolvedValue('mock-hash')
      };
      adapter = new SessionAuthAdapter(db as any, cryptoMock);
    });

    it('creates a session with a token and record', async () => {
      const spy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
      const result = await adapter.createSession('u1' as any, { userAgent: 'test' as any, clientIp: '1.1.1.1' as any });

      expect(result.token).toBeDefined();
      expect(result.session.userId).toBe('u1');
      expect(spy).toHaveBeenCalled();
    });

    it('validates a valid session token', async () => {
      vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({
        user_id: 'u1',
        email: 'u1@test.com',
        role: 'admin',
        effective_role: 'admin'
      });

      const res = await adapter.validateSession('some-token' as any);
      expect(res?.userId).toBe('u1');
      expect(res?.role).toBe('admin');
    });

    it('destroys a session', async () => {
      const spy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
      const deleted = await adapter.destroySession('token' as any);
      expect(deleted).toBe(true);
      expect(spy).toHaveBeenCalled();
    });

    it('extracts client IP from various headers', () => {
      const r1 = new Request('https://test', { headers: { 'cf-connecting-ip': '2.2.2.2' } });
      expect(adapter.extractClientIp(r1)).toBe('2.2.2.2');

      const r2 = new Request('https://test', { headers: { 'x-forwarded-for': '3.3.3.3, 4.4.4.4' } });
      expect(adapter.extractClientIp(r2)).toBe('3.3.3.3');

      const r3 = new Request('https://test');
      expect(adapter.extractClientIp(r3)).toBe('');
    });
  });
});
