// capabilities/account_service_actions.ts
// Implements IAccountServiceProtocol — OpenRouter account automation lifecycle

import type {
  AccountId, InboxId, EmailAddress, Url, ErrorMessage, Timestamp,
  AccountStatus, ServiceProvider, ApiKeyId, UserId, ExpiryHours
} from '../taxonomy';
import { newAccountId, asAccountId, asInboxId, asUserId, asTimestamp, asApiKeyId,
  MS_PER_HOUR, MASK_KEY_VISIBLE_CHARS, asExpiryHours, entityIdFrom,
  asServiceName, asAction
} from '../taxonomy';
import type {
  IAccountServiceProtocol,
  CreateAccountInput,
  UpdateVerificationInput,
  MarkAccountCompleteInput
} from '../contract/account_service_protocol';
import type { IDatabaseQueryPort, IMetricsCollectorPort } from '../contract';
import type { AccountDetail, AccountSecretRead } from '../contract/accts_manage_io';
import { AuditLogActions } from './audit_log_actions';

import { getConfig } from '../infrastructure/config_loader_adapter';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

function accountExpiryHours(): ExpiryHours {
  return asExpiryHours(getConfig().account.expiryHours);
}

export class AccountServiceActions implements IAccountServiceProtocol {
  constructor(
    private db: IDatabaseQueryPort, 
    private auditLog: AuditLogActions,
    private metrics: IMetricsCollectorPort
  ) { }

  /**
   * Initializes a new third-party service account record.
   * 
   * @param input Account details including provider and target email
   * @returns The unique ID of the created account
   */
  async createAccount(input: CreateAccountInput): Promise<AccountId> {
    return withMetrics(this.metrics, asServiceName('account_service'), asAction('createAccount'), async () => {
      const id = newAccountId();
      const expiresAt = asTimestamp(new Date(Date.now() + accountExpiryHours() * MS_PER_HOUR).toISOString());

      await this.db.createAccountRecord(
        id,
        input.inboxId,
        input.provider,
        input.targetEmail,
        expiresAt,
        input.password,
        input.apiKey
      );

      // Audit log - userId is the inboxId (which is a UserId in this system)
      await this.auditLog.logEvent({
        eventType: 'account_created',
        userId: asUserId(input.inboxId),
        targetId: entityIdFrom(id),
        targetType: 'account',
        metadata: { provider: input.provider, targetEmail: input.targetEmail.full }
      });

      return id;
    });
  }

  /**
   * Retrieves account details by ID. API keys are masked for security.
   */
  async getAccount(accountId: AccountId): Promise<AccountDetail | null> {
    return withMetrics(this.metrics, asServiceName('account_service'), asAction('getAccount'), async () => {
      const account = await this.db.getAccountById(accountId);
      if (!account) return null;

      // Return safe view — no password, masked API key
      return {
        id: account.id,
        inboxId: account.inboxId,
        status: account.status,
        provider: account.provider,
        targetEmail: account.targetEmail,
        verificationLink: account.verificationLink,
        apiKey: account.apiKey ? '***MASKED***' : null,
        apiKeyId: account.apiKeyId ? this.maskApiKey(account.apiKeyId) : null,
        password: null,
        createdAt: account.createdAt,
        completedAt: account.completedAt,
        expiresAt: account.expiresAt,
        errorMessage: account.errorMessage
      };
    });
  }

  /**
   * Retrieves account details associated with a specific inbox ID.
   */
  async getAccountByInbox(inboxId: InboxId): Promise<AccountDetail | null> {
    return withMetrics(this.metrics, asServiceName('account_service'), asAction('getAccountByInbox'), async () => {
      const account = await this.db.getAccountByInboxId(inboxId);
      if (!account) return null;

      // Return safe view — no password, masked API key
      return {
        id: account.id,
        inboxId: account.inboxId,
        status: account.status,
        provider: account.provider,
        targetEmail: account.targetEmail,
        verificationLink: account.verificationLink,
        apiKey: account.apiKey ? '***MASKED***' : null,
        apiKeyId: account.apiKeyId ? this.maskApiKey(account.apiKeyId) : null,
        password: null,
        createdAt: account.createdAt,
        completedAt: account.completedAt,
        expiresAt: account.expiresAt,
        errorMessage: account.errorMessage
      };
    });
  }

  /**
   * Updates the verification link for an account once extracted from an email.
   */
  async updateVerification(input: UpdateVerificationInput): Promise<void> {
    return withMetrics(this.metrics, asServiceName('account_service'), asAction('updateVerification'), async () => {
      await this.db.updateAccountVerificationLink(input.accountId, input.verificationLink);
      // Audit log
      await this.auditLog.logEvent({
        eventType: 'account_verified',
        targetId: entityIdFrom(input.accountId),
        targetType: 'account',
        metadata: { verificationLink: input.verificationLink }
      });
    });
  }

  /**
   * Finalizes the account setup process by attaching the extracted API key ID.
   */
  async markComplete(input: MarkAccountCompleteInput): Promise<void> {
    return withMetrics(this.metrics, asServiceName('account_service'), asAction('markComplete'), async () => {
      await this.db.markAccountComplete(input.accountId, input.apiKeyId, input.apiKey);
      // Audit log
      await this.auditLog.logEvent({
        eventType: 'account_completed',
        targetId: entityIdFrom(input.accountId),
        targetType: 'account',
        metadata: { apiKeyId: input.apiKeyId }
      });
    });
  }

  /**
   * Marks an account as failed with an error message.
   */
  async markFailed(accountId: AccountId, error: ErrorMessage): Promise<void> {
    return withMetrics(this.metrics, asServiceName('account_service'), asAction('markFailed'), async () => {
      await this.db.markAccountFailed(accountId, error);
      // Audit log
      await this.auditLog.logEvent({
        eventType: 'account_failed',
        targetId: entityIdFrom(accountId),
        targetType: 'account',
        metadata: { error }
      });
    });
  }

  /**
   * Lists all accounts that are still in 'pending' or 'verifying' state.
   */
  async listPendingAccounts(): Promise<{
    id: AccountId;
    inboxId: InboxId;
    provider: ServiceProvider;
    targetEmail: EmailAddress;
    createdAt: Timestamp;
  }[]> {
    return withMetrics(this.metrics, asServiceName('account_service'), asAction('listPendingAccounts'), async () => {
      const accounts = await this.db.listPendingAccounts();
      return accounts.map(a => ({
        id: a.id,
        inboxId: a.inboxId,
        provider: a.provider,
        targetEmail: a.targetEmail,
        createdAt: a.createdAt
      }));
    });
  }

  // ── Internal helper ──

  private maskApiKey(apiKeyId: ApiKeyId): ApiKeyId {
    // Mask API key for external exposure — unify with other surfaces
    const full = String(apiKeyId);
    if (full.length <= MASK_KEY_VISIBLE_CHARS) return apiKeyId;
    const masked = '****-****-' + full.slice(-MASK_KEY_VISIBLE_CHARS);
    return asApiKeyId(masked);
  }
}
