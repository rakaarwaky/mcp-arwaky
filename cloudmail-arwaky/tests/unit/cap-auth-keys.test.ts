import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockDb,
  createMockPasswordHash,
  createMockSessionAuth,
  createMockLogger,
  createMockMetricsCollector,
  createMockTracer,
  createMockCache
} from './mocks';
import {
  asUserId, asEmailId, asApiKeyId, asApiKeyPlain, createEmailAddress, nowTimestamp, asName, asUserAgent, asClientIp
} from '../../src/taxonomy';
import { ApiKeyAuthActions } from '../../src/capabilities/apikey_auth_actions';
import { ApiKeyManagementActions } from '../../src/capabilities/apikey_manage_actions';
import { UserLoginActions } from '../../src/capabilities/user_login_actions';
import { AuditLogActions } from '../../src/capabilities/audit_log_actions';

describe('Capabilities: Auth & Keys', () => {
  let db: any;
  let hasher: any;
  let session: any;
  let logger: any;
  let metrics: any;
  let tracer: any;
  let cache: any;
  let auditLog: AuditLogActions;

  beforeEach(() => {
    db = createMockDb();
    hasher = createMockPasswordHash();
    session = createMockSessionAuth();
    logger = createMockLogger();
    metrics = createMockMetricsCollector();
    tracer = createMockTracer();
    cache = createMockCache();
    auditLog = new AuditLogActions(db, logger, metrics);
  });

  describe('ApiKeyManagementActions', () => {
    it('should create and verify API keys', async () => {
      const actions = new ApiKeyManagementActions(db, hasher, auditLog, metrics, cache, tracer);
      const result = await actions.createApiKey({ name: asName('test-key') });

      expect(result.plainKey).toBeDefined();
      expect(db.createApiKeyRecord).toHaveBeenCalled();
    });

    it('should list and revoke keys', async () => {
      const actions = new ApiKeyManagementActions(db, hasher, auditLog, metrics, cache, tracer);
      db.listApiKeys.mockResolvedValue([{ id: 'k1', name: 'key1', revokedAt: null }]);

      const keys = await actions.listApiKeys();
      expect(keys[0]!.isActive).toBe(true);

      await actions.revokeApiKey({ apiKeyId: asApiKeyId('k1') });
      expect(db.revokeApiKeyRecord).toHaveBeenCalledWith('k1');
    });
  });

  describe('ApiKeyAuthActions', () => {
    it('should authenticate with valid key', async () => {
      const mgmt = new ApiKeyManagementActions(db, hasher, auditLog, metrics, cache, tracer);
      const actions = new ApiKeyAuthActions(mgmt, session, db, hasher, metrics, cache, tracer);

      db.getApiKeyByHash.mockResolvedValue({ id: 'k1', revokedAt: null });
      const result = await actions.authenticateWithApiKey(asApiKeyPlain('sk-test123'), asUserAgent('ua'), asClientIp('ip'));

      expect(result.apiKeyId).toBe('k1');
      expect(session.createSession).toHaveBeenCalled();
    });
  });

  describe('UserLoginActions', () => {
    it('should login with verified password', async () => {
      const actions = new UserLoginActions(db, hasher, session, auditLog, metrics, logger);
      db.getUserByEmail.mockResolvedValue({ id: 'u1', passwordHash: 'hash' });
      hasher.verifyPassword.mockResolvedValue(true);

      const result = await actions.login(createEmailAddress('u@e.com'), 'pass' as any, { userAgent: asUserAgent('ua'), clientIp: asClientIp('ip') });
      expect(result.token).toBeDefined();
    });

    it('should throw on invalid credentials', async () => {
      const actions = new UserLoginActions(db, hasher, session, auditLog, metrics, logger);
      db.getUserByEmail.mockResolvedValue(null);

      await expect(actions.login(createEmailAddress('u@e.com'), 'pass' as any, { userAgent: asUserAgent('ua'), clientIp: asClientIp('ip') }))
        .rejects.toThrow('Invalid email or password');
    });
  });
});
