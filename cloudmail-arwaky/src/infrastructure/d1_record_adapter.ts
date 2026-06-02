// infrastructure/d1_record_adapter.ts
// Centralized mapping logic for D1 Database results to Taxonomy entities
// AEC-aligned: 3 words, 2 underscores, adapter suffix

import type {
  User, Email, Account, EmailRecipient, EmailAttachment, 
  EmailStatus, EmailId, InboxId, MessageId,
  UserId, SessionId, AccountId,
  DisplayName, Subject, Snippet, BodyText, BodyHtml, RawMime,
  Timestamp, CryptoHash, UserAgent, ClientIp, ServiceProvider,
  AccountStatus, Url, ErrorMessage, IsStarred, HasAttachments,
  AttachmentCount, AttachmentSize, AttachmentFilename,
  SpamScore, AuthResults, InReplyTo, Session, ApiKeyId, ContentType, UserRole
} from '../taxonomy';
import { createEmailAddress, asUserId, asDisplayName, asTimestamp, asCryptoHash, asEmailId, asInboxId, asMessageId, asSubject, asSnippet, asBodyText, asBodyHtml, asRawMime, asAttachmentCount, asInReplyTo, asSpamScore, asAuthResults, asSessionId, asUserRole, asAccountId, asServiceProvider, asRawText, asPassword, asAuthToken, asUrl, asErrorMessage, asUserAgent, asClientIp, asAttachmentFilename, asContentType, asAttachmentSize, asApiKeyId } from '../taxonomy';

export type RawRow = Record<string, unknown>;

interface RawRecipient {
  name?: DisplayName;
  email?: string; // Kept as string for factory input
  address?: string;
}

interface RawAttachment {
  filename?: AttachmentFilename;
  contentType?: ContentType;
  content_type?: ContentType;
  size?: number; // Kept as number for factory input
}

export class D1RecordAdapter {
  static mapUser(row: RawRow): User {
    const isOwner = Number(row.is_owner ?? 0) === 1;
    return {
      id: asUserId(String(row.id)),
      email: createEmailAddress(String(row.email)),
      displayName: row.display_name ? asDisplayName(String(row.display_name)) : null,
      role: asUserRole(String(row.role ?? 'user')),
      isOwner,
      passwordHash: row.password_hash ? asCryptoHash(String(row.password_hash)) : null,
      createdAt: asTimestamp(String(row.created_at ?? '')),
      updatedAt: asTimestamp(String(row.updated_at ?? ''))
    };
  }

  static mapEmail(row: RawRow): Email {
    const isRead = row.status === 'read';
    const isArchived = row.status === 'archived';
    const isDeleted = row.deleted_at != null;
    const isStarred = Number(row.is_starred ?? 0) === 1;

    let status: EmailStatus = 'unread';
    if (isDeleted) status = 'deleted';
    else if (isArchived) status = 'archived';
    else if (isRead) status = 'read';

    const fromName = row.parsed_from_name ? String(row.parsed_from_name) : '';
    const fromEmail = String(row.parsed_from_email ?? row.from_email ?? 'system@internal.node');
    const from: EmailRecipient = {
      name: fromName ? asDisplayName(fromName) : null,
      email: createEmailAddress(fromEmail)
    };

    const to = this.parseRecipients(String(row.parsed_to ?? row.to_json ?? ''));
    const cc = this.parseRecipients(String(row.parsed_cc ?? ''));
    const attachments = this.parseAttachments(String(row.parsed_attachments ?? ''));
    const references = this.parseReferences(String(row.parsed_references ?? ''));

    return {
      id: asEmailId(String(row.id)),
      inboxId: asInboxId(String(row.inbox_id)),
      messageId: row.message_id ? asMessageId(String(row.message_id)) : null,
      from,
      to,
      cc,
      subject: row.subject ? asSubject(String(row.subject)) : null,
      snippet: row.snippet ? asSnippet(String(row.snippet)) : null,
      receivedAt: asTimestamp(String(row.received_at ?? '')),
      status,
      isRead: isRead || isArchived,
      isStarred: isStarred as IsStarred,
      bodyText: row.body_text ? asBodyText(String(row.body_text)) : null,
      bodyHtml: row.body_html ? asBodyHtml(String(row.body_html)) : null,
      rawMime: asRawMime(String(row.raw_mime ?? '')),
      hasAttachments: (Number(row.parsed_has_attachments ?? 0) === 1) as HasAttachments,
      attachmentCount: asAttachmentCount(Number(row.parsed_attachment_count ?? 0)),
      attachments,
      inReplyTo: row.parsed_in_reply_to ? asInReplyTo(String(row.parsed_in_reply_to)) : null,
      references,
      spamScore: row.parsed_spam_score ? asSpamScore(String(row.parsed_spam_score)) : null,
      authResults: row.parsed_auth_results ? asAuthResults(String(row.parsed_auth_results)) : null
    };
  }

  static mapAccount(row: RawRow): Account {
    return {
      id: asAccountId(String(row.id)),
      inboxId: asInboxId(String(row.inbox_id)),
      provider: asServiceProvider(String(row.provider ?? 'openrouter')),
      status: String(row.status ?? 'pending') as AccountStatus,
      targetEmail: createEmailAddress(String(row.target_email)),
      password: row.password ? asRawText(String(row.password)) : null,
      verificationLink: row.verification_link ? asUrl(String(row.verification_link)) : null,
      apiKey: row.api_key ? asRawText(String(row.api_key)) : null,
      apiKeyId: row.api_key_id ? asApiKeyId(String(row.api_key_id)) : null,
      errorMessage: row.error_message ? asErrorMessage(String(row.error_message)) : null,
      createdAt: asTimestamp(String(row.created_at ?? '')),
      completedAt: row.completed_at ? asTimestamp(String(row.completed_at)) : null,
      expiresAt: asTimestamp(String(row.expires_at ?? ''))
    };
  }

  static mapSession(row: RawRow): Session {
    return {
      id: asSessionId(String(row.id)),
      type: 'login' as const,
      tokenHash: asCryptoHash(String(row.token_hash)),
      userId: asUserId(String(row.user_id)),
      createdAt: asTimestamp(String(row.created_at ?? '')),
      expiresAt: asTimestamp(String(row.expires_at ?? '')),
      revokedAt: row.revoked_at ? asTimestamp(String(row.revoked_at)) : null,
      userAgent: asUserAgent(String(row.user_agent ?? '')),
      clientIp: asClientIp(String(row.client_ip ?? ''))
    };
  }

  public static parseRecipients(raw: string): EmailRecipient[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((r: RawRecipient) => r && (r.email || r.address))
        .map((r: RawRecipient) => ({
          name: r.name ? asDisplayName(String(r.name)) : null,
          email: createEmailAddress(r.email ?? r.address ?? '')
        }));
    } catch {
      return [{ name: null, email: createEmailAddress(raw) }];
    }
  }

  public static parseAttachments(raw: string): EmailAttachment[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((a: RawAttachment) => ({
        filename: asAttachmentFilename(String(a.filename ?? 'unnamed')),
        contentType: asContentType(String(a.contentType ?? a.content_type ?? 'application/octet-stream')),
        size: asAttachmentSize(Number(a.size ?? 0))
      }));
    } catch { return []; }
  }

  public static parseReferences(raw: string): MessageId[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((r) => asMessageId(String(r)));
    } catch { }
    return raw.split(/\s+/).filter(Boolean).map((r) => asMessageId(r));
  }
}

