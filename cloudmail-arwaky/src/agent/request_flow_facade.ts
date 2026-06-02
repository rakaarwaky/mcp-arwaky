// agent/orchestrator.ts
// Thin facade — single entry point for all surfaces
// Delegates to domain routers. No logic here. Zero.
// Surfaces import this class, never routers directly.

import type { AgentContainer } from './di_container_registry';
import { AuthFlowRouter } from './auth_flow_router';
import { InboxQueryRouter } from './inbox_query_router';
import { NotificationDispatchRouter } from './notification_dispatch_router';
import { ApiQuotaRouter } from './api_quota_router';
import { AccountManageRouter } from './account_manage_router';
import { WorkerSetupRouter } from './worker_setup_router';

import type {
  EmailAddress, UserId, EmailId, Name, AuthToken, UserAgent, ClientIp,
  SettingKey, SettingValue, Password, PasswordPlain, SearchFrom, Subject,
  TimeoutSeconds, PollIntervalSeconds, EmailAction, Actor,
  MaxAgeHours, ApiKeyId, RequestCount, InboxId, AccountId,
  ServiceProvider, ApiKeyPlain, WindowSeconds, BodyText,
  ChromePath, UserDataDir, RemoteDebuggingPort, Headless,
  VerificationCode, ErrorMessage, EntityId,
  Session, User, Account, Email, WorkerSettingsConfig, EmailStatusHistory,
  AuditLog, AuditTargetType, PageSize, CryptoHash
} from '../taxonomy';
import type { EmailIngestInput } from '../contract/email_ingest_io';
import type { ApiKeyCreateInput, ApiKeyRevokeInput, ApiKeyListItem } from '../contract/api_keys_io';
import type { OpenRouterSignupInput, OpenRouterSignupOutput } from '../contract/openrouter_auto_protocol';
import { InfrastructureError } from '../taxonomy/platform_failure_error.js';

export interface AuthResult { token: AuthToken; session: Session; }
export interface UserResult { user: User; }
export interface AccountResult { account: Account; }
export interface MessageResult { email: Email; data?: any; }
export interface WorkerResult { settings: WorkerSettingsConfig; }
export interface SecurityAuditResult { logs: EmailStatusHistory[]; }

import {
  asApiKeyPlain, asWindowSeconds, asPasswordPlain, asBodyText,
  asChromePath, asUserDataDir, asRemoteDebuggingPort, asHeadless,
  asVerificationCode, asErrorMessage, asEntityId, asPageSize
} from '../taxonomy';


export class AgentOrchestrator {
  readonly auth: AuthFlowRouter;
  readonly inbox: InboxQueryRouter;
  readonly notification: NotificationDispatchRouter;
  readonly apiQuota: ApiQuotaRouter;
  readonly account: AccountManageRouter;
  readonly worker: WorkerSetupRouter;
  private readonly container: AgentContainer;

  constructor(container: AgentContainer) {
    this.container = container;
    this.auth = new AuthFlowRouter(container);
    this.inbox = new InboxQueryRouter(container);
    this.notification = new NotificationDispatchRouter(container);
    this.apiQuota = new ApiQuotaRouter(container);
    this.account = new AccountManageRouter(container);
    this.worker = new WorkerSetupRouter(container);
  }

  // ── Auth ──
  login(email: EmailAddress, password: Password, meta: { userAgent: UserAgent; clientIp: ClientIp }) { return this.auth.login(email, password, meta); }
  logout(token: AuthToken) { return this.auth.logout(token); }
  validateSession(token: AuthToken) { return this.auth.validateSession(token); }
  healthCheck() { return this.auth.healthCheck(); }

