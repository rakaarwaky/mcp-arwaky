// tests/e2e/api_e2e.test.ts
// End-to-end API flows through handleApiRequest

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleApiRequest } from '../../src/surfaces/api/api_route_registry';
import { getAgent } from '../../src/surfaces/api/bridge_entry_util';
import { requireAuth } from '../../src/surfaces/api/auth_guard_util';
import { logger } from '../../src/surfaces/api/api_logger_util';
import { recordRequestMetrics } from '../../src/surfaces/api/api_metrics_entry';
import { asUserId } from '../../src/taxonomy';

// Stable UUIDs for test fixtures (valid UUID v4 format)
const USER_1 = asUserId('11111111-1111-4111-8111-111111111111');
const USER_2 = asUserId('22222222-2222-4222-8222-222222222222');
const ADMIN = asUserId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
const NEW_USER = asUserId('99999999-9999-4999-8999-999999999999');

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

vi.mock('../../src/surfaces/api/api_metrics_entry', () => ({
  recordRequestMetrics: vi.fn(),
  handleGetMetrics: vi.fn().mockImplementation(() => {
    return Promise.resolve(new Response('metrics', { status: 200 }));
  }),
}));

describe('E2E > API Flows', () => {
  let mockAgent: any;
  let mockEnv: any;
  let mockCtx: any;
  let sessionCounter = 0;

  function nextSession() {
    sessionCounter++;
    return `session-${sessionCounter}`;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    sessionCounter = 0;

    mockAgent = {
      login: vi.fn(),
      logout: vi.fn(),
      authenticateWithApiKey: vi.fn(),
      validateSession: vi.fn(),
      validateApiKeyToken: vi.fn(),
      checkRateLimit: vi.fn(),
      recordRequest: vi.fn(),
      getCurrentUser: vi.fn(),
      listUsers: vi.fn(),
      createUser: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
      softDeleteUser: vi.fn(),
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
      NODE_ENV: 'test',
    };

    mockCtx = { waitUntil: vi.fn() };
    (getAgent as any).mockReturnValue(mockAgent);

    // Default: no auth (unauthenticated)
    (requireAuth as any).mockResolvedValue(new Response('Unauthorized', { status: 401 }));
  });

  describe('Public endpoints', () => {
    it('GET /api/health -> 200', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      const req = new Request('http://localhost/api/health');
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.ok).toBe(true);
    });

    it('GET /api/openapi.yaml -> 200 yaml', async () => {
      const req = new Request('http://localhost/api/openapi.yaml');
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/yaml');
    });
  });

  describe('Auth flow', () => {
    it('POST /api/auth/login -> 200, then GET /api/me -> 200', async () => {
      mockAgent.login.mockResolvedValue({ token: 't1', session: { expiresAt: '2026-01-01' } });
      mockAgent.getCurrentUser.mockResolvedValue({ id: USER_1, email: 'u1@test.com' });

      // Login
      const loginReq = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'u1@test.com', password: 'pass' }),
      });
      const loginRes = await handleApiRequest(loginReq, mockEnv, mockCtx);
      expect(loginRes.status).toBe(200);

      // Authenticated /me request
      (requireAuth as any).mockResolvedValue({ userId: USER_1, role: 'user' });
      const meReq = new Request('http://localhost/api/me', {
        headers: { Cookie: 'mailflare_session=t1' },
      });
      const meRes = await handleApiRequest(meReq, mockEnv, mockCtx);
      expect(meRes.status).toBe(200);
    });

    it('POST /api/auth/logout -> 200 clears session', async () => {
      const req = new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { Cookie: 'mailflare_session=t1' },
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });
  });

  describe('Admin CRUD flow', () => {
    it('full user lifecycle: create -> list -> get -> update -> delete', async () => {
      (requireAuth as any).mockResolvedValue({ userId: ADMIN, role: 'admin' });
      mockAgent.getCurrentUser.mockResolvedValue({ id: ADMIN, role: 'admin' });

      // Create
      mockAgent.createUser.mockResolvedValue({
        user: { id: NEW_USER, email: { full: 'new@test.com' }, passwordHash: 'HASH' }
      });
      const createReq = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: 'mailflare_session=admin' },
        body: JSON.stringify({ email: 'new@test.com', password: '12345678' }),
      });
      const createRes = await handleApiRequest(createReq, mockEnv, mockCtx);
      expect(createRes.status).toBe(200);
      const createData = await createRes.json() as any;
      expect(createData.user.id).toBe(NEW_USER);

      // List
      mockAgent.listUsers.mockResolvedValue([{ id: NEW_USER, email: 'new@test.com' }]);
      const listReq = new Request('http://localhost/api/users', {
        headers: { Cookie: 'mailflare_session=admin' },
      });
      const listRes = await handleApiRequest(listReq, mockEnv, mockCtx);
      expect(listRes.status).toBe(200);

      // Get
      mockAgent.getUser.mockResolvedValue({ id: NEW_USER, email: 'new@test.com' });
      const getReq = new Request(`http://localhost/api/users/${NEW_USER}`, {
        headers: { Cookie: 'mailflare_session=admin' },
      });
      const getRes = await handleApiRequest(getReq, mockEnv, mockCtx);
      expect(getRes.status).toBe(200);

      // Update
      mockAgent.updateUser.mockResolvedValue({ id: NEW_USER, email: 'updated@test.com' });
      const updateReq = new Request(`http://localhost/api/users/${NEW_USER}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: 'mailflare_session=admin' },
        body: JSON.stringify({ email: 'updated@test.com' }),
      });
      const updateRes = await handleApiRequest(updateReq, mockEnv, mockCtx);
      expect(updateRes.status).toBe(200);

      // Delete
      mockAgent.softDeleteUser.mockResolvedValue({ deleted: true });
      const deleteReq = new Request(`http://localhost/api/users/${NEW_USER}`, {
        method: 'DELETE',
        headers: { Cookie: 'mailflare_session=admin' },
      });
      const deleteRes = await handleApiRequest(deleteReq, mockEnv, mockCtx);
      expect(deleteRes.status).toBe(200);
    });
  });

  describe('Ownership enforcement', () => {
    it('user cannot access another users profile', async () => {
      (requireAuth as any).mockResolvedValue({ userId: USER_2, role: 'user' });
      mockAgent.getCurrentUser.mockResolvedValue({ id: USER_2, role: 'user' });
      mockAgent.getUser.mockResolvedValue({ id: USER_1, email: 'u1@test.com' });

      const req = new Request(`http://localhost/api/users/${USER_1}`, {
        headers: { Authorization: 'Bearer tok' },
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('user cannot delete another users inbox', async () => {
      (requireAuth as any).mockResolvedValue({ userId: USER_2, role: 'user' });
      mockAgent.getCurrentUser.mockResolvedValue({ id: USER_2, role: 'user' });

      const req = new Request(`http://localhost/api/inboxes/${USER_1}`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer tok' },
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });
  });

  describe('Validation enforcement', () => {
    it('POST /api/users with invalid email -> 400', async () => {
      (requireAuth as any).mockResolvedValue({ userId: ADMIN, role: 'admin' });
      mockAgent.getCurrentUser.mockResolvedValue({ id: ADMIN, role: 'admin' });

      const req = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: 'mailflare_session=admin' },
        body: JSON.stringify({ email: 'not-email', password: '12345678' }),
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(400);
    });

    it('POST /api/auth/login with missing password -> 400', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.com' }),
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(400);
    });
  });

  describe('Error handling', () => {
    it('unknown route -> 404 with x-request-id', async () => {
      const req = new Request('http://localhost/api/unknown-route');
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(404);
      expect(res.headers.get('x-request-id')).toBeDefined();
    });

    it('handler throws -> 500 with error code', async () => {
      (requireAuth as any).mockResolvedValue({ userId: USER_1, role: 'user' });
      mockAgent.getCurrentUser.mockRejectedValue(new Error('DB exploded'));
      const req = new Request('http://localhost/api/me', {
        headers: { Cookie: 'mailflare_session=t1' },
      });
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.status).toBe(500);
      const data = await res.json() as any;
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Observability headers', () => {
    it('all responses include x-request-id and CORS', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      const req = new Request('http://localhost/api/health');
      const res = await handleApiRequest(req, mockEnv, mockCtx);
      expect(res.headers.get('x-request-id')).toBeDefined();
      expect(res.headers.get('access-control-allow-origin')).toBeDefined();
    });
  });
});
