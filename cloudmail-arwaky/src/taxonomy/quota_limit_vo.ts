// taxonomy/quota_limit_vo.ts
// Rate limit and quota definitions

import type { EmailCount, RequestCount } from './counter_value_vo';

export type MaxInboxes = number & { readonly __brand: 'MaxInboxes' };
export type MaxEmailsPerInbox = number & { readonly __brand: 'MaxEmailsPerInbox' };
export type RequestsPerMinute = number & { readonly __brand: 'RequestsPerMinute' };
export type InboxTtlSeconds = number & { readonly __brand: 'InboxTtlSeconds' };
export type InboxCount = number & { readonly __brand: 'InboxCount' };
export type MaxConnections = number & { readonly __brand: 'MaxConnections' };

export function asMaxInboxes(n: number): MaxInboxes { return Math.max(0, Math.floor(n)) as MaxInboxes; }
export function asMaxEmailsPerInbox(n: number): MaxEmailsPerInbox { return Math.max(0, Math.floor(n)) as MaxEmailsPerInbox; }
export function asRequestsPerMinute(n: number): RequestsPerMinute { return Math.max(0, Math.floor(n)) as RequestsPerMinute; }
export function asInboxTtlSeconds(n: number): InboxTtlSeconds { return Math.max(0, Math.floor(n)) as InboxTtlSeconds; }
export function asInboxCount(n: number): InboxCount { return Math.max(0, Math.floor(n)) as InboxCount; }
export function asMaxConnections(n: number): MaxConnections { return Math.max(0, Math.floor(n)) as MaxConnections; }

export interface QuotaLimits {
  maxInboxes: MaxInboxes;
  maxEmailsPerInbox: MaxEmailsPerInbox;
  requestsPerMinute: RequestsPerMinute;
  inboxTtlSeconds: InboxTtlSeconds;
}

export interface QuotaUsage {
  currentInboxes: InboxCount;
  currentEmails: EmailCount;
  requestsLastMinute: RequestCount;
}

export function isOverQuota(usage: QuotaUsage, limits: QuotaLimits): boolean {
  return usage.currentInboxes > limits.maxInboxes
    || usage.requestsLastMinute > limits.requestsPerMinute;
}

export function remainingInboxes(usage: QuotaUsage, limits: QuotaLimits): MaxInboxes {
  const current = Math.max(0, usage.currentInboxes);
  return asMaxInboxes(Math.max(0, limits.maxInboxes - current));
}

export const DEFAULT_QUOTA: QuotaLimits = {
  maxInboxes: asMaxInboxes(50),
  maxEmailsPerInbox: asMaxEmailsPerInbox(100),
  requestsPerMinute: asRequestsPerMinute(60),
  inboxTtlSeconds: asInboxTtlSeconds(86400),
};

export const QUOTA_LIMIT_DOMAIN = 'quota_limit';

export interface QuotaStatus {
  usagePercent: number;
  limit: number;
  current: number;
}
