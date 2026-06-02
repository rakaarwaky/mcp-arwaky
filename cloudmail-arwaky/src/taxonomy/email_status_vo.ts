// taxonomy/email_status_vo.ts
// Email status lifecycle value object

/**
 * Represents the lifecycle status of an email.
 * Values: 'unread' | 'read' | 'archived' | 'deleted'
 *
 * State transitions:
 *   unread → read → archived → deleted
 *   unread → deleted (direct)
 */
export type EmailStatus = 'unread' | 'read' | 'archived' | 'deleted';

/** @constant Email status: unread */
export const EMAIL_STATUS_UNREAD = 'unread' as EmailStatus;
/** @constant Email status: read */
export const EMAIL_STATUS_READ = 'read' as EmailStatus;
/** @constant Email status: archived */
export const EMAIL_STATUS_ARCHIVED = 'archived' as EmailStatus;
/** @constant Email status: deleted */
export const EMAIL_STATUS_DELETED = 'deleted' as EmailStatus;

/**
 * Validates and creates a branded EmailStatus.
 * Throws if the string is not a valid EmailStatus.
 *
 * @param s - String to validate ('unread' | 'read' | 'archived' | 'deleted')
 * @returns Branded EmailStatus
 * @throws Error if invalid status
 */
export function asEmailStatus(s: string): EmailStatus {
  const valid: EmailStatus[] = ['unread', 'read', 'archived', 'deleted'];
  if (!valid.includes(s as EmailStatus)) {
    throw new Error(`Invalid email status: ${s}. Must be one of ${valid.join(', ')}`);
  }
  return s as EmailStatus;
}
