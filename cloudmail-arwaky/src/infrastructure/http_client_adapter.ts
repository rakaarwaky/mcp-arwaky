// infrastructure/http_client_adapter.ts
// HTTP implementation of IDatabaseQueryPort — talks to deployed Worker API
// Used by MCP server and local CLI (not on Cloudflare)
// Follows AES: infrastructure knows taxonomy, contract, agent

import type {
  User, UserId, Email, EmailId, Session, SessionId, InboxId,
  WorkerSettings, DashboardMetric, UpdateId, DashboardStatsVO,
  Timestamp, HealthStatus, DeleteResult, SoftDeleteResult, CleanupCount, ArchivedCount, Stored, Reason, EmailQuickAction, EmailActionResult, ApiKeyId, Name, CreatedBy, AccountId, ServiceProvider, ErrorMessage, RequestCount, InboxCount, EmailCount,
  ApiKey, Account, AuditLog, EntityId, PasswordPlain, Actor, MaxAgeHours, PageSize,
  SettingKey, SettingValue
} from '../taxonomy';
import type {
  EmailAddress, DisplayName, CryptoHash, Password, UserAgent, ClientIp, Url, AuthToken, RawText, Subject, Snippet, BodyText, RawMime, ContentType, HeadersJson
} from '../taxonomy';
import type { IDatabaseQueryPort, CreateUserInput, UpsertEmailInput } from '../contract';
import { HttpClientBase, HttpClientConfig } from './http_client_base';
import { asCleanupCount, asArchivedCount, asRequestCount, asInboxCount, asEmailCount, nowTimestamp, asRelativePath, asPageSize } from '../taxonomy';
import type { QuotaStatus } from '../taxonomy';

export class HttpClientAdapter extends HttpClientBase implements IDatabaseQueryPort {
  constructor(config: HttpClientConfig) {
    super(config);
  }

  // ── Users ──

  async getUsers(): Promise<User[]> {
    const r = await this.request<{ users: User[] }>('GET', asRelativePath('/api/users'));
    return r.users;
  }

  async getUserById(userId: UserId): Promise<User | null> {
    return this.request<User | null>('GET', asRelativePath(`/api/users/${userId}`));
  }

  async getUserByEmail(email: EmailAddress): Promise<User | null> {
    return this.request<User | null>('GET', asRelativePath(`/api/users?email=${encodeURIComponent(email.full)}`));
  }

  async createUser(input: CreateUserInput): Promise<User> {
    // Worker expects plain password; passwordHash is ignored.
    const payload: Record<string, unknown> = { email: input.email.full };
    if (input.displayName) payload.displayName = String(input.displayName);
    // input.passwordHash must not be sent; Worker hashes internally.
    if (input.passwordHash) {
      throw new Error('createUser via HTTP: passwordHash not accepted — plain password must be sent. Use CLI which hashes before calling this method.');
    }
    return this.request<User>('POST', asRelativePath('/api/users'), payload);
  }

  async updateUser(userId: UserId, updates: { email?: EmailAddress; displayName?: DisplayName }): Promise<void> {
    await this.request('PUT', asRelativePath(`/api/users/${userId}`), updates);
  }

  async deleteUser(userId: UserId): Promise<DeleteResult> {
    await this.request('DELETE', asRelativePath(`/api/users/${userId}`));
    return true as unknown as DeleteResult;
  }

  async softDeleteUser(userId: UserId): Promise<SoftDeleteResult> {
    await this.request('DELETE', asRelativePath(`/api/users/${userId}`));
    return true as unknown as SoftDeleteResult;
  }

  async updateUserPassword(_userId: UserId, _passwordHash: CryptoHash): Promise<void> {
    // Worker expects plain password in body; it hashes internally.
    throw new Error('updateUserPassword via HTTP: cannot send passwordHash; plain password required. Use direct DB access or internal agent.');
  }

  // ── Emails ──

  async getUserInboxEmails(userId: UserId): Promise<Email[]> {
    const r = await this.request<{ emails: Email[] }>('GET', asRelativePath(`/api/me/inbox?userId=${encodeURIComponent(String(userId))}`));
    return r.emails;
  }

  async findEmail(userId: UserId, filters?: { from?: EmailAddress; subject?: Subject }): Promise<Email | null> {
    const emails = await this.getUserInboxEmails(userId);
    for (const email of emails) {
      if (filters?.from && email.from.email.full !== filters.from.full) continue;
      if (filters?.subject && email.subject !== filters.subject) continue;
      return email;
    }
    return null;
  }

  async getEmailById(_userId: UserId, emailId: EmailId): Promise<Email | null> {
    return this.request<Email | null>('GET', asRelativePath(`/api/me/emails/${emailId}`));
  }

