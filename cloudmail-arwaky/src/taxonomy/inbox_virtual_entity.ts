// taxonomy/inbox_virtual_entity.ts

import type { InboxId, UserId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { EmailAddress } from './email_address_vo';
import type { Label, Purpose } from './text_content_vo';
import type { EmailCount, UnreadCount } from './counter_value_vo';
import type { Active } from './operation_status_vo';

export interface Inbox {
  id: InboxId;
  ownerId: UserId;
  address: EmailAddress;
  label: Label | null;
  purpose: Purpose | null;
  emailCount: EmailCount;
  unreadCount: UnreadCount;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  isActive: Active;
}

export function isInboxExpired(i: Inbox): boolean {
  if (!i.expiresAt) return false;
  return new Date(i.expiresAt).getTime() < Date.now();
}
