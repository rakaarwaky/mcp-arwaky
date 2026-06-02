// taxonomy/email_audit_entity.ts

import type { EmailId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { Action, Actor, State } from './generic_identity_vo';

export type AuditId = string & { readonly __brand: 'AuditId' };
export function asAuditId(s: string): AuditId { return s as AuditId; }

export interface EmailStatusHistory {
  id: AuditId;
  emailId: EmailId;
  action: Action;
  actor: Actor;
  fromState: State;
  toState: State;
  createdAt: Timestamp;
}

export const EMAIL_AUDIT_DOMAIN = 'email_audit';
