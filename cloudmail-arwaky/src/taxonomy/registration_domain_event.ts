// taxonomy/registration_domain_event.ts

import type { AccountId, ApiKeyId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { EventId } from './event_identity_vo';
import type { AccountStatus, ServiceProvider } from './account_service_entity';

export interface RegistrationStatusChangedEvent {
  readonly eventId: EventId;
  readonly type: 'registration.status_changed';
  readonly occurredAt: Timestamp;
  readonly accountId: AccountId;
  readonly provider: ServiceProvider;
  readonly oldStatus: AccountStatus;
  readonly newStatus: AccountStatus;
}

export interface RegistrationCompletedEvent {
  readonly eventId: EventId;
  readonly type: 'registration.completed';
  readonly occurredAt: Timestamp;
  readonly accountId: AccountId;
  readonly provider: ServiceProvider;
  readonly apiKeyId: ApiKeyId;
}

export type RegistrationEvent = RegistrationStatusChangedEvent | RegistrationCompletedEvent;
export const REGISTRATION_EVENT_DOMAIN = "registration";
