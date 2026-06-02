// agent/account_manage_router.ts
// Account domain router — third-party service account lifecycle
// Owns: account creation, verification, listing pending accounts

import type { AgentContainer } from './di_container_registry';
import type { InboxId, AccountId, ServiceProvider, EmailAddress, UserId, ApiKeyId, BodyText, PasswordPlain } from '../taxonomy';
import { asApiKeyId, asErrorMessage, asBodyText, asPasswordPlain, ForbiddenError } from '../taxonomy';

export class AccountManageRouter {
  constructor(private container: AgentContainer) { }

  async createAccount(input: import('../contract/accts_manage_io').CreateAccountInput) {
    return this.container.accountService.createAccount(input);
  }

  async getAccount(accountId: AccountId) {
    return this.container.accountService.getAccount(accountId);
  }

  async getAccountDetails(userId: UserId, accountId: AccountId) {
    const account = await this.container.accountService.getAccount(accountId);
    if (!account) return null;
    // Ownership check: verify the account belongs to the user's inbox
    const email = account.targetEmail.full;
    const inboxes = await this.container.database.getUserInboxEmails(userId);
    const owns = inboxes.some(e => e.from.email.full === email);
    if (!owns) {
      throw new ForbiddenError('Account does not belong to this user');
    }
    return account;
  }

  async getAccountByInboxId(inboxId: InboxId) {
    return this.container.accountService.getAccountByInbox(inboxId);
  }

  async listPendingAccounts() {
    return this.container.accountService.listPendingAccounts();
  }

  /**
   * Attempts to extract a verification link from an email body and update the account.
   */
  async tryAutoVerifyAccount(accountId: AccountId, emailBody: BodyText): Promise<boolean> {
    const link = this.container.emailExtraction.extractVerificationLink(asBodyText(emailBody));
    if (!link) return false;

    await this.container.accountService.updateVerification({ accountId, verificationLink: link });
    return true;
  }

  async completeAccount(accountId: AccountId, apiKeyId: string, rawApiKey?: string): Promise<void> {
    await this.container.accountService.markComplete({ accountId, apiKeyId: asApiKeyId(apiKeyId), apiKey: rawApiKey });
  }

  async failAccount(accountId: AccountId, error: string): Promise<void> {
    await this.container.accountService.markFailed(accountId, asErrorMessage(error));
  }
}
