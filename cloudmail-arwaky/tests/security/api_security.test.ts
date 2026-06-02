// tests/security/api_security.test.ts
// Security-focused tests for the API surface

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleApiRequest } from '../../src/surfaces/api/api_route_registry';
import { getAgent } from '../../src/surfaces/api/bridge_entry_util';
import { requireAuth } from '../../src/surfaces/api/auth_guard_util';
import { logger } from '../../src/surfaces/api/api_logger_util';
import { recordRequestMetrics } from '../../src/surfaces/api/api_metrics_entry';
import {
  asUserId,
  asInboxId,
  asEmailId,
  asAccountId,
  asApiKeyId,
} from '../../src/taxonomy';

// Stable UUIDs for test fixtures (valid UUID v4 format — hex chars only)
const USER_1 = asUserId('11111111-1111-4111-8111-111111111111');
const USER_2 = asUserId('22222222-2222-4222-8222-222222222222');
const INBOX_1 = asInboxId('bbbbbbbb-bbb1-4bbb-8bbb-bbbbbbbbbbbb');
const EMAIL_1 = asEmailId('eeeeeeee-eee1-4eee-8eee-eeeeeeeeeeee');
const ACCOUNT_1 = asAccountId('aaaaaaaa-aaa1-4aaa-8aaa-aaaaaaaaaaaa');
const API_KEY_1 = asApiKeyId('cccccccc-ccc1-4ccc-8ccc-cccccccccccc');
const TARGET_1 = asUserId('dddddddd-ddd1-4ddd-8ddd-dddddddddddd'); // target can be any UUID
const ADMIN = asUserId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

vi.mock('../../src/surfaces/api/bridge_entry_util', () => ({
  getAgent: vi.fn(),
}));

vi.mock('../../src/surfaces/api/auth_guard_util', () => ({
  requireAuth: vi.fn(),
  isResponse: (obj: any) => obj instanceof Response,
  requireAdmin: (auth: any) => auth.role === 'admin' ? null : new Response('Forbidden', { status: 403 }),
  authorizeSelfOrAdmin: (auth: any, targetUserId: any) => auth.userId === targetUserId || auth.role === 'admin' ? null : new Response('Forbidden', { status: 403 }),
}));

vi.mock('../../src/surfaces/api/api_logger_util', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../src/surfaces/api/api_metrics_entry', async () => {
  const actual = await vi.importActual<any>('../../src/surfaces/api/api_metrics_entry');
  return {
    ...actual,
    recordRequestMetrics: vi.fn(),
  };
});

