import { vi } from 'vitest';

export function createMockDb(): any {
  return {
    getUserByEmail: vi.fn(),
    getUserById: vi.fn(),
    getUsers: vi.fn().mockResolvedValue([]),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    updateUserPassword: vi.fn(),
    deleteUser: vi.fn(),
    softDeleteUser: vi.fn(),
    getAccounts: vi.fn().mockResolvedValue([]),
    getAccountById: vi.fn(),
    getAccountByInboxId: vi.fn(),
    createAccountRecord: vi.fn(),
    updateAccountVerificationLink: vi.fn(),
    markAccountComplete: vi.fn(),
    markAccountFailed: vi.fn(),
    listPendingAccounts: vi.fn().mockResolvedValue([]),
    getApiKeys: vi.fn().mockResolvedValue([]),
    listApiKeys: vi.fn().mockResolvedValue([]),
    getApiKeyByHash: vi.fn(),
    getApiKeyById: vi.fn().mockResolvedValue({ id: 'k1', userId: 'apikey:k1', createdBy: 'u1', revokedAt: null, expiresAt: null }),
    createApiKeyRecord: vi.fn(),
    revokeApiKeyRecord: vi.fn(),
    getSettings: vi.fn().mockResolvedValue([]),
    updateSettings: vi.fn(),
    getDashboardMetrics: vi.fn().mockResolvedValue([]),
    getEmailById: vi.fn(),
    findEmail: vi.fn(),
    getUserInboxEmails: vi.fn().mockResolvedValue([]),
    upsertEmail: vi.fn(),
    cleanupExpiredEmails: vi.fn(),
    deleteExpiredSessions: vi.fn(),
    getUserArchivedCount: vi.fn().mockResolvedValue(0),
    applyEmailQuickAction: vi.fn(),
    getQuotaStatus: vi.fn(),
    updateQuotaUsage: vi.fn(),
    resetQuotaUsage: vi.fn(),
    saveNotificationSettings: vi.fn(),
    getNotificationSettings: vi.fn(),
    getUserInboxCount: vi.fn().mockResolvedValue(0),
    getUserEmailCount: vi.fn().mockResolvedValue(0),
    getRequestsLastMinute: vi.fn().mockResolvedValue(0),
    getRequestCountInWindow: vi.fn().mockResolvedValue(0),
    recordApiRequest: vi.fn(),
    getWorkerSettings: vi.fn().mockResolvedValue([]),
    setWorkerSetting: vi.fn(),
    getLoginSessionByTokenHash: vi.fn().mockResolvedValue({ id: 's1', userId: 'apikey:k1', tokenHash: 'hash123' }),
    createAuditLog: vi.fn().mockResolvedValue(undefined),
    getAuditLogsByUserId: vi.fn().mockResolvedValue([]),
    getAuditLogsByApiKeyId: vi.fn().mockResolvedValue([]),
    getAuditLogsByTarget: vi.fn().mockResolvedValue([]),
    getRecentAuditLogs: vi.fn().mockResolvedValue([]),
    parseRecipients: vi.fn().mockReturnValue([]),
    parseAttachments: vi.fn().mockReturnValue([]),
    parseReferences: vi.fn().mockReturnValue([]),
  };
}

// Aliases for backward compatibility
export const createMockDatabase = createMockDb;


export function createMockApiKeyManagement(): any {
  return {
    createApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
    listApiKeys: vi.fn(),
    verifyApiKeyPlain: vi.fn(),
  };
}

export function createMockPasswordHash(): any {
  return {
    hashPassword: vi.fn().mockResolvedValue('mock-hash'),
    verifyPassword: vi.fn().mockResolvedValue(true),
    generateSecurePassword: vi.fn().mockReturnValue('mock-password-123'),
    randomToken: vi.fn().mockReturnValue('mock-token'),
    sha256Hex: vi.fn().mockResolvedValue('mock-sha256'),
  };
}

export function createMockSessionAuth(): any {
  return {
    createSession: vi.fn().mockResolvedValue({
      token: 'session_token',
      session: {
        id: 'session-1',
        userId: 'user-1',
        tokenHash: 'token_hash',
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        createdAt: new Date().toISOString(),
        userAgent: 'test',
        clientIp: '127.0.0.1'
      }
    }),
    validateSession: vi.fn().mockResolvedValue({
      valid: true,
      userId: 'user-1',
      sessionId: 'session-1'
    }),
    destroySession: vi.fn().mockResolvedValue(true),
    extractClientIp: vi.fn().mockReturnValue('127.0.0.1'),
    getCookieName: vi.fn().mockReturnValue('session'),
    getMaxAgeSeconds: vi.fn().mockReturnValue(3600),
  };
}

export function createMockPush(): any {
  return {
    sendPushUpdate: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {}), // return unsubscribe fn
    publish: vi.fn(), // for event publishing
  };
}

export function createMockQuota(): any {
  return {
    checkQuota: vi.fn().mockResolvedValue({ allowed: true }),
    consume: vi.fn().mockResolvedValue(true),
    getRemaining: vi.fn().mockResolvedValue(100),
  };
}

export function createMockEmailSender(): any {
  return {
    sendEmail: vi.fn().mockResolvedValue({ success: true }),
  };
}

export function createMockWorkerSettings(): any {
  return {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  };
}

export function createMockAuth(): any {
  return {
    login: vi.fn(),
    logout: vi.fn(),
    verify: vi.fn(),
  };
}

export function createMockMetricsCollector(): any {
  return {
    incrementCounter: vi.fn(),
    recordHistogram: vi.fn(),
    exportPrometheusMetrics: vi.fn().mockReturnValue(''),
    resetAll: vi.fn(),
  };
}

export function createMockLogger(): any {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
}

export function createMockTracer(): any {
  return {
    startSpan: vi.fn().mockReturnValue({
      setAttribute: vi.fn().mockReturnThis(),
      end: vi.fn(),
      recordException: vi.fn(),
    }),
  };
}

export function createMockCache(): any {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  };
}



export function createMockAuditLog(db: any = createMockDb(), logger: any = createMockLogger(), metrics: any = createMockMetricsCollector()): any {
  return {
    db,
    logger,
    metrics,
    logEvent: vi.fn(),
    getUserAuditLogs: vi.fn(),
    getApiKeyAuditLogs: vi.fn(),
    maskAuditLog: vi.fn((log: any) => log),
  };
}