  async getEmailGlobal(emailId: EmailId): Promise<Email | null> {
    return this.request<Email | null>('GET', asRelativePath(`/api/emails/${emailId}`));
  }

  async upsertEmail(_input: UpsertEmailInput): Promise<{ stored: Stored; reason?: Reason }> {
    throw new Error('upsertEmail not supported via HTTP API — emails are created by inbound email processing only');
  }

  async applyEmailQuickAction(userId: UserId, emailId: EmailId, action: EmailQuickAction, actor: Actor): Promise<EmailActionResult> {
    return this.request<EmailActionResult>('POST', asRelativePath(`/api/me/emails/${emailId}/action`), { action, userId, actor });
  }

  // ── Dashboard Metrics ──

  async getDashboardMetrics(_userId: UserId): Promise<DashboardMetric[]> {
    const r = await this.request<{ metrics: DashboardMetric[]; stats: DashboardStatsVO }>('GET', asRelativePath('/api/dashboard'));
    return r.metrics;
  }

  async getDashboardStats(_userId?: UserId): Promise<DashboardStatsVO> {
    const r = await this.request<{ stats: DashboardStatsVO }>('GET', asRelativePath('/api/dashboard'));
    return r.stats;
  }

  async getUserArchivedCount(userId: UserId): Promise<ArchivedCount> {
    const r = await this.request<{ archivedCount: number }>('GET', asRelativePath(`/api/me/inbox?userId=${encodeURIComponent(String(userId))}`));
    return asArchivedCount(r.archivedCount);
  }

  async getAllEmails(): Promise<Email[]> {
    const r = await this.request<{ emails: Email[] }>('GET', asRelativePath('/api/admin/emails'));
    return r.emails ?? [];
  }

  async getAllArchivedCount(): Promise<ArchivedCount> {
    const r = await this.request<{ archivedCount: number }>('GET', asRelativePath('/api/admin/emails/archived-count'));
    return asArchivedCount(r.archivedCount);
  }

  // ── Login Sessions ──
  // NOTE: Sessions are internal to Worker; no public HTTP endpoints

  async createLoginSession(_session: Session): Promise<void> {
    throw new Error('createLoginSession not supported via HTTP API — sessions managed internally');
  }

  async getLoginSessionByTokenHash(_tokenHash: CryptoHash): Promise<Session | null> {
    throw new Error('getLoginSessionByTokenHash not supported via HTTP API');
  }

  async deleteLoginSession(_sessionId: SessionId): Promise<DeleteResult> {
    throw new Error('deleteLoginSession not supported via HTTP API');
  }

  async deleteExpiredSessions(): Promise<CleanupCount> {
    throw new Error('deleteExpiredSessions not supported via HTTP API');
  }

  // ── Access Codes ──

  // ── Worker Settings ──

  async getWorkerSettings(): Promise<WorkerSettings[]> {
    const r = await this.request<{ settings: Record<string, any> }>('GET', asRelativePath('/api/worker-settings'));
    return Object.entries(r.settings ?? {}).map(([key, value]) => ({
      key: key as SettingKey,
      value: value as SettingValue,
      updatedAt: nowTimestamp()
    }));
  }

  async setWorkerSetting(key: SettingKey, value: SettingValue): Promise<void> {
    await this.request('PUT', asRelativePath('/api/worker-settings'), { [key]: value });
  }

  // ── Cleanup operations ──

  async cleanupExpiredEmails(maxAgeHours: MaxAgeHours): Promise<CleanupCount> {
    const r = await this.request<{ deleted: number }>('POST', asRelativePath('/api/cleanup'), { maxAgeHours });
    return asCleanupCount(r.deleted);
  }

  // ── Health ──

  async healthCheck(): Promise<void> {
    await this.request<HealthStatus>('GET', asRelativePath('/api/health'));
  }

  // ── Missing IDatabaseQueryPort methods ──

  async createApiKeyRecord(_id: ApiKeyId, _keyHash: CryptoHash, _name: Name | null, _createdBy: CreatedBy | null): Promise<void> {
    throw new Error('createApiKeyRecord not supported via HTTP — use createApiKey() through agent');
  }

  async getApiKeyByHash(_keyHash: CryptoHash): Promise<import('../taxonomy').ApiKey | null> {
    throw new Error('getApiKeyByHash not supported via HTTP — no endpoint available');
  }

  async listApiKeys(): Promise<import('../taxonomy').ApiKey[]> {
    const r = await this.request<{ keys: import('../taxonomy').ApiKey[] }>('GET', asRelativePath('/api/apikeys'));
    return r.keys ?? [];
  }

