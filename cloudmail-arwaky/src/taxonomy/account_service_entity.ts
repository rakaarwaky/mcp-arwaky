// taxonomy/account_service_entity.ts

import type { AccountId, InboxId, ApiKeyId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { EmailAddress } from './email_address_vo';
import type { Url } from './web_url_vo';
import type { ErrorMessage } from './text_content_vo';

import type { Password, AuthToken } from './auth_credential_vo';
import type { RawText } from './text_content_vo';

export type AccountStatus = 'created' | 'pending' | 'verifying' | 'verified' | 'key_extracted' | 'failed' | 'expired';
/**
 * ServiceProvider — branded string for provider identity.
 * Previously hardcoded as 'openrouter' | 'other'; now configurable.
 */
export type ServiceProvider = string & { readonly __brand: 'ServiceProvider' };

export function asServiceProvider(s: string): ServiceProvider { return s as ServiceProvider; }

export interface Account {
  id: AccountId;
  inboxId: InboxId;
  provider: ServiceProvider;
  status: AccountStatus;
  targetEmail: EmailAddress;
  password: Password | RawText | null;
  verificationLink: Url | null;
  apiKey: AuthToken | RawText | null;
  apiKeyId: ApiKeyId | null;
  errorMessage: ErrorMessage | null;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  expiresAt: Timestamp;
}

export function isComplete(a: Account): boolean {
  return ['key_extracted', 'failed'].includes(a.status);
}
export function isAccountPending(a: Account): boolean {
  return ['created', 'pending', 'verifying', 'verified'].includes(a.status);
}
