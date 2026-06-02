/// <reference types="@cloudflare/workers-types" />
/// <reference types="node" />
// agent/di_container_registry.ts
// Dependency injection container — wires infrastructure → capabilities
// Single point where all dependencies are resolved

import { wrapD1WithRetry } from '../infrastructure/d1_retry_adapter';
import { D1DatabaseAdapter } from '../infrastructure/d1_database_adapter';
import { CryptoPasswordAdapter } from '../infrastructure/crypto_password_adapter';
import { CryptoEncryptAdapter } from '../infrastructure/crypto_encrypt_adapter';
import { SessionAuthAdapter } from '../infrastructure/session_auth_adapter';
import { HttpClientAdapter } from '../infrastructure/http_client_adapter';
import { ChromeCdpAdapter } from '../infrastructure/chrome_cdp_adapter';
import { AppLoggerAdapter } from '../infrastructure/app_logger_adapter';
import { MetricsCollectorAdapter } from '../infrastructure/metrics_collector_adapter';
import { PushNotifyAdapter } from '../infrastructure/push_notify_adapter';
import { FeatureFlagAdapter } from '../infrastructure/feature_flag_adapter';
import { LruCacheAdapter } from '../infrastructure/lru_cache_adapter';
import { TracerAdapter } from '../infrastructure/telemetry_tracer_adapter';
import { getConfig, loadConfig, loadConfigFromEnv } from '../infrastructure/config_loader_adapter';

import { UserLoginActions } from '../capabilities/user_login_actions';
import { InboxManageActions } from '../capabilities/inbox_manage_actions';
import { EmailFetchActions } from '../capabilities/email_fetch_actions';
import { DashboardMetricsActions } from '../capabilities/dashboard_metrics_actions';
import { DashboardFetchActions } from '../capabilities/dashboard_fetch_actions';
import { WorkerSettingsActions } from '../capabilities/worker_settings_actions';
import { InboxCleanupActions } from '../capabilities/inbox_cleanup_actions';
import { EmailIngestActions } from '../capabilities/email_ingest_actions';
import { ApiKeyManagementActions } from '../capabilities/apikey_manage_actions';
import { ApiKeyAuthActions } from '../capabilities/apikey_auth_actions';
import { RateLimitActions } from '../capabilities/rate_limit_actions';
import { QuotaManagementActions } from '../capabilities/quota_management_actions';
import { AccountServiceActions } from '../capabilities/account_service_actions';
import { EmailExtractionActions } from '../capabilities/email_extraction_actions';
import { AuditLogActions } from '../capabilities/audit_log_actions';
import { OpenRouterAutomationActions } from '../capabilities/openrouter_automation_actions';

import type { IDatabaseQueryPort, ISessionAuthPort, IMetricsCollectorPort, IFeatureFlagPort, ITracerPort, ICachePort } from '../contract';
import type { EmailDomain, Url, SessionId, UserId, AuthToken, UserAgent, ClientIp, Timestamp, CookieName, SessionMaxAge, DeleteResult, Session, CryptoHash, Password, Name, AppConfig } from '../taxonomy';
import { asTimestamp, asCorrelationId, asEncryptionSecret } from '../taxonomy';
import { InfrastructureError } from '../taxonomy/platform_failure_error';

export interface AgentEnv {
  DB: D1Database;
  ASSETS?: { fetch: typeof fetch };
  MAILFLARE_USER_DOMAIN?: EmailDomain;
  CMF_ADMIN_EMAIL?: string; 
  CMF_ADMIN_PASSWORD?: Password;
  CMF_ADMIN_DISPLAY_NAME?: Name;
  CMF_ENCRYPTION_KEY?: string;
  CLEANUP_MAX_AGE_HOURS?: string;
  ALLOWED_ORIGINS?: string;
  RATE_LIMIT_SESSION?: string;
  RATE_LIMIT_APIKEY?: string;
  NODE_ENV?: 'development' | 'production' | 'test';
}

export interface AgentContainer {
  // Infrastructure (adapters)
  database: IDatabaseQueryPort;
  crypto: CryptoPasswordAdapter;
  session: ISessionAuthPort;
  logger: AppLoggerAdapter;
  metrics: IMetricsCollectorPort;
  featureFlags: IFeatureFlagPort;
  tracer: ITracerPort;
  cache: ICachePort;

