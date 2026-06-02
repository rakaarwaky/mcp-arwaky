// taxonomy/session_domain_event.ts

import type { SessionId, UserId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { EventId } from './event_identity_vo';

export interface SessionCreatedEvent {
  readonly eventId: EventId;
  readonly type: 'session.created';
  readonly occurredAt: Timestamp;
  readonly sessionId: SessionId;
  readonly userId: UserId | null;
}

export interface SessionExpiredEvent {
  readonly eventId: EventId;
  readonly type: 'session.expired';
  readonly occurredAt: Timestamp;
  readonly sessionId: SessionId;
}

export type SessionEvent = SessionCreatedEvent | SessionExpiredEvent;
export const SESSION_EVENT_DOMAIN = "session";
