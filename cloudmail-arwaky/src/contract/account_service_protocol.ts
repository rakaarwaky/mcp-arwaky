// contract/account_service_protocol.ts
import type { AccountId, InboxId, EmailAddress, Url, ErrorMessage, Timestamp, AccountStatus, ServiceProvider } from '../taxonomy';
import type { CreateAccountInput, AccountDetail, UpdateVerificationInput, MarkAccountCompleteInput } from './accts_manage_io';
export type { CreateAccountInput, AccountDetail, UpdateVerificationInput, MarkAccountCompleteInput } from './accts_manage_io';

export interface IAccountServiceProtocol {
  createAccount(input: CreateAccountInput): Promise<AccountId>;
  getAccount(accountId: AccountId): Promise<AccountDetail | null>;
  getAccountByInbox(inboxId: InboxId): Promise<AccountDetail | null>;
  updateVerification(input: UpdateVerificationInput): Promise<void>;
  markComplete(input: MarkAccountCompleteInput): Promise<void>;
  markFailed(accountId: AccountId, error: ErrorMessage): Promise<void>;
  listPendingAccounts(): Promise<{ id: AccountId; inboxId: InboxId; provider: ServiceProvider; targetEmail: EmailAddress; createdAt: Timestamp }[]>;
}