  // Phase 1: Core capabilities
  userLogin: UserLoginActions;
  inboxManage: InboxManageActions;
  emailFetch: EmailFetchActions;
  dashboardMetrics: DashboardMetricsActions;
  dashboardFetch: DashboardFetchActions;
  workerSettings: WorkerSettingsActions;
  cleanup: InboxCleanupActions;
  emailIngest: EmailIngestActions;

  // Phase 2-4: Extended capabilities
  apiKeyManagement: ApiKeyManagementActions;
  apiKeyAuth: ApiKeyAuthActions;
  rateLimit: RateLimitActions;
  quotaManagement: QuotaManagementActions;
  accountService: AccountServiceActions;
  emailExtraction: EmailExtractionActions;
  auditLog: AuditLogActions;

  // Local-only: Browser automation (CLI/TUI/MCP only — NOT Worker)
  chromeCdp?: ChromeCdpAdapter;
  openRouterAuto?: OpenRouterAutomationActions;

  // Config
  config: AppConfig;

  /**
   * Validates that all dependencies are correctly wired and critical ones are present.
   * Throws Error if validation fails.
   */
  validate(): void;
}

// ── Local Session Stub (matches ISessionAuthPort) ──

function createLocalSessionStub(): ISessionAuthPort {
  // SECURITY: Local stub must never be used in production
  if (process.env.NODE_ENV === 'production') {
    throw new InfrastructureError('createLocalSessionStub() cannot be used in production');
  }
  return {
    async createSession(userId: UserId, meta: { userAgent: UserAgent; clientIp: ClientIp }) {
      const sessionId = crypto.randomUUID() as SessionId;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const session: Session = {
        id: sessionId,
        type: 'login',
        tokenHash: '' as CryptoHash,
        userId,
        createdAt: asTimestamp(now.toISOString()),
        expiresAt: asTimestamp(expiresAt.toISOString()),
        revokedAt: null,
        userAgent: meta.userAgent,
        clientIp: meta.clientIp
      };
      return { token: '' as AuthToken, session };
    },
    async validateSession(_token: AuthToken) {
      return null;
    },
    async destroySession(_token: AuthToken) {
      return false as DeleteResult;
    },
    extractClientIp(request: Request): ClientIp {
      const cfIp = request.headers.get('cf-connecting-ip');
      if (cfIp) return cfIp as ClientIp;
      const forwarded = request.headers.get('x-forwarded-for');
      if (forwarded) return (forwarded.split(',')[0]?.trim() ?? '') as ClientIp;
      return '' as ClientIp;
    },
    getCookieName(): CookieName { return 'mailflare_session' as CookieName; },
    getMaxAgeSeconds(): SessionMaxAge { return getConfig().session.maxAgeSeconds as SessionMaxAge; },
  };
}

// ── Local Container (for MCP server / CLI — talks to deployed Worker API) ──

export interface LocalEnv {
  baseUrl: Url;
  token?: AuthToken;
  requestId?: string;
}

export function createLocalContainer(env: LocalEnv): AgentContainer {
  // Infrastructure — HTTP adapter instead of D1
  const database = new HttpClientAdapter({ 
    baseUrl: env.baseUrl, 
    token: env.token, 
    requestId: env.requestId ? asCorrelationId(env.requestId) : undefined 
  });
  const crypto = new CryptoPasswordAdapter();
  const session = createLocalSessionStub();
  const logger = new AppLoggerAdapter();
  const metrics = new MetricsCollectorAdapter();
  const featureFlags = new FeatureFlagAdapter();
  const tracer = new TracerAdapter();
  const cache = new LruCacheAdapter();

  // Phase 1 capabilities
  const auditLog = new AuditLogActions(database, logger, metrics);
  const userLogin = new UserLoginActions(database, crypto, session, auditLog, metrics, logger);
  const inboxManage = new InboxManageActions(database, auditLog, metrics);
  const emailFetch = new EmailFetchActions(database, metrics, new PushNotifyAdapter());
  const dashboardMetrics = new DashboardMetricsActions(database, metrics);
  const dashboardFetch = new DashboardFetchActions(database, metrics);
  const config = loadConfig();
  const workerSettings = new WorkerSettingsActions(database, config, metrics);
  const cleanup = new InboxCleanupActions(database, metrics);
  const emailIngest = new EmailIngestActions(database, metrics, new PushNotifyAdapter());

  // Phase 2-4 capabilities
  const apiKeyManagement = new ApiKeyManagementActions(database, crypto, auditLog, metrics, cache, tracer);
  const apiKeyAuth = new ApiKeyAuthActions(apiKeyManagement, session, database, crypto, metrics, cache, tracer);
  const rateLimit = new RateLimitActions(database, metrics);
  const quotaManagement = new QuotaManagementActions(database, metrics);
  const accountService = new AccountServiceActions(database, auditLog, metrics);
  const emailExtraction = new EmailExtractionActions(metrics);

  // Local-only: Chrome CDP + OpenRouter automation
  const chromeCdp = new ChromeCdpAdapter();
  const openRouterAuto = new OpenRouterAutomationActions(chromeCdp, metrics, featureFlags, tracer);

  const container: AgentContainer = {
    database, crypto, session, logger, metrics,
    userLogin, inboxManage, emailFetch, dashboardMetrics, dashboardFetch, workerSettings, cleanup,
    emailIngest,
    apiKeyManagement, apiKeyAuth,
    rateLimit, quotaManagement, accountService, emailExtraction,
    auditLog,
    chromeCdp,
    openRouterAuto,
    featureFlags,
    tracer,
    cache,
    config,
    validate() {
      if (!env.baseUrl) throw new InfrastructureError('LocalContainer: baseUrl is missing');
      if (!(database instanceof HttpClientAdapter)) throw new InfrastructureError('LocalContainer: database must be HttpClientAdapter');
      // Verify core capabilities are wired
      if (!userLogin || !inboxManage || !emailFetch) throw new InfrastructureError('LocalContainer: Core capabilities are missing');
    }
  };

  return container;
}

