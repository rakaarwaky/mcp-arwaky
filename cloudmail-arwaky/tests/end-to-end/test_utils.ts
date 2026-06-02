import { vi } from 'vitest';
import type { AgentContainer } from '../../src/agent/di_container_registry';
import { 
  Email, 
  EmailId, 
  InboxId, 
  Timestamp, 
  EmailStatus, 
  IsStarred, 
  HasAttachments, 
  AttachmentCount,
  createEmailAddress,
  asEmailId,
  asInboxId,
  asTimestamp,
  asAttachmentCount
} from '../../src/taxonomy';
import { 
  createMockDb, 
  createMockPasswordHash, 
  createMockSessionAuth,
  createMockMetricsCollector,
  createMockLogger,
  createMockPush,
  createMockCache,
  createMockTracer
} from '../unit/mocks';

import { UserLoginActions } from '../../src/capabilities/user_login_actions';
import { InboxManageActions } from '../../src/capabilities/inbox_manage_actions';
import { EmailFetchActions } from '../../src/capabilities/email_fetch_actions';
import { DashboardMetricsActions } from '../../src/capabilities/dashboard_metrics_actions';
import { DashboardFetchActions } from '../../src/capabilities/dashboard_fetch_actions';
import { WorkerSettingsActions } from '../../src/capabilities/worker_settings_actions';
import { InboxCleanupActions } from '../../src/capabilities/inbox_cleanup_actions';
import { EmailIngestActions } from '../../src/capabilities/email_ingest_actions';
import { ApiKeyManagementActions } from '../../src/capabilities/apikey_manage_actions';
import { AuditLogActions } from '../../src/capabilities/audit_log_actions';
import { ApiKeyAuthActions } from '../../src/capabilities/apikey_auth_actions';
import { RateLimitActions } from '../../src/capabilities/rate_limit_actions';
import { QuotaManagementActions } from '../../src/capabilities/quota_management_actions';
import { AccountServiceActions } from '../../src/capabilities/account_service_actions';
import { EmailExtractionActions } from '../../src/capabilities/email_extraction_actions';
import { loadConfig } from '../../src/infrastructure/config_loader_adapter';

/**
 * Creates a fully populated AgentContainer with mocks and action instances.
 * Ideal for E2E tests to ensure AgentOrchestrator has all its dependencies.
 */
export function createTestContainer(overrides: Partial<AgentContainer> = {}): AgentContainer {
  const database = overrides.database || createMockDb();
  const crypto = overrides.crypto || createMockPasswordHash();
  const session = overrides.session || createMockSessionAuth();
  const metrics = overrides.metrics || createMockMetricsCollector();
  const logger = overrides.logger || createMockLogger();
  const cache = overrides.cache || createMockCache();
  const tracer = overrides.tracer || createMockTracer();
  const featureFlags = overrides.featureFlags || { isEnabled: vi.fn().mockResolvedValue(true) };
  
  // push is not in AgentContainer but needed for capabilities
  const push = createMockPush();

  const auditLog = new AuditLogActions(database, logger, metrics);

  // Actions — pass all dependencies
  const userLogin = new UserLoginActions(database, crypto, session, auditLog, metrics, logger);
  const inboxManage = new InboxManageActions(database, auditLog, metrics);
  const emailFetch = new EmailFetchActions(database, metrics, push);
  const dashboardMetrics = new DashboardMetricsActions(database, metrics);
  const dashboardFetch = new DashboardFetchActions(database, metrics);
  const config = loadConfig();
  const workerSettings = new WorkerSettingsActions(database, config, metrics);
  const cleanup = new InboxCleanupActions(database, metrics);
  const emailIngest = new EmailIngestActions(database, metrics, push);

  const apiKeyManagement = new ApiKeyManagementActions(database, crypto, auditLog, metrics, cache, tracer);
  const apiKeyAuth = new ApiKeyAuthActions(apiKeyManagement, session, database, crypto, metrics, cache, tracer);
  const rateLimit = new RateLimitActions(database, metrics);
  const quotaManagement = new QuotaManagementActions(database, metrics);
  const accountService = new AccountServiceActions(database, auditLog, metrics);
  const emailExtraction = new EmailExtractionActions(metrics);

  return {
    database,
    crypto,
    session,
    metrics,
    logger,
    cache,
    tracer,
    featureFlags: featureFlags as any,
    userLogin,
    inboxManage,
    emailFetch,
    dashboardMetrics,
    dashboardFetch,
    workerSettings,
    cleanup,
    emailIngest,
    apiKeyManagement,
    apiKeyAuth,
    rateLimit,
    quotaManagement,
    accountService,
    emailExtraction,
    auditLog,
    config,
    validate: () => {},
    ...overrides
  };
}

/**
 * Creates a valid Email object for testing, matching the taxonomy structure.
 */
export function createMockEmail(overrides: Partial<Email> = {}): Email {
  return {
    id: asEmailId('e_123'),
    inboxId: asInboxId('in_456'),
    messageId: 'msg_789',
    from: { 
      name: 'Test Sender', 
      email: createEmailAddress('sender@example.com') 
    },
    to: [{ 
      name: 'Test Recipient', 
      email: createEmailAddress('rcpt@example.com') 
    }],
    cc: [],
    subject: 'Test Subject',
    snippet: 'This is a test snippet...',
    receivedAt: asTimestamp(new Date().toISOString()),
    status: 'unread' as EmailStatus,
    isRead: false,
    isStarred: false as IsStarred,
    bodyText: 'Full body text here.',
    bodyHtml: '<p>Full body text here.</p>',
    rawMime: '...',
    hasAttachments: false as HasAttachments,
    attachmentCount: asAttachmentCount(0),
    attachments: [],
    inReplyTo: null,
    references: [],
    spamScore: 0,
    authResults: 'pass',
    ...overrides
  } as Email;
}
