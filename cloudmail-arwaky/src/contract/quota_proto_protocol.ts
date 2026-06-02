// contract/quota_proto_protocol.ts
// Quota — pure protocol interface (renamed from quota_management_protocol)

import type { ApiKeyId, UserId, InboxCount, EmailCount, RequestCount, MaxInboxes, Allowed } from '../taxonomy';
import type { QuotaLimits, QuotaUsage } from '../taxonomy';

export interface IQuotaManagementProtocol {
  getQuotaLimits(apiKeyId: ApiKeyId | null, userId: UserId | null): Promise<QuotaLimits>;
  getQuotaUsage(apiKeyId: ApiKeyId | null, userId: UserId | null): Promise<QuotaUsage>;
  checkQuota(apiKeyId: ApiKeyId | null, userId: UserId | null): Promise<{ allowed: Allowed; remainingInboxes: MaxInboxes; currentInboxes: InboxCount; currentEmails: EmailCount; requestsLastMinute: RequestCount }>;
  incrementInboxCount(apiKeyId: ApiKeyId | null, userId: UserId | null): Promise<void>;
  incrementEmailCount(apiKeyId: ApiKeyId | null, userId: UserId | null): Promise<void>;
  recordApiRequest(apiKeyId: ApiKeyId | null, userId: UserId | null): Promise<void>;
}