  async getApiKeyById(apiKeyId: ApiKeyId): Promise<import('../taxonomy').ApiKey | null> {
    return this.request<import('../taxonomy').ApiKey | null>('GET', asRelativePath(`/api/apikeys/${apiKeyId}`));
  }

  async revokeApiKeyRecord(apiKeyId: ApiKeyId): Promise<void> {
    await this.request('DELETE', asRelativePath(`/api/apikeys/${apiKeyId}`));
  }

  async createAccountRecord(id: AccountId, inboxId: InboxId, provider: ServiceProvider, targetEmail: EmailAddress, expiresAt: Timestamp, password?: PasswordPlain): Promise<void> {
    await this.request('POST', asRelativePath('/api/accounts'), { id, inboxId, provider, targetEmail, expiresAt, password });
  }

  async getAccountById(accountId: AccountId): Promise<Account | null> {
    return this.request<Account | null>('GET', asRelativePath(`/api/accounts/${accountId}`));
  }

  async getAccountByInboxId(_inboxId: InboxId): Promise<Account | null> {
    throw new Error('getAccountByInboxId not supported via HTTP API — no endpoint available');
  }

  async updateAccountVerificationLink(_accountId: AccountId, _verificationLink: Url): Promise<void> {
    throw new Error('updateAccountVerificationLink not supported via HTTP API');
  }

  async markAccountComplete(accountId: AccountId, apiKeyId: ApiKeyId): Promise<void> {
    await this.request('POST', asRelativePath(`/api/accounts/${accountId}/complete`), { apiKeyId });
  }

  async markAccountFailed(accountId: AccountId, error: ErrorMessage): Promise<void> {
    await this.request('POST', asRelativePath(`/api/accounts/${accountId}/failed`), { error });
  }

  async listPendingAccounts(): Promise<Account[]> {
    return this.request<Account[]>( 'GET', asRelativePath('/api/accounts/pending'));
  }

  // ── Rate limit operations ──
  // NOTE: Rate limiting is internal; no public HTTP endpoints

  async getRequestCountInWindow(_apiKeyId: ApiKeyId | null, _userId: UserId | null, _windowStart: Timestamp): Promise<RequestCount> {
    throw new Error('getRequestCountInWindow not supported via HTTP API');
  }

  async recordApiRequest(_apiKeyId: ApiKeyId | null, _userId: UserId | null): Promise<void> {
    // No-op: rate limiting recorded internally by Worker
    return;
  }

  // ── Quota operations ──
  // NOTE: Quota endpoints not exposed via HTTP; handled internally by Worker

  async getUserInboxCount(_userId: UserId): Promise<InboxCount> {
    throw new Error('getUserInboxCount not supported via HTTP API');
  }

  async getUserEmailCount(_userId: UserId): Promise<EmailCount> {
    throw new Error('getUserEmailCount not supported via HTTP API');
  }

  async getRequestsLastMinute(_userId: UserId): Promise<RequestCount> {
    throw new Error('getRequestsLastMinute not supported via HTTP API');
  }

  async getQuotaStatus(_userId: UserId): Promise<QuotaStatus> {
    throw new Error('getQuotaStatus not supported via HTTP API');
  }

  // ── Audit Logging ──
  // NOTE: Audit logs are created internally; only GET endpoints are public

  async createAuditLog(_log: AuditLog): Promise<void> {
    throw new Error('createAuditLog not supported via HTTP API — audit logs created internally');
  }

  async getAuditLogsByUserId(userId: UserId, limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    const r = await this.request<{ logs: AuditLog[] }>('GET', asRelativePath(`/api/audit-logs/user/${userId}?limit=${limit}`));
    return r.logs ?? [];
  }

  async getAuditLogsByApiKeyId(apiKeyId: ApiKeyId, limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    const r = await this.request<{ logs: AuditLog[] }>('GET', asRelativePath(`/api/audit-logs/apikey/${apiKeyId}?limit=${limit}`));
    return r.logs ?? [];
  }

  async getAuditLogsByTarget(targetId: EntityId, targetType?: import('../taxonomy').AuditTargetType, limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    let url = `/api/audit-logs/target/${targetId}?limit=${limit}`;
    if (targetType) url += `&type=${encodeURIComponent(targetType)}`;
    const r = await this.request<{ logs: AuditLog[] }>('GET', asRelativePath(url));
    return r.logs ?? [];
  }

  async getRecentAuditLogs(_limit: PageSize = asPageSize(100)): Promise<AuditLog[]> {
    throw new Error('getRecentAuditLogs not supported via HTTP API — endpoint not implemented');
  }
}