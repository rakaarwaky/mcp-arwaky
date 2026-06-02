/**
 * @module taxonomy/event_identity_vo
 * @description Value Object for unique event identifiers.
 * Uses branded types and provides a standard factory using Web Crypto API.
 */

export type EventId = string & { readonly __brand: 'EventId' };
export function newEventId(): EventId { return crypto.randomUUID() as EventId; }
export function asEventId(s: string): EventId { return s as EventId; }

export const EVENT_IDENTITY_DOMAIN = 'event_identity';