  // ── Users ──
  listUsers() { return this.auth.listUsers(); }
  createUser(username: Name) { return this.auth.createUser(username); }
  getUser(userId: UserId) { return this.auth.getUser(userId); }
  deleteUser(userId: UserId) { return this.auth.deleteUser(userId); }
  softDeleteUser(userId: UserId) { return this.auth.softDeleteUser(userId); }
  updateUser(userId: UserId, updates: { email?: EmailAddress; displayName?: Name; password?: Password }) { return this.auth.updateUser(userId, updates); }
  getCurrentUser(userId: UserId) { return this.auth.getCurrentUser(userId); }
  getUserMetrics(userId: UserId) { return this.auth.getUserMetrics(userId); }
  getUserIdentity(userId: UserId) { return this.auth.getUserIdentity(userId); }
  getSecurityAuditLogs(userId: UserId) { return this.auth.getSecurityAuditLogs(userId); }

  // ── Inbox ──
  getUserInbox(userId: UserId) { return this.inbox.getUserInbox(userId); }
  getInboxMessages(userId: UserId, inboxId: InboxId) { return this.inbox.getInboxMessages(userId, inboxId); }
  getAllEmails() { return this.inbox.getAllEmails(); }
  getEmail(userId: UserId, emailId: EmailId) { return this.inbox.getEmail(userId, emailId); }
  getEmailGlobal(emailId: EmailId) { return this.inbox.getEmailGlobal(emailId); }
  getMessageDetails(userId: UserId, messageId: EmailId) { return this.inbox.getMessageDetails(userId, messageId); }
  waitForEmail(userId: UserId, options?: { from?: SearchFrom; subject?: Subject; timeout?: TimeoutSeconds; pollInterval?: PollIntervalSeconds }) { return this.inbox.waitForEmail(userId, options); }
  applyEmailAction(userId: UserId, emailId: EmailId, action: EmailAction, actor?: Actor) { return this.inbox.applyEmailAction(userId, emailId, action, actor); }

  // ── Notification (orchestration lives in router) ──
  handleEmailNotification(data: EmailIngestInput, waitUntil?: (promise: Promise<unknown>) => void) { return this.notification.handleEmailNotification(data, waitUntil); }

  // ── Dashboard ──
  getDashboardMetrics(userId: UserId) { return this.worker.getDashboardMetrics(userId); }
  getDashboardStats(userId?: UserId) { return this.worker.getDashboardStats(userId); }

  // ── Worker Settings ──
  getWorkerSettings() { return this.worker.getWorkerSettings(); }
  updateWorkerSettings(updates: Record<SettingKey, SettingValue>) { return this.worker.updateWorkerSettings(updates); }
  registerWorker(userId: UserId, config: any) { return this.worker.registerWorker(userId, config); }
  updateWorkerConfig(userId: UserId, workerId: string, config: any) { return this.worker.updateWorkerConfig(userId, workerId, config); }

  // ── API Key ──
  createApiKey(input: ApiKeyCreateInput) { return this.apiQuota.createApiKey(input); }
  revokeApiKey(input: ApiKeyRevokeInput) { return this.apiQuota.revokeApiKey(input); }
  listApiKeys(): Promise<ApiKeyListItem[]> { return this.apiQuota.listApiKeys(); }
  getApiKeyByHash(keyHash: CryptoHash) { return this.apiQuota.getApiKeyByHash(keyHash); }
  verifyApiKeyPlain(keyPlain: ApiKeyPlain) { return this.apiQuota.verifyApiKeyPlain(keyPlain); }

  // ── API Key Auth ──
  authenticateWithApiKey(apiKeyPlain: ApiKeyPlain, userAgent: UserAgent, clientIp: ClientIp) { return this.auth.authenticateWithApiKey(apiKeyPlain, userAgent, clientIp); }
  validateApiKeyToken(token: AuthToken) { return this.auth.validateApiKeyToken(token); }

  // ── Rate Limit ──
  checkRateLimit(apiKeyId: ApiKeyId | null, userId: UserId | null, limit: RequestCount, windowSeconds: WindowSeconds) { return this.apiQuota.checkRateLimit(apiKeyId, userId, limit, windowSeconds); }
  recordRequest(apiKeyId: ApiKeyId | null, userId: UserId | null) { return this.apiQuota.recordRequest(apiKeyId, userId); }

