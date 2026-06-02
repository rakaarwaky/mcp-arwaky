import type { 
  Account, AccountId, InboxId, ServiceProvider, EmailAddress, Timestamp, Url, ApiKeyId, ErrorMessage 
} from '../taxonomy';
import { asPassword, asAuthToken, asRawText } from '../taxonomy';
import type { IDatabaseQueryPort } from '../contract';
import { D1RecordAdapter } from './d1_record_adapter';
import type { CryptoEncryptAdapter } from './crypto_encrypt_adapter';

export class D1AccountModule {
  constructor(private db: D1Database, private adapter: IDatabaseQueryPort, private crypto?: CryptoEncryptAdapter) { }

  async createAccountRecord(id: AccountId, inboxId: InboxId, provider: ServiceProvider, targetEmail: EmailAddress, expiresAt: Timestamp, password?: string, apiKey?: string): Promise<void> {
    const encryptedPassword = password && this.crypto ? await this.crypto.encrypt(password) : password ?? null;
    const encryptedApiKey = apiKey && this.crypto ? await this.crypto.encrypt(apiKey) : apiKey ?? null;
    const status = apiKey ? 'key_extracted' : 'pending';
    
    await this.db.prepare(`
      INSERT INTO accounts (id, inbox_id, provider, status, target_email, password, api_key, expires_at, created_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ${apiKey ? 'CURRENT_TIMESTAMP' : 'NULL'})
    `).bind(id, inboxId, provider, status, targetEmail.full, encryptedPassword, encryptedApiKey, expiresAt).run();
  }

  async getAccountById(accountId: AccountId): Promise<Account | null> {
    const row = await this.db.prepare(`
      SELECT id, inbox_id, provider, status, target_email, password, verification_link,
             api_key, api_key_id, error_message, created_at, completed_at, expires_at
      FROM accounts WHERE id = ? LIMIT 1
    `).bind(accountId).first<Record<string, unknown>>();
    if (!row) return null;
    const account = D1RecordAdapter.mapAccount(row);
    if (account.password && this.crypto) {
      account.password = asPassword(await this.crypto.decrypt(String(account.password)));
    }
    if (account.apiKey && this.crypto) {
      account.apiKey = asAuthToken(await this.crypto.decrypt(String(account.apiKey)));
    }
    return account;
  }

  async getAccountByInboxId(inboxId: InboxId): Promise<Account | null> {
    const row = await this.db.prepare(`
      SELECT id, inbox_id, provider, status, target_email, password, verification_link,
             api_key, api_key_id, error_message, created_at, completed_at, expires_at
      FROM accounts WHERE inbox_id = ? ORDER BY created_at DESC LIMIT 1
    `).bind(inboxId).first<Record<string, unknown>>();
    if (!row) return null;
    const account = D1RecordAdapter.mapAccount(row);
    if (account.password && this.crypto) {
      account.password = asPassword(await this.crypto.decrypt(String(account.password)));
    }
    if (account.apiKey && this.crypto) {
      account.apiKey = asAuthToken(await this.crypto.decrypt(String(account.apiKey)));
    }
    return account;
  }

  async updateAccountVerificationLink(accountId: AccountId, verificationLink: Url): Promise<void> {
    await this.db.prepare(`
      UPDATE accounts SET status = 'verifying', verification_link = ? WHERE id = ?
    `).bind(verificationLink, accountId).run();
  }

  async markAccountComplete(accountId: AccountId, apiKeyId: ApiKeyId, apiKey?: string): Promise<void> {
    const encryptedKey = apiKey && this.crypto ? await this.crypto.encrypt(apiKey) : apiKey ?? null;
    await this.db.prepare(`
      UPDATE accounts SET status = 'key_extracted', api_key_id = ?, api_key = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(apiKeyId, encryptedKey, accountId).run();
  }

  async markAccountFailed(accountId: AccountId, error: ErrorMessage): Promise<void> {
    await this.db.prepare(`
      UPDATE accounts SET status = 'failed', error_message = ? WHERE id = ?
    `).bind(error, accountId).run();
  }

  async listPendingAccounts(): Promise<Account[]> {
    const { results } = await this.db.prepare(`
      SELECT id, inbox_id, provider, status, target_email, password, verification_link,
             api_key, api_key_id, error_message, created_at, completed_at, expires_at
      FROM accounts WHERE status IN ('pending', 'verifying', 'verified')
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at ASC
    `).all<Record<string, unknown>>();
    const accounts = (results ?? []).map(row => D1RecordAdapter.mapAccount(row));
    if (this.crypto) {
      for (const account of accounts) {
        if (account.password) {
          account.password = await this.crypto.decrypt(account.password);
        }
        if (account.apiKey) {
          account.apiKey = await this.crypto.decrypt(account.apiKey);
        }
      }
    }
    return accounts;
  }
}
