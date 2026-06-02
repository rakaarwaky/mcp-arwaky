// taxonomy/worker_config_vo.ts
// Worker configuration types

import type { UserId, EntityId } from './id_identity_vo';
import type { Domain, Url } from './web_url_vo';
import type { TimeoutSeconds, PollIntervalSeconds, SessionMaxAge, MaxAgeHours } from './time_duration_vo';
import type { CookieName, Password } from './auth_credential_vo';
import type { EmailAddress } from './email_address_vo';
import type { DisplayName } from './text_content_vo';
import type { FeatureFlag, ChromePath, UserDataDir } from './generic_identity_vo';
import type { MaxInboxes, MaxEmailsPerInbox, RequestsPerMinute } from './quota_limit_vo';
import type { RemoteDebuggingPort } from './counter_value_vo';
import type { ResilienceBreakerOptions } from './resilience_breaker_vo';

export type SettingKey = string & { readonly __brand: 'SettingKey' };
export type SettingValue = string & { readonly __brand: 'SettingValue' };
export type EmailDomain = string & { readonly __brand: 'EmailDomain' };
export type AllowedIds = UserId[]; // Array of allowed user IDs
export type TargetMode = 'development' | 'staging' | 'production' & { readonly __brand: 'TargetMode' };
export type FaultId = string & { readonly __brand: 'FaultId' };

export function asSettingKey(s: string): SettingKey {
  if (!s || s.trim().length === 0) {
    throw new Error('Setting key cannot be empty');
  }
  return s as SettingKey;
}
export function asSettingValue(s: string | null | undefined): SettingValue | null {
  if (s === null || s === undefined) {
    return null;
  }
  return s as SettingValue;
}
export function asEmailDomain(s: string): EmailDomain {
  if (!s.includes('.') || s.includes(' ')) {
    throw new Error(`Invalid email domain: ${s}`);
  }
  return s as EmailDomain;
}

export function asTargetMode(s: string): TargetMode {
  const allowed = ['development', 'staging', 'production'];
  if (!allowed.includes(s)) {
    throw new Error(`Invalid target mode: ${s}. Must be one of: ${allowed.join(', ')}`);
  }
  return s as TargetMode;
}

export function asFaultId(s: string): FaultId {
  if (!s || s.trim().length === 0) {
    throw new Error('Fault ID cannot be empty');
  }
  return s as FaultId;
}

/**
 * Parses a comma-separated string of user IDs into AllowedIds array.
 * Empty string returns empty array.
 */
export function parseAllowedIds(csv: string): AllowedIds {
  if (!csv || csv.trim() === '') {
    return [];
  }
  return csv.split(',').map(id => id.trim() as UserId).filter(id => id.length > 0);
}

/**
 * Serializes AllowedIds array to comma-separated string for storage.
 */
export function serializeAllowedIds(ids: AllowedIds): string {
  if (!ids) return '';
  if (typeof ids === 'string') return ids;
  if (!Array.isArray(ids)) return '';
  return ids.join(',');
}

// Bot and webhook configuration constants
export const BOT_TOKEN_CONFIGURED = true;
export const BOT_TOKEN_NOT_CONFIGURED = false;
export const WEBHOOK_SECRET_CONFIGURED = true;
export const WEBHOOK_SECRET_NOT_CONFIGURED = false;
export const FORWARD_INBOUND = true;
export const FORWARD_INBOUND_DISABLED = false;

// --- Application Configuration ---

export interface AppConfig {
  readonly api: {
    readonly baseUrl: Url;
    readonly timeoutMs: TimeoutSeconds; // Note: Adapter uses TimeoutSeconds brand for MS value
  };
  readonly email: {
    readonly defaultDomain: Domain;
    readonly cleanupMaxAgeHours: MaxAgeHours;
    readonly pollIntervalSeconds: PollIntervalSeconds;
    readonly pollTimeoutSeconds: TimeoutSeconds;
  };
  readonly session: {
    readonly maxAgeSeconds: SessionMaxAge;
    readonly cookieName: CookieName;
  };
  readonly account: {
    readonly expiryHours: MaxAgeHours;
  };
  readonly rateLimit: {
    readonly defaultLimit: RequestsPerMinute;
    readonly windowSeconds: TimeoutSeconds;
  };
  readonly quota: {
    readonly maxInboxesPerKey: MaxInboxes;
    readonly maxEmailsPerInbox: MaxEmailsPerInbox;
    readonly maxRequestsPerMinute: RequestsPerMinute;
  };
  readonly admin: {
    readonly email: EmailAddress;
    readonly password: Password;
    readonly displayName: DisplayName;
  };
  readonly automation: {
    readonly chromePath: ChromePath;
    readonly userDataDir: UserDataDir;
    readonly port: RemoteDebuggingPort;
    readonly headless: boolean;
  };
  readonly featureFlags: Record<FeatureFlag, boolean>;
  readonly resilience: {
    readonly faultInjection: Record<FaultId, {
      readonly enabled: boolean;
      readonly probability: number;
      readonly delayMs?: number;
      readonly delayProbability?: number;
    }>;
  };
}

