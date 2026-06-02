// taxonomy/email_wait_vo.ts
// Value objects for email polling/wait operations (PRD: wait endpoint)

import type { TimeoutSeconds } from './time_duration_vo';
import type { EmailId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { Reason } from './health_status_vo';

/**
 * Status of a wait/poll operation for an email matching criteria.
 * - 'pending': Wait operation in progress (timeout not yet reached)
 * - 'matched': Email matching criteria was found
 * - 'timeout': No matching email found within timeout period
 * - 'cancelled': Wait operation was cancelled (e.g., inbox deleted)
 */
export type PollStatus = 'pending' | 'matched' | 'timeout' | 'cancelled';

/**
 * Result of a waitForEmail operation.
 * Returned by the GET /api/inboxes/:id/wait endpoint.
 *
 * @property emailId - ID of matched email, or null if no match
 * @property status - Final poll status
 * @property matchedAt - Timestamp when email was matched (null if not matched)
 * @property reason - Optional human-readable reason for failure
 */
export interface WaitResult {
  readonly emailId: EmailId | null;
  readonly status: PollStatus;
  readonly matchedAt: Timestamp | null;
  readonly reason?: Reason;
}

/**
 * Checks if wait result indicates successful email match.
 *
 * @param result - WaitResult to evaluate
 * @returns true if status is 'matched' and emailId is not null
 */
export function isWaitSuccess(result: WaitResult): boolean {
  return result.status === 'matched' && result.emailId !== null;
}

/**
 * Checks if wait result indicates a timeout.
 *
 * @param result - WaitResult to evaluate
 * @returns true if status is 'timeout'
 */
export function isWaitTimeout(result: WaitResult): boolean {
  return result.status === 'timeout';
}

export const EMAIL_WAIT_DOMAIN = 'email_wait';