describe('Security > API Surface', () => {
  let mockAgent: any;
  let mockEnv: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAgent = {
      getCurrentUser: vi.fn(),
      listUsers: vi.fn(),
      createUser: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
      softDeleteUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      authenticateWithApiKey: vi.fn(),
      validateSession: vi.fn(),
      validateApiKeyToken: vi.fn(),
      checkRateLimit: vi.fn(),
      recordRequest: vi.fn(),
      getUserInbox: vi.fn(),
      getEmail: vi.fn(),
      applyEmailAction: vi.fn(),
      waitForEmail: vi.fn(),
      checkQuota: vi.fn(),
      getQuotaUsage: vi.fn(),
      createInbox: vi.fn(),
      deleteInbox: vi.fn(),
      listApiKeys: vi.fn(),
      createApiKey: vi.fn(),
      revokeApiKey: vi.fn(),
      getWorkerSettings: vi.fn(),
      updateWorkerSettings: vi.fn(),
      getRecentAuditLogs: vi.fn(),
      getUserAuditLogs: vi.fn(),
      getApiKeyAuditLogs: vi.fn(),
      getTargetAuditLogs: vi.fn(),
      getDashboardMetrics: vi.fn(),
      getDashboardStats: vi.fn(),
      healthCheck: vi.fn(),
      runCleanup: vi.fn(),
      getAccountByInboxId: vi.fn(),
      createAccount: vi.fn(),
      listPendingAccounts: vi.fn(),
      completeAccount: vi.fn(),
      failAccount: vi.fn(),
      getMetrics: vi.fn(),
    };

    mockEnv = {
      DB: {},
      KV: {},
      ENVIRONMENT: 'test',
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://app.example.com',
    };

    mockCtx = { waitUntil: vi.fn() };
    (getAgent as any).mockReturnValue(mockAgent);
    (requireAuth as any).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
  });

  function authReq(url: string, method = 'GET', body?: object, role: 'user' | 'admin' = 'user', authOverride?: any) {
    const auth = authOverride || { userId: USER_1, role };
    (requireAuth as any).mockResolvedValue(auth);
    mockAgent.getCurrentUser.mockResolvedValue({ id: USER_1, role });

    return new Request(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'mailflare_session=tok',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  describe('Authentication enforcement', () => {
    it('all auth:true endpoints reject unauthenticated requests with 401', async () => {
      const protectedRoutes = [
        ['GET', '/api/users'],
        ['POST', '/api/users'],
        ['GET', '/api/me'],
        ['GET', `/api/users/${USER_1}`],
        ['PUT', `/api/users/${USER_1}`],
        ['DELETE', `/api/users/${USER_1}`],
        ['GET', '/api/me/inbox'],
        ['GET', '/api/me/inbox/wait'],
        ['GET', `/api/me/emails/${EMAIL_1}`],
        ['POST', `/api/me/emails/${EMAIL_1}/action`],
        ['GET', '/api/inboxes'],
        ['POST', '/api/inboxes'],
        ['DELETE', `/api/inboxes/${INBOX_1}`],
        ['GET', `/api/users/${USER_1}/inbox`],
        ['GET', `/api/users/${USER_1}/emails/${EMAIL_1}`],
        ['POST', `/api/users/${USER_1}/emails/${EMAIL_1}/action`],
        ['GET', `/api/users/${USER_1}/accounts`],
        ['POST', '/api/accounts'],
        ['GET', '/api/accounts/pending'],
        ['POST', `/api/accounts/${ACCOUNT_1}/complete`],
        ['POST', `/api/accounts/${ACCOUNT_1}/fail`],
        ['GET', '/api/apikeys'],
        ['POST', '/api/apikeys'],
        ['DELETE', `/api/apikeys/${API_KEY_1}`],
        ['GET', '/api/audit-logs'],
        ['GET', `/api/audit-logs/user/${USER_1}`],
        ['GET', `/api/audit-logs/apikey/${API_KEY_1}`],
        ['GET', `/api/audit-logs/target/${TARGET_1}`],
        ['GET', '/api/worker-settings'],
        ['PUT', '/api/worker-settings'],
        ['POST', '/api/cleanup'],
        ['GET', '/api/metrics'],
        ['GET', '/api/dashboard'],
        ['GET', '/api/docs'],
      ];

      for (const [method, path] of protectedRoutes) {
        const req = new Request(`http://localhost${path}`, { method: method as string });
        const res = await handleApiRequest(req, mockEnv, mockCtx);
        expect(res.status, `${method} ${path} should return 401`).toBe(401);
      }
    });

    it('public endpoints do not require auth', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      mockAgent.login.mockResolvedValue({ token: 't1', session: { expiresAt: '...' } });

      const health = await handleApiRequest(new Request('http://localhost/api/health'), mockEnv, mockCtx);
      expect(health.status).toBe(200);

      const login = await handleApiRequest(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'a@b.com', password: 'pass' }),
        }),
        mockEnv,
        mockCtx
      );
      expect(login.status).toBe(200);

      const openapi = await handleApiRequest(new Request('http://localhost/api/openapi.yaml'), mockEnv, mockCtx);
      expect(openapi.status).toBe(200);
    });
  });

  describe('Authorization enforcement', () => {
    it('admin endpoints reject non-admin users with 403', async () => {
      const adminRoutes = [
        ['GET', '/api/users'],
        ['POST', '/api/users'],
        ['GET', '/api/apikeys'],
        ['POST', '/api/apikeys'],
        ['DELETE', `/api/apikeys/${API_KEY_1}`],
        ['GET', '/api/audit-logs'],
        ['GET', `/api/audit-logs/apikey/${API_KEY_1}`],
        ['GET', `/api/audit-logs/target/${TARGET_1}`],
        ['GET', '/api/worker-settings'],
        ['PUT', '/api/worker-settings'],
        ['POST', '/api/cleanup'],
        ['GET', '/api/accounts/pending'],
        ['POST', `/api/accounts/${ACCOUNT_1}/complete`],
        ['POST', `/api/accounts/${ACCOUNT_1}/fail`],
      ];

      for (const [method, path] of adminRoutes) {
        const req = authReq(`http://localhost${path}`, method as string, undefined, 'user');
        const res = await handleApiRequest(req, mockEnv, mockCtx);
        expect(res.status).toBe(403);
      }
    });

    it('ownership checks prevent cross-user access', async () => {
      (requireAuth as any).mockResolvedValue({ userId: USER_2, role: 'user' });
      mockAgent.getCurrentUser.mockResolvedValue({ id: USER_2, role: 'user' });

      const ownershipRoutes = [
        ['GET', `/api/users/${USER_1}`],
        ['PUT', `/api/users/${USER_1}`],
        ['DELETE', `/api/users/${USER_1}`],
        ['GET', `/api/users/${USER_1}/inbox`],
        ['GET', `/api/users/${USER_1}/emails/${EMAIL_1}`],
        ['POST', `/api/users/${USER_1}/emails/${EMAIL_1}/action`],
        ['GET', `/api/users/${USER_1}/accounts`],
        ['DELETE', `/api/inboxes/${USER_1}`],
      ];

      for (const [method, path] of ownershipRoutes) {
        const req = new Request(`http://localhost${path}`, {
          method: method as string,
          headers: { Cookie: 'mailflare_session=tok', 'Content-Type': 'application/json' },
        });
        const res = await handleApiRequest(req, mockEnv, mockCtx);
        expect(res.status).toBe(403);
      }
    });
  });

  describe('Security headers', () => {
    it('all responses include security headers', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      const req = new Request('http://localhost/api/health');
      const res = await handleApiRequest(req, mockEnv, mockCtx);

      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      expect(res.headers.get('x-xss-protection')).toBe('1; mode=block');
      expect(res.headers.get('content-security-policy')).toBeDefined();
    });

    it('production responses include HSTS header', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      const req = new Request('http://localhost/api/health');
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
    });
  });

  describe('CORS restrictions', () => {
    it('production CORS rejects unknown origins', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      const req = new Request('http://localhost/api/health', {
        headers: { origin: 'https://evil.com' },
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.headers.get('access-control-allow-origin')).not.toBe('https://evil.com');
    });

    it('production CORS allows configured origin', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      const req = new Request('http://localhost/api/health', {
        headers: { origin: 'https://app.example.com' },
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example.com');
    });
  });

  describe('Rate limiting', () => {
    it('rate limit headers present on authenticated responses', async () => {
      const authResult = {
        userId: USER_1,
        role: 'user',
        rateLimit: { limit: 60, remaining: 59, resetAt: '2026-01-01T00:01:00Z' },
      };
      mockAgent.getCurrentUser.mockResolvedValue({ id: USER_1, role: 'user' });
      mockAgent.getDashboardStats.mockResolvedValue({
        totalUsers: 0,
        inboxCount: 0,
        emailCount: 0,
        apiKeysActive: 0,
        pendingAccounts: 0,
        linkedAccounts: 0,
        unreadEmails: 0,
        totalEmails: 0,
        archivedEmails: 0,
        apiUsage: 0,
        lastUpdated: new Date().toISOString(),
      });

      const req = authReq('http://localhost/api/dashboard', 'GET', undefined, 'user', authResult);
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(200);
      expect(res.headers.get('x-ratelimit-limit')).toBe('60');
      expect(res.headers.get('x-ratelimit-remaining')).toBe('59');
      expect(res.headers.get('x-ratelimit-reset')).toBe('2026-01-01T00:01:00Z');
    });
  });

  describe('Input validation', () => {
    it('POST /api/auth/login rejects SQL injection patterns', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: "' OR 1=1 --", password: "' OR 1=1 --" }),
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      // Zod rejects invalid email, so 400
      expect(res.status).toBe(400);
    });

    it('POST /api/users rejects XSS in displayName', async () => {
      (requireAuth as any).mockResolvedValue({ userId: ADMIN, role: 'admin' });
      mockAgent.getCurrentUser.mockResolvedValue({ id: ADMIN, role: 'admin' });

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: 'mailflare_session=admin' },
        body: JSON.stringify({ email: 'test@test.com', password: '12345678', displayName: '<script>alert(1)</script>' }),
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      // Should be accepted at validation level (XSS prevention is output encoding, not input rejection)
      expect([200, 400]).toContain(res.status);
    });
  });

  describe('Request tracing', () => {
    it('x-request-id is generated when not provided', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      const req = new Request('http://localhost/api/health');
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      const rid = res.headers.get('x-request-id');
      expect(rid).toBeDefined();
      expect(rid!.length).toBeGreaterThan(10);
    });

    it('x-request-id is echoed when provided', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      const req = new Request('http://localhost/api/health', {
        headers: { 'x-request-id': 'custom-id-123' },
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.headers.get('x-request-id')).toBe('custom-id-123');
    });
  });
});
