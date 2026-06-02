// taxonomy/email_action_vo.ts
// Email action types for agent operations

import type { ActionUpdated } from './operation_status_vo';
import type { Reason } from './health_status_vo';
import type { Email } from './email_mail_entity';

/**
 * Supported email actions that agents can perform.
 * These map to capability methods in inbox_manage_actions.
 */
export type EmailAction = 'forward' | 'reply' | 'archive' | 'delete' | 'mark_read' | 'mark_unread' | 'star' | 'unstar' | 'parse_verification' | 'extract_api_key';

/**
 * Alias for EmailAction used in protocol definitions.
 * Maintains backward compatibility with existing contract interfaces.
 */
export type EmailQuickAction = EmailAction;

/** @constant Action: forward email */
export const EMAIL_ACTION_FORWARD = 'forward' as EmailAction;
/** @constant Action: reply to email */
export const EMAIL_ACTION_REPLY = 'reply' as EmailAction;
/** @constant Action: archive email */
export const EMAIL_ACTION_ARCHIVE = 'archive' as EmailAction;
/** @constant Action: delete email */
export const EMAIL_ACTION_DELETE = 'delete' as EmailAction;
/** @constant Action: mark email as read */
export const EMAIL_ACTION_MARK_READ = 'mark_read' as EmailAction;
/** @constant Action: mark email as unread */
export const EMAIL_ACTION_MARK_UNREAD = 'mark_unread' as EmailAction;
/** @constant Action: star email */
export const EMAIL_ACTION_STAR = 'star' as EmailAction;
/** @constant Action: unstar email */
export const EMAIL_ACTION_UNSTAR = 'unstar' as EmailAction;
/** @constant Action: poll for updates */
export const EMAIL_ACTION_PARSE_VERIFICATION = 'parse_verification' as EmailAction;
export const EMAIL_ACTION_EXTRACT_API_KEY = 'extract_api_key' as EmailAction;

/**
 * Validates an EmailAction string.
 * Used when converting raw action strings from API requests.
 *
 * @param s - Action string to validate
 * @returns Branded EmailAction
 * @throws Error if action is not in the allowed set
 */
export function asEmailAction(s: string): EmailAction {
  const valid: EmailAction[] = [
    'forward', 'reply', 'archive', 'delete', 'mark_read', 'mark_unread',
    'star', 'unstar', 'parse_verification', 'extract_api_key'
  ];
  if (!valid.includes(s as EmailAction)) {
    throw new Error(`Invalid email action: ${s}`);
  }
  return s as EmailAction;
}

/**
 * Result of applying an email quick action.
 * Returned by applyEmailAction() methods.
 *
 * @property updated - Whether the action was applied successfully
 * @property email - Updated email object (if action succeeded and email was fetched)
 * @property reason - Failure reason (if action failed)
 */
export interface EmailActionResult {
  readonly updated: ActionUpdated;
  readonly email?: Email | null;
  readonly reason?: Reason;
}
