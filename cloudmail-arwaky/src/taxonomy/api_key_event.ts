// taxonomy/api_key_event.ts

import type { ApiKeyId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { EventId } from './event_identity_vo';
import type { Name } from './generic_identity_vo';

export interface ApiKeyCreatedEvent {
  readonly eventId: EventId;
  readonly type: 'api_key.created';
  readonly occurredAt: Timestamp;
  readonly apiKeyId: ApiKeyId;
  readonly name: Name | null;
}

export interface ApiKeyRevokedEvent {
  readonly eventId: EventId;
  readonly type: 'api_key.revoked';
  readonly occurredAt: Timestamp;
  readonly apiKeyId: ApiKeyId;
}

export type ApiKeyEvent = ApiKeyCreatedEvent | ApiKeyRevokedEvent;
export const API_KEY_EVENT_DOMAIN = 'api_key';
