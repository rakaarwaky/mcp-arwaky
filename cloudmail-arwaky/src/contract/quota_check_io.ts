// contract/quota_check_io.ts
// Quota — check, usage

import type { ApiKeyId, UserId, MaxInboxes, InboxCount, EmailCount, RequestCount, Allowed } from '../taxonomy';
import type { QuotaUsage } from '../taxonomy';

export interface QuotaCheckInput { apiKeyId: ApiKeyId | null; userId: UserId | null; }
export interface QuotaUsageInput { apiKeyId: ApiKeyId | null; userId: UserId | null; }
export interface QuotaCheckOutput { allowed: Allowed; remainingInboxes: MaxInboxes; currentInboxes: InboxCount; currentEmails: EmailCount; requestsLastMinute: RequestCount; }
export interface QuotaUsageOutput { usage: QuotaUsage; }
