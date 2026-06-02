import type {
  User, Email, Session, WorkerSettings, DashboardMetric,
  UserId, EmailId, SessionId, InboxId, AccountId, ApiKeyId,
  EmailAddress, CryptoHash, SettingKey, SettingValue,
  DisplayName, Subject, Snippet, BodyText, RawMime, ContentType, HeadersJson,
  Timestamp, Stored, DeleteResult, Reason, EmailQuickAction, EmailActionResult,
  Actor, MaxAgeHours, ArchivedCount, CleanupCount,
  Name, CreatedBy, ServiceProvider, Url, ErrorMessage,
  RequestCount, InboxCount, EmailCount, QuotaStatus,
  AuditLog, AuditEventType, AuditTargetType, EntityId, PasswordPlain, PageSize
} from '../taxonomy';

export interface CreateUserInput {
  email: EmailAddress;
  displayName?: DisplayName;
  passwordHash?: CryptoHash;
}

export interface UpsertEmailInput {
  emailId: EmailId;
  sender: EmailAddress;
  recipient: EmailAddress;
  subject?: Subject;
  snippet?: Snippet;
  bodyText?: BodyText;
  receivedAt?: Timestamp;
  rawMime?: RawMime;
  contentType?: ContentType;
  headersJson?: HeadersJson;
}

export interface IDatabaseQueryPort {
  getUsers(): Promise<User[]>;
  getUserById(userId: UserId): Promise<User | null>;
  getUserByEmail(email: EmailAddress): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;
  deleteUser(userId: UserId): Promise<DeleteResult>;
  softDeleteUser(userId: UserId): Promise<import('../taxonomy').SoftDeleteResult>;
  updateUser(userId: UserId, updates: { email?: EmailAddress; displayName?: DisplayName }): Promise<void>;
  updateUserPassword(userId: UserId, passwordHash: CryptoHash): Promise<void>;
  getUserInboxEmails(userId: UserId): Promise<Email[]>;
  findEmail(userId: UserId, filters?: { from?: EmailAddress; subject?: Subject }): Promise<Email | null>;
  getUserArchivedCount(userId: UserId): Promise<ArchivedCount>;
  getAllEmails(): Promise<Email[]>;
  getAllArchivedCount(): Promise<ArchivedCount>;
  getEmailById(userId: UserId, emailId: EmailId): Promise<Email | null>;
  getEmailGlobal(emailId: EmailId): Promise<Email | null>;
  upsertEmail(input: UpsertEmailInput): Promise<{ stored: Stored; reason?: Reason }>;
  getDashboardMetrics(userId: UserId): Promise<DashboardMetric[]>;
  getDashboardStats(userId?: UserId): Promise<import('../taxonomy').DashboardStatsVO>;
  getWorkerSettings(): Promise<WorkerSettings[]>;
  setWorkerSetting(key: SettingKey, value: SettingValue): Promise<void>;
  createLoginSession(session: Session): Promise<void>;
  getLoginSessionByTokenHash(tokenHash: CryptoHash): Promise<Session | null>;
  deleteLoginSession(sessionId: SessionId): Promise<DeleteResult>;
  deleteExpiredSessions(): Promise<CleanupCount>;
  applyEmailQuickAction(userId: UserId, emailId: EmailId, action: EmailQuickAction, actor: Actor): Promise<EmailActionResult>;

  // Cleanup operations
  cleanupExpiredEmails(maxAgeHours: MaxAgeHours): Promise<CleanupCount>;

  // API Key operations
  createApiKeyRecord(id: ApiKeyId, keyHash: CryptoHash, name: Name | null, createdBy: CreatedBy | null): Promise<void>;
  getApiKeyByHash(keyHash: CryptoHash): Promise<import('../taxonomy').ApiKey | null>;
  listApiKeys(): Promise<import('../taxonomy').ApiKey[]>;
  getApiKeyById(apiKeyId: ApiKeyId): Promise<import('../taxonomy').ApiKey | null>;
  revokeApiKeyRecord(apiKeyId: ApiKeyId): Promise<void>;

  // Account operations (account_service)
  createAccountRecord(id: AccountId, inboxId: InboxId, provider: ServiceProvider, targetEmail: EmailAddress, expiresAt: Timestamp, password?: PasswordPlain, apiKey?: string): Promise<void>;
  getAccountById(accountId: AccountId): Promise<import('../taxonomy').Account | null>;
  getAccountByInboxId(inboxId: InboxId): Promise<import('../taxonomy').Account | null>;
  updateAccountVerificationLink(accountId: AccountId, verificationLink: Url): Promise<void>;
  markAccountComplete(accountId: AccountId, apiKeyId: ApiKeyId, apiKey?: string): Promise<void>;
  markAccountFailed(accountId: AccountId, error: ErrorMessage): Promise<void>;
  listPendingAccounts(): Promise<import('../taxonomy').Account[]>;

  // Rate limit operations
  getRequestCountInWindow(apiKeyId: ApiKeyId | null, userId: UserId | null, windowStart: Timestamp, clientIp?: string | null): Promise<RequestCount>;
  recordApiRequest(apiKeyId: ApiKeyId | null, userId: UserId | null, clientIp?: string | null): Promise<void>;

  // Quota operations
  getUserInboxCount(userId: UserId): Promise<InboxCount>;
  getUserEmailCount(userId: UserId): Promise<EmailCount>;
  getRequestsLastMinute(userId: UserId): Promise<RequestCount>;
  getQuotaStatus(userId: UserId): Promise<QuotaStatus | null>;

  // Audit log operations
  createAuditLog(log: AuditLog): Promise<void>;
  getAuditLogsByUserId(userId: UserId, limit?: PageSize): Promise<AuditLog[]>;
  getAuditLogsByApiKeyId(apiKeyId: ApiKeyId, limit?: PageSize): Promise<AuditLog[]>;
  getAuditLogsByTarget(targetId: EntityId, targetType?: AuditTargetType, limit?: PageSize): Promise<AuditLog[]>;
  getRecentAuditLogs(limit?: PageSize): Promise<AuditLog[]>;
  healthCheck(): Promise<void>;
}
