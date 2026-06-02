// contract/accts_auto_io.ts
// Accounts — create, get, verify, complete, fail

import type { AccountId, InboxId, EmailAddress, Url, Timestamp, AccountStatus, ErrorMessage, ApiKeyId, ServiceProvider, ApiOperationSuccess, PasswordPlain } from '../taxonomy';

export interface CreateAccountInput { inboxId: InboxId; provider: ServiceProvider; targetEmail: EmailAddress; password?: PasswordPlain; apiKey?: string; }
export interface GetAccountInput { accountId: AccountId; }
export interface ListPendingAccountsInput { }
export interface UpdateVerificationInput { accountId: AccountId; verificationLink: Url; }
export interface MarkAccountCompleteInput { accountId: AccountId; apiKeyId: ApiKeyId; apiKey?: string; }
export interface MarkAccountFailedInput { accountId: AccountId; error: ErrorMessage; }
export interface AccountDetail {
    id: AccountId;
    inboxId: InboxId;
    status: AccountStatus;
    provider: ServiceProvider;
    targetEmail: EmailAddress;
    verificationLink: Url | null;
    apiKey: string | null;
    apiKeyId: ApiKeyId | null; // Masked — last 4 chars only
    password: string | null;
    createdAt: Timestamp;
    completedAt: Timestamp | null;
    expiresAt: Timestamp;
    errorMessage: ErrorMessage | null;
}

// Internal use only — contains secrets (password, full API key)
export interface AccountSecretRead {
    id: AccountId;
    status: AccountStatus;
    provider: ServiceProvider;
    targetEmail: EmailAddress;
    password: PasswordPlain | null;
    verificationLink: Url | null;
    apiKey: string | null;
    apiKeyId: ApiKeyId | null;
    createdAt: Timestamp;
    completedAt: Timestamp | null;
    expiresAt: Timestamp;
    errorMessage: ErrorMessage | null;
}
export interface CreateAccountOutput { accountId?: AccountId; ok?: ApiOperationSuccess; message?: string; error?: string; }
export interface GetAccountOutput { account: AccountDetail | null; }
export interface ListPendingAccountsOutput { accounts: Array<{ id: AccountId; inboxId: InboxId; provider: ServiceProvider; targetEmail: EmailAddress; createdAt: Timestamp; }>; }
export interface UpdateVerificationOutput { ok: ApiOperationSuccess; }
export interface MarkAccountCompleteOutput { ok: ApiOperationSuccess; }
export interface MarkAccountFailedOutput { ok: ApiOperationSuccess; }
