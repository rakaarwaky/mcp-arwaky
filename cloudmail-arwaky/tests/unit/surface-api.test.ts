// tests/unit/surface-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asUserId, asName, asApiKeyId, asEmailId } from '../../src/taxonomy';
import type { UserId, AccountId, ApiKeyId } from '../../src/taxonomy';
import { getAgent } from '../../src/surfaces/api/bridge_entry_util';
import { requireAuth } from '../../src/surfaces/api/auth_guard_util';

vi.mock('../../src/surfaces/api/bridge_entry_util', () => ({
  getAgent: vi.fn(),
}));

vi.mock('../../src/surfaces/api/auth_guard_util', () => ({
  requireAuth: vi.fn(),
  isResponse: (obj: any) => obj instanceof Response,
  requireAdmin: (auth: any) => auth.role === 'admin' ? null : new Response('Forbidden', { status: 403 }),
  authorizeSelfOrAdmin: (auth: any, targetUserId: any) => auth.userId === targetUserId || auth.role === 'admin' ? null : new Response('Forbidden', { status: 403 }),
}));

// API Handlers
import {
  handleListUsers,
  handleCreateUser,
  handleGetUser,
  handleUpdateUser,
  handleDeleteUser,
  handleGetCurrentUser
} from '../../src/surfaces/api/api_users_entry';
import { handleLogin, handleLogout, handleApiKeyAuth } from '../../src/surfaces/api/api_auth_entry';
import {
  handleGetInbox,
  handleGetEmail,
  handleWaitForEmail,
  handleEmailQuickAction,
  handleCreateInbox,
  handleDeleteInbox,
  handleListInboxes,
  handleGetUserInbox,
  handleGetUserEmail,
  handleUserEmailQuickAction
} from '../../src/surfaces/api/api_inbox_entry';
import { handleListApiKeys, handleCreateApiKey, handleRevokeApiKey } from '../../src/surfaces/api/api_apikey_entry';
import { handleGetSettings, handleUpdateSettings } from '../../src/surfaces/api/api_settings_entry';
import {
  handleGetAuditLogs,
  handleGetUserAuditLogs,
  handleGetApiKeyAuditLogs,
  handleGetTargetAuditLogs
} from '../../src/surfaces/api/api_audit_entry';
import { handleDashboard } from '../../src/surfaces/api/api_dashboard_entry';
import { handleHealth } from '../../src/surfaces/api/api_health_entry';
import { handleCleanup } from '../../src/surfaces/api/api_cleanup_entry';
import {
  handleListAccounts,
  handleCreateAccount,
  handleListPendingAccounts,
  handleCompleteAccount,
  handleFailAccount
} from '../../src/surfaces/api/api_accounts_entry';
import { handleGetMetrics } from '../../src/surfaces/api/api_metrics_entry';

// ── UUID test constants ──
const USER_ID_1 = '11111111-1111-1111-1111-111111111111' as UserId;
const USER_ID_2 = '22222222-2222-2222-2222-222222222222' as UserId;
const ADMIN_ID   = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UserId;
const INBOX_ID_1 = USER_ID_1;
const EMAIL_ID_1  = '33333333-3333-3333-3333-333333333333';
const ACCOUNT_ID_1 = '55555555-5555-5555-5555-555555555555';
const API_KEY_ID_1 = '66666666-6666-6666-6666-666666666666';

const UNAUTHORIZED = () => new Response('Unauthorized', { status: 401 });