export function createContainer(env: AgentEnv): AgentContainer {
  if (!env.DB) {
    throw new InfrastructureError('createContainer requires env.DB (D1Database binding)');
  }

  // Infrastructure
  const crypto = new CryptoPasswordAdapter();
  const encrypt = env.CMF_ENCRYPTION_KEY ? new CryptoEncryptAdapter(asEncryptionSecret(env.CMF_ENCRYPTION_KEY)) : undefined;
  const database = new D1DatabaseAdapter(wrapD1WithRetry(env.DB), encrypt);
  const session = new SessionAuthAdapter(env.DB, crypto);
  const logger = new AppLoggerAdapter();
  const metrics = new MetricsCollectorAdapter();
  const featureFlags = new FeatureFlagAdapter();
  const tracer = new TracerAdapter();
  const cache = new LruCacheAdapter();

  // Phase 1 capabilities
  const auditLog = new AuditLogActions(database, logger, metrics);
  const userLogin = new UserLoginActions(database, crypto, session, auditLog, metrics, logger);
  const inboxManage = new InboxManageActions(database, auditLog, metrics);
  const emailFetch = new EmailFetchActions(database, metrics, new PushNotifyAdapter());
  const dashboardMetrics = new DashboardMetricsActions(database, metrics);
  const dashboardFetch = new DashboardFetchActions(database, metrics);
  const config = loadConfigFromEnv(env as unknown as Record<string, string | undefined>);
  const workerSettings = new WorkerSettingsActions(database, config, metrics);
  const cleanup = new InboxCleanupActions(database, metrics);
  const emailIngest = new EmailIngestActions(database, metrics, new PushNotifyAdapter());

  // Phase 2-4 capabilities
  const apiKeyManagement = new ApiKeyManagementActions(database, crypto, auditLog, metrics, cache, tracer);
  const apiKeyAuth = new ApiKeyAuthActions(apiKeyManagement, session, database, crypto, metrics, cache, tracer);
  const rateLimit = new RateLimitActions(database, metrics);
  const quotaManagement = new QuotaManagementActions(database, metrics);
  const accountService = new AccountServiceActions(database, auditLog, metrics);
  const emailExtraction = new EmailExtractionActions(metrics);

  const container: AgentContainer = {
    database, crypto, session, logger, metrics,
    userLogin, inboxManage, emailFetch, dashboardMetrics, dashboardFetch, workerSettings, cleanup,
    emailIngest,
    apiKeyManagement, apiKeyAuth,
    rateLimit, quotaManagement, accountService, emailExtraction,
    auditLog,
    featureFlags,
    tracer,
    cache,
    config,
    validate() {
      if (!env.DB) throw new InfrastructureError('Container: DB binding is missing');
      if (!(database instanceof D1DatabaseAdapter)) throw new InfrastructureError('Container: database must be D1DatabaseAdapter');
      // Verify core capabilities are wired
      if (!userLogin || !inboxManage || !emailFetch) throw new InfrastructureError('Container: Core capabilities are missing');
    }
  };

  return container;
}

