// taxonomy/audit_log_entity.ts
// Audit log entity — tracks user, inbox, and auth events for security and compliance

import type { Timestamp } from './timestamp_epoch_vo';
import type { UserId, InboxId, EmailId, ApiKeyId, EntityId } from './id_identity_vo';
import type { EmailAddress } from './email_address_vo';
import type { IpAddress } from './ip_network_vo';
import type { UserAgent } from './http_context_vo';
import type { CorrelationId } from './correlation_id_vo';

export type AuditLogId = string & { readonly __brand: 'AuditLogId' };
export function newAuditLogId(): AuditLogId {
  return crypto.randomUUID() as AuditLogId;
}

export function asAuditLogId(s: string): AuditLogId {
  if (typeof s !== 'string' || s.length === 0) throw new Error(`Invalid AuditLogId: ${s}`);
  return s as AuditLogId;
}


export interface AuditLog {
  id: AuditLogId;
  timestamp: Timestamp;
  eventType: AuditEventType;
  userId: UserId | null;
  apiKeyId: ApiKeyId | null;
  targetId?: EntityId;
  targetType?: AuditTargetType;
  ipAddress?: IpAddress;
  userAgent?: UserAgent;
  correlationId?: CorrelationId | null;
  metadata?: Record<string, unknown>;
}

export type AuditEventType =
  | 'user_created'
  | 'user_deleted'
  | 'user_login'
  | 'user_logout'
  | 'inbox_created'
  | 'inbox_deleted'
  | 'email_received'
  | 'email_actioned'
  | 'email_starred'
  | 'email_archived'
  | 'email_read'
  | 'email_deleted'
  | 'apikey_created'
  | 'apikey_revoked'
  | 'apikey_used'
  | 'account_created'
  | 'account_verified'
  | 'account_completed'
  | 'account_failed'
  | 'rate_limit_exceeded'
  | 'quota_exceeded'
  | 'api_request';

export type AuditTargetType =
  | 'user'
  | 'inbox'
  | 'email'
  | 'apikey'
  | 'account'
  | 'session';

