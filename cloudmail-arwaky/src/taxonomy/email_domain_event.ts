// taxonomy/email_domain_event.ts

import type { EmailId, InboxId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { EventId } from './event_identity_vo';
import type { EmailAddress } from './email_address_vo';
import type { EmailStatus } from './email_status_vo';
import type { Subject } from './text_content_vo';

export interface EmailReceivedEvent {
  readonly eventId: EventId;
  readonly type: 'email.received';
  readonly occurredAt: Timestamp;
  readonly emailId: EmailId;
  readonly inboxId: InboxId;
  readonly from: EmailAddress;
  readonly subject: Subject | null;
}

export interface EmailStatusChangedEvent {
  readonly eventId: EventId;
  readonly type: 'email.status_changed';
  readonly occurredAt: Timestamp;
  readonly emailId: EmailId;
  readonly oldStatus: EmailStatus;
  readonly newStatus: EmailStatus;
}

export type EmailEvent = EmailReceivedEvent | EmailStatusChangedEvent;
export const EMAIL_EVENT_DOMAIN = 'email';
