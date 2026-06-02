// taxonomy/email_mail_entity.ts

import type { EmailId, InboxId } from './id_identity_vo';
import type { Timestamp } from './timestamp_epoch_vo';
import type { EmailAddress } from './email_address_vo';
import type { Subject, Snippet, BodyText, BodyHtml, RawMime } from './text_content_vo';
import type { MessageId, InReplyTo, SpamScore, AuthResults } from './email_metadata_vo';
import type { AttachmentFilename, ContentType } from './generic_identity_vo';
import type { AttachmentCount } from './counter_value_vo';
import type { AttachmentSize } from './data_size_vo';
import type { IsStarred, HasAttachments } from './flag_state_vo';

import type { DisplayName } from './text_content_vo';
import type { EmailStatus } from './email_status_vo';

/**
 * Search criteria for filtering emails (from sender).
 * Merged from email_search_vo.ts
 */
export type SearchFrom = string & { readonly __brand: 'SearchFrom' };

export function asSearchFrom(s: string): SearchFrom { return s as SearchFrom; }

export interface EmailRecipient { name: DisplayName | null; email: EmailAddress; }
export interface EmailAttachment { filename: AttachmentFilename; contentType: ContentType; size: AttachmentSize; }

// EmailStatus is imported from email_status_vo.ts

export interface Email {
  id: EmailId;
  inboxId: InboxId;
  messageId: MessageId | null;
  from: EmailRecipient;
  to: EmailRecipient[];
  cc: EmailRecipient[];
  subject: Subject | null;
  snippet: Snippet | null;
  receivedAt: Timestamp;
  status: EmailStatus;
  isRead: boolean;
  isStarred: IsStarred;
  bodyText: BodyText | null;
  bodyHtml: BodyHtml | null;
  rawMime: RawMime;
  hasAttachments: HasAttachments;
  attachmentCount: AttachmentCount;
  attachments: EmailAttachment[];
  inReplyTo: InReplyTo | null;
  references: MessageId[];
  spamScore: SpamScore | null;
  authResults: AuthResults | null;
}

export function isUnread(e: Email): boolean { return e.status === 'unread'; }

export const EMAIL_MAIL_DOMAIN = 'email_mail';
