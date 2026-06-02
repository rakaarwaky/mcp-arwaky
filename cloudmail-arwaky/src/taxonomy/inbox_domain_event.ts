// taxonomy/inbox_domain_event.ts

import type { InboxId, UserId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { EventId } from './event_identity_vo';
import type { EmailAddress } from './email_address_vo';
import type { Purpose } from './text_content_vo';

export interface InboxCreatedEvent {
  readonly eventId: EventId;
  readonly type: 'inbox.created';
  readonly occurredAt: Timestamp;
  readonly inboxId: InboxId;
  readonly ownerId: UserId;
  readonly address: EmailAddress;
  readonly purpose: Purpose | null;
}

export interface InboxExpiredEvent {
  readonly eventId: EventId;
  readonly type: 'inbox.expired';
  readonly occurredAt: Timestamp;
  readonly inboxId: InboxId;
}

export interface InboxDeletedEvent {
  readonly eventId: EventId;
  readonly type: 'inbox.deleted';
  readonly occurredAt: Timestamp;
  readonly inboxId: InboxId;
  readonly ownerId: UserId;
}

export type InboxEvent = InboxCreatedEvent | InboxExpiredEvent | InboxDeletedEvent;
export const INBOX_EVENT_DOMAIN = 'inbox';
