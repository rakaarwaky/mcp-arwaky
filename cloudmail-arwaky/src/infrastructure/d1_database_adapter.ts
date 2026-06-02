import type {
  User, Email, Session, WorkerSettings, DashboardMetric,
  UserId, EmailId, SessionId, InboxId, AccountId, ApiKeyId,
  EmailAddress, Subject, CryptoHash, SettingKey, SettingValue,
  DisplayName, Stored, DeleteResult, Reason, EmailQuickAction, EmailActionResult,
  Actor, MaxAgeHours, ArchivedCount, CleanupCount,
  Name, CreatedBy, ServiceProvider, Url, ErrorMessage,
  RequestCount, InboxCount, EmailCount, QuotaStatus, SoftDeleteResult,
  Timestamp, AuditLog, PageSize
} from '../taxonomy';
import { D1UserModule } from './d1_user_module';
import { D1EmailModule } from './d1_email_module';
import { D1SecurityModule } from './d1_security_module';
import { D1AccountModule } from './d1_account_module';
import { D1UtilityModule } from './d1_utility_module';
import {
  DELETE_SUCCESS, DELETE_FAILURE
} from '../taxonomy';
import type { IDatabaseQueryPort, CreateUserInput, UpsertEmailInput } from '../contract';
import type { CryptoEncryptAdapter } from './crypto_encrypt_adapter';

/**
 * D1DatabaseAdapter
 * Main implementation of IDatabaseQueryPort for Cloudflare D1.
 * AEC-aligned: Acts as a facade delegating to specialized modules.
 */
export class D1DatabaseAdapter implements IDatabaseQueryPort {
  private userModule: D1UserModule;
  private emailModule: D1EmailModule;
  private securityModule: D1SecurityModule;
  private accountModule: D1AccountModule;
  private utilityModule: D1UtilityModule;

  constructor(db: D1Database, crypto?: CryptoEncryptAdapter) {
    this.userModule = new D1UserModule(db, this);
    this.emailModule = new D1EmailModule(db, this);
    this.securityModule = new D1SecurityModule(db, this);
    this.accountModule = new D1AccountModule(db, this, crypto);
    this.utilityModule = new D1UtilityModule(db, this);
  }

  // --- User & Session Operations ---
  async getUsers(): Promise<User[]> { return this.userModule.getUsers(); }
  async getUserById(userId: UserId): Promise<User | null> { return this.userModule.getUserById(userId); }
  async getUserByEmail(email: EmailAddress): Promise<User | null> { return this.userModule.getUserByEmail(email); }
  async createUser(input: CreateUserInput): Promise<User> { return this.userModule.createUser(input); }
  async deleteUser(userId: UserId): Promise<DeleteResult> { return this.userModule.deleteUser(userId); }
  async softDeleteUser(userId: UserId): Promise<SoftDeleteResult> { return this.userModule.softDeleteUser(userId); }
  async updateUser(userId: UserId, updates: { email?: EmailAddress; displayName?: DisplayName }): Promise<void> { return this.userModule.updateUser(userId, updates); }
  async updateUserPassword(userId: UserId, passwordHash: CryptoHash): Promise<void> { return this.userModule.updateUserPassword(userId, passwordHash); }

  async createLoginSession(session: Session): Promise<void> { return this.securityModule.createLoginSession(session); }
  async getLoginSessionByTokenHash(tokenHash: CryptoHash): Promise<Session | null> { return this.securityModule.getLoginSessionByTokenHash(tokenHash); }
  async deleteLoginSession(sessionId: SessionId): Promise<DeleteResult> {
    const ok = await this.securityModule.deleteLoginSession(sessionId);
    return ok ? DELETE_SUCCESS : DELETE_FAILURE;
  }
  async deleteExpiredSessions(): Promise<CleanupCount> { return this.securityModule.deleteExpiredSessions(); }

  // --- Email Operations ---
  async getUserInboxEmails(userId: UserId): Promise<Email[]> { return this.emailModule.getUserInboxEmails(userId); }
  async findEmail(userId: UserId, filters?: { from?: EmailAddress; subject?: Subject }): Promise<Email | null> { return this.emailModule.findEmail(userId, filters); }
  async getEmailById(userId: UserId, emailId: EmailId): Promise<Email | null> { return this.emailModule.getEmailById(userId, emailId); }
  async getEmailGlobal(emailId: EmailId): Promise<Email | null> { return this.emailModule.getEmailGlobal(emailId); }
  async upsertEmail(input: UpsertEmailInput): Promise<{ stored: Stored; reason?: Reason }> { return this.emailModule.upsertEmail(input); }
  async applyEmailQuickAction(userId: UserId, emailId: EmailId, action: EmailQuickAction, actor: Actor): Promise<EmailActionResult> { return this.emailModule.applyEmailQuickAction(userId, emailId, action, actor); }
  async cleanupExpiredEmails(maxAgeHours: MaxAgeHours): Promise<CleanupCount> { return this.emailModule.cleanupExpiredEmails(maxAgeHours); }
  async getUserArchivedCount(userId: UserId): Promise<ArchivedCount> { return this.emailModule.getUserArchivedCount(userId); }
  async getAllEmails(): Promise<Email[]> { return this.utilityModule.getAllEmails(); }
  async getAllArchivedCount(): Promise<ArchivedCount> { return this.utilityModule.getAllArchivedCount(); }