function jsonRequest(url: string, method: string, body?: object): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Surfaces > API Handlers', () => {
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
      deleteUser: vi.fn(),
      softDeleteUser: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      authenticateWithApiKey: vi.fn(),
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
      getDashboardStats: vi.fn(),
      healthCheck: vi.fn(),
      runCleanup: vi.fn(),
      getEmailGlobal: vi.fn(),
      deleteEmail: vi.fn(),
      getAccountByInboxId: vi.fn(),
      createAccount: vi.fn(),
      listPendingAccounts: vi.fn(),
      completeAccount: vi.fn(),
      failAccount: vi.fn(),
      getMetrics: vi.fn(),
    };

    mockEnv = { DB: {}, KV: {} };
    mockCtx = { waitUntil: vi.fn() };

    (getAgent as any).mockReturnValue(mockAgent);
    (requireAuth as any).mockResolvedValue(UNAUTHORIZED());
  });

  // ── Helpers ──
  function mockAdminAuth() {
    (requireAuth as any).mockResolvedValue({ userId: asUserId(ADMIN_ID), role: 'admin' });
    mockAgent.getCurrentUser.mockResolvedValue({ id: ADMIN_ID, role: 'admin' });
    mockAgent.getUser.mockResolvedValue({ id: ADMIN_ID, role: 'admin' });
  }

  function mockUserAuth(uid = USER_ID_1) {
    (requireAuth as any).mockResolvedValue({ userId: asUserId(uid), role: 'agent' });
    mockAgent.getCurrentUser.mockResolvedValue({ id: uid, role: 'agent' });
    mockAgent.getUser.mockResolvedValue({ id: uid, role: 'agent' });
  }

  function mockNoAuth() {
    (requireAuth as any).mockResolvedValue(UNAUTHORIZED());
  }

  // ═══════════════════════════════════════════════════════
  //  AUTH SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Auth Surface', () => {
    it('handleLogin -> returns token on success', async () => {
      mockAgent.login.mockResolvedValue({ token: 't1', session: { expiresAt: '2026-01-01' } });
      const req = jsonRequest('http://api/login', 'POST', { email: 'u1@test.com', password: 'pass' });
      const res = await handleLogin(req, mockEnv, mockCtx);
      const data = await res.json() as any;
      expect(res.status).toBe(200);
      expect(data.token).toBe('t1');
    });

    it('handleLogin -> 400 on invalid content-type', async () => {
      const req = new Request('http://api/login', { method: 'POST', body: '{}' });
      const res = await handleLogin(req, mockEnv, mockCtx);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('INVALID_CONTENT_TYPE');
    });

    it('handleLogin -> 400 on missing email', async () => {
      const req = jsonRequest('http://api/login', 'POST', { password: 'pass' });
      const res = await handleLogin(req, mockEnv, mockCtx);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleLogin -> 400 on invalid email format', async () => {
      const req = jsonRequest('http://api/login', 'POST', { email: 'not-email', password: 'pass' });
      const res = await handleLogin(req, mockEnv, mockCtx);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleLogin -> 401 on failed auth', async () => {
      mockAgent.login.mockRejectedValue(new Error('Invalid credentials'));
      const req = jsonRequest('http://api/login', 'POST', { email: 'u1@test.com', password: 'wrong' });
      const res = await handleLogin(req, mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleLogin -> 429 on rate limit', async () => {
      mockAgent.login.mockRejectedValue(new Error('rate limit exceeded'));
      const req = jsonRequest('http://api/login', 'POST', { email: 'u1@test.com', password: 'pass' });
      const res = await handleLogin(req, mockEnv, mockCtx);
      expect(res.status).toBe(429);
    });

    it('handleLogout -> calls agent logout via cookie', async () => {
      const req = new Request('http://api/logout', { headers: { Cookie: 'mailflare_session=t1' } });
      await handleLogout(req, mockEnv, mockCtx);
      expect(mockAgent.logout).toHaveBeenCalledWith('t1');
    });

    it('handleLogout -> ok even without cookie', async () => {
      const req = new Request('http://api/logout');
      const res = await handleLogout(req, mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleApiKeyAuth -> returns token', async () => {
      mockAgent.authenticateWithApiKey.mockResolvedValue({ token: 't2', apiKeyId: 'k1' });
      const req = jsonRequest('http://api/auth/apikey', 'POST', { apiKey: 'sk-cf_123' });
      const res = await handleApiKeyAuth(req, mockEnv, mockCtx);
      const data = await res.json() as any;
      expect(res.status).toBe(200);
      expect(data.token).toBe('t2');
    });

    it('handleApiKeyAuth -> 400 on missing apiKey', async () => {
      const req = jsonRequest('http://api/auth/apikey', 'POST', {});
      const res = await handleApiKeyAuth(req, mockEnv, mockCtx);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleApiKeyAuth -> 401 on failed auth', async () => {
      mockAgent.authenticateWithApiKey.mockRejectedValue(new Error('Invalid key'));
      const req = jsonRequest('http://api/auth/apikey', 'POST', { apiKey: 'bad' });
      const res = await handleApiKeyAuth(req, mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  USERS SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Users Surface', () => {
    it('handleListUsers -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleListUsers(new Request('http://api/users'), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleListUsers -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleListUsers(new Request('http://api/users'), mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('handleListUsers -> 200 for admin, sanitizes passwords', async () => {
      mockAdminAuth();
      mockAgent.listUsers.mockResolvedValue([{ id: 'u2', email: 'u2@test.com', passwordHash: 'SECRET' }]);
      const res = await handleListUsers(new Request('http://api/users'), mockEnv, mockCtx);
      const data = await res.json() as any;
      expect(res.status).toBe(200);
      expect(data.users[0]!.passwordHash).toBeUndefined();
    });

    it('handleCreateUser -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleCreateUser(jsonRequest('http://api/users', 'POST', { email: 'a@b.com', password: '12345678' }), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleCreateUser -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleCreateUser(jsonRequest('http://api/users', 'POST', { email: 'a@b.com', password: '12345678' }), mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('handleCreateUser -> 400 on validation error', async () => {
      mockAdminAuth();
      const res = await handleCreateUser(jsonRequest('http://api/users', 'POST', { email: 'bad', password: 'short' }), mockEnv, mockCtx);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleCreateUser -> 200 for admin', async () => {
      mockAdminAuth();
      mockAgent.createUser.mockResolvedValue({
        user: { id: 'u99', email: { full: 'a@b.com' } as any, passwordHash: 'HASH' } as any,
        credentials: { username: 'a', email: { full: 'a@b.com' } as any, password: '123' as any }
      });
      const res = await handleCreateUser(jsonRequest('http://api/users', 'POST', { email: 'user@example.com', password: '12345678' }), mockEnv, mockCtx);
      const data = await res.json() as any;
      expect(res.status).toBe(200);
      expect(data.user.passwordHash).toBeUndefined();
    });

    it('handleGetUser -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleGetUser(new Request('http://api/users/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(401);
    });

    it('handleGetUser -> 403 for wrong user + non-admin', async () => {
      mockUserAuth(USER_ID_2);
      const res = await handleGetUser(new Request('http://api/users/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleGetUser -> 404 when user not found', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getUser.mockResolvedValue(null);
      const res = await handleGetUser(new Request('http://api/users/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(404);
    });

    it('handleGetUser -> 200 for self', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getUser.mockResolvedValue({ id: 'u1', email: 'u1@test.com', passwordHash: 'HASH' });
      const res = await handleGetUser(new Request('http://api/users/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      const data = await res.json() as any;
      expect(res.status).toBe(200);
      expect(data.user.passwordHash).toBeUndefined();
    });

    it('handleGetUser -> 200 for admin viewing other user', async () => {
      mockAdminAuth();
      mockAgent.getUser.mockResolvedValue({ id: 'u2', email: 'u2@test.com', passwordHash: 'HASH' });
      const res = await handleGetUser(new Request('http://api/users/u2'), mockEnv, mockCtx, { userId: USER_ID_2 });
      expect(res.status).toBe(200);
    });

    it('handleUpdateUser -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleUpdateUser(jsonRequest('http://api/users/u1', 'PUT', { email: 'new@test.com' }), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(401);
    });

    it('handleUpdateUser -> 403 for wrong user + non-admin', async () => {
      mockUserAuth(USER_ID_2);
      const res = await handleUpdateUser(jsonRequest('http://api/users/u1', 'PUT', { email: 'new@test.com' }), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleUpdateUser -> 400 on validation error', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleUpdateUser(jsonRequest('http://api/users/u1', 'PUT', { email: 'not-email' }), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleUpdateUser -> 400 on invalid content-type', async () => {
      mockUserAuth(USER_ID_1);
      // Create a request with text/plain body, which safeParse will fail on or we can mock for error
      const req = new Request('http://api/users/u1', { 
        method: 'PUT', 
        headers: { 'content-type': 'text/plain' },
        body: 'not-json' 
      });
      const res = await handleUpdateUser(req, mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleUpdateUser -> 200 for self', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.updateUser.mockResolvedValue({ id: 'u1', email: 'new@test.com', passwordHash: 'HASH' });
      const res = await handleUpdateUser(jsonRequest('http://api/users/u1', 'PUT', { email: 'new@test.com' }), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(200);
    });

    it('handleDeleteUser -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleDeleteUser(new Request('http://api/users/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(401);
    });

    it('handleDeleteUser -> 403 for wrong user + non-admin', async () => {
      mockUserAuth(USER_ID_2);
      const res = await handleDeleteUser(new Request('http://api/users/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleDeleteUser -> 404 when user not found', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.softDeleteUser.mockResolvedValue({ deleted: false, reason: 'not_found' });
      const res = await handleDeleteUser(new Request('http://api/users/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(404);
    });

    it('handleDeleteUser -> 400 on protected owner', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.softDeleteUser.mockResolvedValue({ deleted: false, reason: 'protected_owner' });
      const res = await handleDeleteUser(new Request('http://api/users/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(400);
    });

    it('handleDeleteUser -> 200 for self', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.softDeleteUser.mockResolvedValue({ deleted: true });
      const res = await handleDeleteUser(new Request('http://api/users/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(200);
    });

    it('handleGetCurrentUser -> 401 without session', async () => {
      mockNoAuth();
      const res = await handleGetCurrentUser(new Request('http://api/me'), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleGetCurrentUser -> 404 when user not found', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getCurrentUser.mockResolvedValue(null);
      const res = await handleGetCurrentUser(new Request('http://api/me'), mockEnv, mockCtx);
      expect(res.status).toBe(404);
    });

    it('handleGetCurrentUser -> 200 with user', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getCurrentUser.mockResolvedValue({ id: 'u1', email: 'u1@test.com', passwordHash: 'HASH' });
      const res = await handleGetCurrentUser(new Request('http://api/me'), mockEnv, mockCtx);
      const data = await res.json() as any;
      expect(res.status).toBe(200);
      expect(data.user.passwordHash).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════
  //  INBOX SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Inbox Surface', () => {
    it('handleGetInbox -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleGetInbox(new Request('http://api/me/inbox'), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleGetInbox -> 200 returns emails', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getUserInbox.mockResolvedValue({ emails: [{ id: 'e1' }], archivedCount: 0 });
      const res = await handleGetInbox(new Request('http://api/me/inbox'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleGetEmail -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleGetEmail(new Request('http://api/me/emails/e1'), mockEnv, mockCtx, { emailId: EMAIL_ID_1 });
      expect(res.status).toBe(401);
    });

    it('handleGetEmail -> 404 when email not found', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getEmail.mockResolvedValue(null);
      const res = await handleGetEmail(new Request('http://api/me/emails/e1'), mockEnv, mockCtx, { emailId: EMAIL_ID_1 });
      expect(res.status).toBe(404);
    });

    it('handleGetEmail -> 200 returns email', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getEmail.mockResolvedValue({ id: 'e1', subject: 'Hello' });
      const res = await handleGetEmail(new Request('http://api/me/emails/e1'), mockEnv, mockCtx, { emailId: EMAIL_ID_1 });
      expect(res.status).toBe(200);
    });

    it('handleWaitForEmail -> 408 on timeout', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.waitForEmail.mockResolvedValue(null);
      const res = await handleWaitForEmail(new Request('http://api/me/inbox/wait'), mockEnv, mockCtx);
      expect(res.status).toBe(408);
    });

    it('handleWaitForEmail -> 200 when email arrives', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.waitForEmail.mockResolvedValue({ id: 'e1', subject: 'Hello' });
      const res = await handleWaitForEmail(new Request('http://api/me/inbox/wait'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleEmailQuickAction -> 400 on invalid action', async () => {
      mockUserAuth(USER_ID_1);
      const req = jsonRequest('http://api/me/emails/e1/action', 'POST', { action: 'invalid' });
      const res = await handleEmailQuickAction(req, mockEnv, mockCtx, { emailId: EMAIL_ID_1 });
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleEmailQuickAction -> 200 on valid action', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getEmailGlobal.mockResolvedValue({ id: 'e1', inboxId: USER_ID_1 });
      mockAgent.applyEmailAction.mockResolvedValue({ updated: true });
      const req = jsonRequest('http://api/me/emails/e1/action', 'POST', { action: 'star' });
      const res = await handleEmailQuickAction(req, mockEnv, mockCtx, { emailId: EMAIL_ID_1 });
      expect(res.status).toBe(200);
    });

    it('handleCreateInbox -> 401 without auth', async () => {
      mockNoAuth();
      const req = jsonRequest('http://api/inboxes', 'POST', {});
      const res = await handleCreateInbox(req, mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleCreateInbox -> 429 when quota exceeded', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.checkQuota.mockResolvedValue({ allowed: false, remainingInboxes: 0 });
      const req = jsonRequest('http://api/inboxes', 'POST', {});
      const res = await handleCreateInbox(req, mockEnv, mockCtx);
      expect(res.status).toBe(429);
    });

    it('handleCreateInbox -> 400 on validation error', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.checkQuota.mockResolvedValue({ allowed: true });
      const req = jsonRequest('http://api/inboxes', 'POST', { username: 'a'.repeat(100) });
      const res = await handleCreateInbox(req, mockEnv, mockCtx);
      expect(res.status).toBe(400);
    });

    it('handleCreateInbox -> 200 creates inbox', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.checkQuota.mockResolvedValue({ allowed: true });
      mockAgent.createUser.mockResolvedValue({
        user: { id: 'i1', email: { full: 'i1@test.com' }, createdAt: '...' },
        credentials: { username: 'i1', email: { full: 'i1@test.com' }, password: '...' }
      });
      const req = jsonRequest('http://api/inboxes', 'POST', { username: 'test' });
      const res = await handleCreateInbox(req, mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleDeleteInbox -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleDeleteInbox(new Request('http://api/inboxes/i1'), mockEnv, mockCtx, { inboxId: INBOX_ID_1 });
      expect(res.status).toBe(401);
    });

    it('handleDeleteInbox -> 403 for wrong user + non-admin', async () => {
      mockUserAuth(USER_ID_2);
      const res = await handleDeleteInbox(new Request('http://api/inboxes/i1'), mockEnv, mockCtx, { inboxId: INBOX_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleDeleteInbox -> 404 when inbox not found', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.softDeleteUser.mockResolvedValue({ deleted: false, reason: 'not_found' });
      const res = await handleDeleteInbox(new Request('http://api/inboxes/i1'), mockEnv, mockCtx, { inboxId: INBOX_ID_1 });
      expect(res.status).toBe(404);
    });

    it('handleDeleteInbox -> 200 for self', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.softDeleteUser.mockResolvedValue({ deleted: true });
      mockAgent.getUserInbox.mockResolvedValue({ emails: [] });
      const res = await handleDeleteInbox(new Request('http://api/inboxes/i1'), mockEnv, mockCtx, { inboxId: INBOX_ID_1 });
      expect(res.status).toBe(200);
    });

    it('handleListInboxes -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleListInboxes(new Request('http://api/inboxes'), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleListInboxes -> 200 returns inboxes with quota', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getCurrentUser.mockResolvedValue({ id: 'u1', email: { full: 'u1@test.com' } });
      mockAgent.getQuotaUsage.mockResolvedValue({ currentInboxes: 1 });
      mockAgent.checkQuota.mockResolvedValue({ remainingInboxes: 5 });
      const res = await handleListInboxes(new Request('http://api/inboxes'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleGetUserInbox -> 403 for wrong user + non-admin', async () => {
      mockUserAuth(USER_ID_2);
      const res = await handleGetUserInbox(new Request('http://api/users/u1/inbox'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleGetUserInbox -> 200 for admin', async () => {
      mockAdminAuth();
      mockAgent.getUserInbox.mockResolvedValue({ emails: [], archivedCount: 0 });
      const res = await handleGetUserInbox(new Request('http://api/users/u1/inbox'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(200);
    });

    it('handleGetUserEmail -> 403 for wrong user + non-admin', async () => {
      mockUserAuth(USER_ID_2);
      const res = await handleGetUserEmail(new Request('http://api/users/u1/emails/e1'), mockEnv, mockCtx, { userId: USER_ID_1, emailId: EMAIL_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleUserEmailQuickAction -> 403 for wrong user + non-admin', async () => {
      mockUserAuth(USER_ID_2);
      const req = jsonRequest('http://api/users/00000000-0000-0000-0000-000000000001/emails/00000000-0000-0000-0000-0000000000e1/action', 'POST', { action: 'star' });
      const res = await handleUserEmailQuickAction(req, mockEnv, mockCtx, { userId: '00000000-0000-0000-0000-000000000001', emailId: '00000000-0000-0000-0000-0000000000e1' });
      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  APIKEY SURFACE
  // ═══════════════════════════════════════════════════════
  describe('ApiKey Surface', () => {
    it('handleListApiKeys -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleListApiKeys(new Request('http://api/apikeys'), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleListApiKeys -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleListApiKeys(new Request('http://api/apikeys'), mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('handleListApiKeys -> 200 list keys', async () => {
      mockAdminAuth();
      mockAgent.listApiKeys.mockResolvedValue([{ id: 'k1', name: 'my key' }]);
      const res = await handleListApiKeys(new Request('http://api/auth/apikey'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleCreateApiKey -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleCreateApiKey(jsonRequest('http://api/apikeys', 'POST', { name: 'test' }), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleCreateApiKey -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleCreateApiKey(jsonRequest('http://api/apikeys', 'POST', { name: 'test' }), mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('handleCreateApiKey -> 400 on validation error', async () => {
      mockAdminAuth();
      const res = await handleCreateApiKey(jsonRequest('http://api/apikeys', 'POST', { name: 'a'.repeat(101) }), mockEnv, mockCtx);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleCreateApiKey -> 200 creates key', async () => {
      mockAdminAuth();
      mockAgent.createApiKey.mockResolvedValue({ id: 'k2', plain: 'cf_abc', name: 'new' });
      const req = jsonRequest('http://api/auth/apikey', 'POST', { name: 'new' });
      const res = await handleCreateApiKey(req, mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleRevokeApiKey -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleRevokeApiKey(new Request('http://api/apikeys/k1'), mockEnv, mockCtx, { keyId: API_KEY_ID_1 });
      expect(res.status).toBe(401);
    });

    it('handleRevokeApiKey -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleRevokeApiKey(new Request('http://api/apikeys/k1'), mockEnv, mockCtx, { keyId: API_KEY_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleRevokeApiKey -> 200 revokes', async () => {
      mockAdminAuth();
      mockAgent.revokeApiKey.mockResolvedValue(undefined);
      const res = await handleRevokeApiKey(new Request('http://api/auth/apikey/k1'), mockEnv, mockCtx, { keyId: '00000000-0000-0000-0000-0000000000a1' });
      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  SETTINGS SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Settings Surface', () => {
    it('handleGetSettings -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleGetSettings(new Request('http://api/worker-settings'), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleGetSettings -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleGetSettings(new Request('http://api/worker-settings'), mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('handleGetSettings -> 200 for admin', async () => {
      mockAdminAuth();
      mockAgent.getWorkerSettings.mockResolvedValue({ debug: 'true' });
      const res = await handleGetSettings(new Request('http://api/worker/settings'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleUpdateSettings -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleUpdateSettings(jsonRequest('http://api/worker-settings', 'PUT', { key: 'x', value: 'y' }), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleUpdateSettings -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleUpdateSettings(jsonRequest('http://api/worker-settings', 'PUT', { key: 'x', value: 'y' }), mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('handleUpdateSettings -> 400 on validation error', async () => {
      mockAdminAuth();
      const res = await handleUpdateSettings(jsonRequest('http://api/worker-settings', 'PUT', { key: '', value: 'y' }), mockEnv, mockCtx);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleUpdateSettings -> 200 for admin', async () => {
      mockAdminAuth();
      mockAgent.updateWorkerSettings.mockResolvedValue({ debug: 'false' });
      const req = jsonRequest('http://api/worker/settings', 'PUT', { key: 'debug', value: 'false' });
      const res = await handleUpdateSettings(req, mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  AUDIT SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Audit Surface', () => {
    it('handleGetAuditLogs -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleGetAuditLogs(new Request('http://api/audit-logs'), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleGetAuditLogs -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleGetAuditLogs(new Request('http://api/audit-logs'), mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('handleGetAuditLogs -> 200 for admin', async () => {
      mockAdminAuth();
      mockAgent.getRecentAuditLogs.mockResolvedValue([{ id: 'a1' }]);
      const res = await handleGetAuditLogs(new Request('http://api/audit'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleGetUserAuditLogs -> 403 for wrong user + non-admin', async () => {
      mockUserAuth(USER_ID_2);
      const res = await handleGetUserAuditLogs(new Request('http://api/audit-logs/user/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleGetUserAuditLogs -> 200 for self', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getUserAuditLogs.mockResolvedValue([{ id: 'a1' }]);
      const res = await handleGetUserAuditLogs(new Request('http://api/audit-logs/user/u1'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(200);
    });

    it('handleGetApiKeyAuditLogs -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleGetApiKeyAuditLogs(new Request('http://api/audit-logs/apikey/k1'), mockEnv, mockCtx, { apiKeyId: 'k1' });
      expect(res.status).toBe(403);
    });

    it('handleGetTargetAuditLogs -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleGetTargetAuditLogs(new Request('http://api/audit-logs/target/t1'), mockEnv, mockCtx, { targetId: 't1' });
      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  DASHBOARD SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Dashboard Surface', () => {
    it('handleDashboard -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleDashboard(new Request('http://api/dashboard'), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleDashboard -> 200 returns metrics', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getDashboardStats.mockResolvedValue({ userCount: 1, emailCount: 5 });
      const res = await handleDashboard(new Request('http://api/dashboard'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  HEALTH SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Health Surface', () => {
    it('handleHealth -> 200 when healthy', async () => {
      mockAgent.healthCheck.mockResolvedValue({ ok: true });
      const res = await handleHealth(new Request('http://api/health'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=30');
    });

    it('handleHealth -> 503 when unhealthy', async () => {
      mockAgent.healthCheck.mockRejectedValue(new Error('DB Down'));
      const res = await handleHealth(new Request('http://api/health'), mockEnv, mockCtx);
      expect(res.status).toBe(503);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  CLEANUP SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Cleanup Surface', () => {
    it('handleCleanup -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleCleanup(jsonRequest('http://api/cleanup', 'POST', {}), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleCleanup -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleCleanup(jsonRequest('http://api/cleanup', 'POST', {}), mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('handleCleanup -> 400 on invalid maxAgeHours', async () => {
      mockAdminAuth();
      const res = await handleCleanup(jsonRequest('http://api/cleanup', 'POST', { maxAgeHours: 999 }), mockEnv, mockCtx);
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleCleanup -> 200 for admin', async () => {
      mockAdminAuth();
      mockAgent.runCleanup.mockResolvedValue({ deletedCount: 5 });
      const res = await handleCleanup(jsonRequest('http://api/cleanup', 'POST', { maxAgeHours: 24 }), mockEnv, mockCtx);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.deletedCount).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  ACCOUNTS SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Accounts Surface', () => {
    it('handleListAccounts -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleListAccounts(new Request('http://api/users/00000000-0000-0000-0000-000000000001/accounts'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(401);
    });

    it('handleListAccounts -> 403 for wrong user + non-admin', async () => {
      mockUserAuth(USER_ID_2);
      const res = await handleListAccounts(new Request('http://api/users/00000000-0000-0000-0000-000000000001/accounts'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleListAccounts -> 200 for self', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.getAccountByInboxId.mockResolvedValue({ id: 'acc1' });
      const res = await handleListAccounts(new Request('http://api/users/00000000-0000-0000-0000-000000000001/accounts'), mockEnv, mockCtx, { userId: USER_ID_1 });
      expect(res.status).toBe(200);
    });

    it('handleCreateAccount -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleCreateAccount(jsonRequest('http://api/accounts', 'POST', { inboxId: 'i1', targetEmail: 'a@b.com' }), mockEnv, mockCtx, {});
      expect(res.status).toBe(401);
    });

    it('handleCreateAccount -> 400 on validation error', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleCreateAccount(jsonRequest('http://api/accounts', 'POST', { inboxId: INBOX_ID_1 }), mockEnv, mockCtx, {});
      expect(res.status).toBe(400);
      const data = await res.json() as any;
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('handleCreateAccount -> 200 for self', async () => {
      mockUserAuth(USER_ID_1);
      mockAgent.createAccount.mockResolvedValue({ id: 'acc1' });
      const res = await handleCreateAccount(jsonRequest('http://api/accounts', 'POST', { inboxId: INBOX_ID_1, targetEmail: 'a@b.com' }), mockEnv, mockCtx, {});
      expect(res.status).toBe(200);
    });

    it('handleListPendingAccounts -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleListPendingAccounts(new Request('http://api/accounts/pending'), mockEnv, mockCtx);
      expect(res.status).toBe(403);
    });

    it('handleListPendingAccounts -> 200 for admin', async () => {
      mockAdminAuth();
      mockAgent.listPendingAccounts.mockResolvedValue([]);
      const res = await handleListPendingAccounts(new Request('http://api/accounts/pending'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
    });

    it('handleCompleteAccount -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleCompleteAccount(jsonRequest('http://api/accounts/acc1/complete', 'POST', { apiKey: 'key' }), mockEnv, mockCtx, { accountId: ACCOUNT_ID_1 });
      expect(res.status).toBe(403);
    });

    it('handleCompleteAccount -> 400 on missing apiKey', async () => {
      mockAdminAuth();
      const res = await handleCompleteAccount(jsonRequest('http://api/accounts/acc1/complete', 'POST', {}), mockEnv, mockCtx, { accountId: ACCOUNT_ID_1 });
      expect(res.status).toBe(400);
    });

    it('handleFailAccount -> 403 for non-admin', async () => {
      mockUserAuth(USER_ID_1);
      const res = await handleFailAccount(jsonRequest('http://api/accounts/acc1/fail', 'POST', {}), mockEnv, mockCtx, { accountId: ACCOUNT_ID_1 });
      expect(res.status).toBe(403);
    });
  });

  // ═══════════════════════════════════════════════════════
  //  METRICS SURFACE
  // ═══════════════════════════════════════════════════════
  describe('Metrics Surface', () => {
    it('handleGetMetrics -> 401 without auth', async () => {
      mockNoAuth();
      const res = await handleGetMetrics(new Request('http://api/metrics'), mockEnv, mockCtx);
      expect(res.status).toBe(401);
    });

    it('handleGetMetrics -> 200 returns text', async () => {
      mockAdminAuth();
      mockAgent.getMetrics.mockResolvedValue('http_requests_total 42');
      const res = await handleGetMetrics(new Request('http://api/metrics'), mockEnv, mockCtx);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('api_http_requests_total');
    });
  });
});