  // ── Quota ──
  checkQuota(apiKeyId: ApiKeyId | null, userId: UserId | null) { return this.apiQuota.checkQuota(apiKeyId, userId); }
  getQuotaUsage(apiKeyId: ApiKeyId | null, userId: UserId | null) { return this.apiQuota.getQuotaUsage(apiKeyId, userId); }
  getQuotaLimits(apiKeyId: ApiKeyId | null, userId: UserId | null) { return this.apiQuota.getQuotaLimits(apiKeyId, userId); }
  incrementInboxCount(apiKeyId: ApiKeyId | null, userId: UserId | null) { return this.apiQuota.incrementInboxCount(apiKeyId, userId); }
  incrementEmailCount(apiKeyId: ApiKeyId | null, userId: UserId | null) { return this.apiQuota.incrementEmailCount(apiKeyId, userId); }

  // ── Account ──
  createAccount(input: import('../contract/accts_manage_io').CreateAccountInput) { return this.account.createAccount(input); }
  getAccount(accountId: AccountId) { return this.account.getAccount(accountId); }
  getAccountByInboxId(inboxId: InboxId) { return this.account.getAccountByInboxId(inboxId); }
  getAccountDetails(userId: UserId, accountId: AccountId) { return this.account.getAccountDetails(userId, accountId); }
  listPendingAccounts() { return this.account.listPendingAccounts(); }
  tryAutoVerifyAccount(accountId: AccountId, emailBody: BodyText) { return this.account.tryAutoVerifyAccount(accountId, emailBody); }
  completeAccount(accountId: AccountId, apiKeyId: ApiKeyId, rawApiKey?: ApiKeyPlain) { return this.account.completeAccount(accountId, apiKeyId, rawApiKey); }
  failAccount(accountId: AccountId, error: ErrorMessage) { return this.account.failAccount(accountId, error); }

  // ── Cleanup ──
  runCleanup(maxAgeHours: MaxAgeHours) { return this.worker.runCleanup(maxAgeHours); }
  performSystemCleanup() { return this.worker.performSystemCleanup(); }

  // ── Browser Automation (local-only) ──
  hasBrowserAutomation(): boolean {
    return !!this.container.chromeCdp && !!this.container.openRouterAuto;
  }

  async openRouterSignup(input: OpenRouterSignupInput, otpProvider?: { fetchOtp(): Promise<VerificationCode> }): Promise<OpenRouterSignupOutput> {
    if (!this.container.chromeCdp || !this.container.openRouterAuto) {
      throw new InfrastructureError('Browser automation not available in this environment');
    }
    const chromePath = this.container.config.automation.chromePath;
    const userDataDir = this.container.config.automation.userDataDir;
    const port = this.container.config.automation.port;
    const headless = this.container.config.automation.headless;

    await this.container.chromeCdp.connect({ chromePath: asChromePath(chromePath), userDataDir: asUserDataDir(userDataDir), remoteDebuggingPort: asRemoteDebuggingPort(port), headless: asHeadless(headless) });
    try {
      return await this.container.openRouterAuto.runFullSignup(input, otpProvider);
    } finally {
      await this.container.chromeCdp.disconnect();
    }
  }

  // ── Audit Logging ──
  getRecentAuditLogs(limit?: number) { return this.worker.getRecentAuditLogs(limit ? asPageSize(limit) : undefined); }
  getUserAuditLogs(userId: UserId, limit?: number) { return this.worker.getUserAuditLogs(userId, limit ? asPageSize(limit) : undefined); }
  getApiKeyAuditLogs(apiKeyId: ApiKeyId, limit?: number) { return this.worker.getApiKeyAuditLogs(apiKeyId, limit ? asPageSize(limit) : undefined); }
  getTargetAuditLogs(targetId: string, targetType?: AuditTargetType, limit?: number) {
    return this.worker.getTargetAuditLogs(asEntityId(targetId), targetType, limit ? asPageSize(limit) : undefined);
  }
}