  // --- Security & Rate Limiting ---
  async createApiKeyRecord(id: ApiKeyId, keyHash: CryptoHash, name: Name | null, createdBy: CreatedBy | null): Promise<void> { return this.securityModule.createApiKeyRecord(id, keyHash, name, createdBy); }
  async getApiKeyByHash(keyHash: CryptoHash): Promise<import('../taxonomy').ApiKey | null> { return this.securityModule.getApiKeyByHash(keyHash); }
  async getApiKeyById(apiKeyId: ApiKeyId): Promise<import('../taxonomy').ApiKey | null> { return this.securityModule.getApiKeyById(apiKeyId); }
  async listApiKeys(): Promise<import('../taxonomy').ApiKey[]> { return this.securityModule.listApiKeys(); }
  async revokeApiKeyRecord(apiKeyId: ApiKeyId): Promise<void> { return this.securityModule.revokeApiKeyRecord(apiKeyId); }

  async getRequestCountInWindow(apiKeyId: ApiKeyId | null, userId: UserId | null, windowStart: Timestamp): Promise<RequestCount> { return this.securityModule.getRequestCountInWindow(apiKeyId, userId, windowStart); }
  async recordApiRequest(apiKeyId: ApiKeyId | null, userId: UserId | null): Promise<void> { return this.securityModule.recordApiRequest(apiKeyId, userId); }

  // --- Stats & Quotas ---
  async getUserInboxCount(userId: UserId): Promise<InboxCount> { return this.utilityModule.getUserInboxCount(userId); }
  async getUserEmailCount(userId: UserId): Promise<EmailCount> { return this.utilityModule.getUserEmailCount(userId); }
  async getRequestsLastMinute(userId: UserId): Promise<RequestCount> { return this.utilityModule.getRequestsLastMinute(userId); }
  async getQuotaStatus(userId: UserId): Promise<QuotaStatus | null> { return this.utilityModule.getQuotaStatus(userId); }
  async getDashboardMetrics(userId: UserId): Promise<DashboardMetric[]> { return this.utilityModule.getDashboardMetrics(userId); }
  async getDashboardStats(userId?: UserId): Promise<import('../taxonomy').DashboardStatsVO> { return this.utilityModule.getDashboardStats(userId); }

  // --- Audit Logging ---
  async createAuditLog(log: AuditLog): Promise<void> { return this.utilityModule.createAuditLog(log); }
  async getAuditLogsByUserId(userId: UserId, limit?: PageSize): Promise<AuditLog[]> { return this.utilityModule.getAuditLogsByUserId(userId, limit); }
  async getAuditLogsByApiKeyId(apiKeyId: ApiKeyId, limit?: PageSize): Promise<AuditLog[]> { return this.utilityModule.getAuditLogsByApiKeyId(apiKeyId, limit); }
  async getAuditLogsByTarget(targetId: string, targetType?: import('../taxonomy').AuditTargetType, limit?: PageSize): Promise<AuditLog[]> { return this.utilityModule.getAuditLogsByTarget(targetId, targetType, limit); }
  async getRecentAuditLogs(limit?: PageSize): Promise<AuditLog[]> { return this.utilityModule.getRecentAuditLogs(limit); }

  // --- Account & Management ---
  async createAccountRecord(id: AccountId, inboxId: InboxId, provider: ServiceProvider, targetEmail: EmailAddress, expiresAt: Timestamp, password?: string, apiKey?: string): Promise<void> {
    return this.accountModule.createAccountRecord(id, inboxId, provider, targetEmail, expiresAt, password, apiKey);
  }
  async getAccountById(accountId: AccountId): Promise<import('../taxonomy').Account | null> { return this.accountModule.getAccountById(accountId); }
  async getAccountByInboxId(inboxId: InboxId): Promise<import('../taxonomy').Account | null> { return this.accountModule.getAccountByInboxId(inboxId); }
  async updateAccountVerificationLink(accountId: AccountId, verificationLink: Url): Promise<void> { return this.accountModule.updateAccountVerificationLink(accountId, verificationLink); }
  async markAccountComplete(accountId: AccountId, apiKeyId: ApiKeyId): Promise<void> { return this.accountModule.markAccountComplete(accountId, apiKeyId); }
  async markAccountFailed(accountId: AccountId, error: ErrorMessage): Promise<void> { return this.accountModule.markAccountFailed(accountId, error); }
  async listPendingAccounts(): Promise<import('../taxonomy').Account[]> { return this.accountModule.listPendingAccounts(); }

  // --- Utility & Settings ---
  async getWorkerSettings(): Promise<WorkerSettings[]> { return this.utilityModule.getWorkerSettings(); }
  async setWorkerSetting(key: SettingKey, value: SettingValue): Promise<void> { return this.utilityModule.setWorkerSetting(key, value); }
  async healthCheck(): Promise<void> { return this.utilityModule.healthCheck(); }

  // --- Helper Parsers ---
  parseRecipients(raw: string) { return this.emailModule.parseRecipients(raw); }
  parseAttachments(raw: string) { return this.emailModule.parseAttachments(raw); }
  parseReferences(raw: string) { return this.emailModule.parseReferences(raw); }
}
