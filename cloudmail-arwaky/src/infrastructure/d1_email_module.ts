import type { 
  Email, EmailId, UserId, Stored, Reason, 
  ArchivedCount, EmailQuickAction, Actor, EmailActionResult, 
  MaxAgeHours, CleanupCount, RawText, ActionUpdated, EmailAddress, Subject,
  Snippet, BodyText, RawMime, HeadersJson, Timestamp
} from '../taxonomy';
import { 
  asEmailId, asArchivedCount, asCleanupCount, asReason, asIsStarred,
  NOT_STORED, STORED, ACTION_UPDATED, ACTION_NOT_UPDATED
} from '../taxonomy';
import type { IDatabaseQueryPort, UpsertEmailInput } from '../contract';
import { D1RecordAdapter } from './d1_record_adapter';

const EMAIL_COLS = [
  'id', 'inbox_id', 'message_id', 'from_email', 'to_json',
  'parsed_from_name', 'parsed_from_email', 'parsed_to', 'parsed_cc',
  'subject', 'snippet', 'received_at',
  'is_starred', 'status', 'deleted_at',
  'body_text', 'body_html', 'raw_mime',
  'parsed_has_attachments', 'parsed_attachment_count', 'parsed_attachments',
  'parsed_in_reply_to', 'parsed_references',
  'parsed_spam_score', 'parsed_auth_results'
].join(', ');

export class D1EmailModule {
  constructor(private db: D1Database, private adapter: IDatabaseQueryPort) { }

  async getUserInboxEmails(userId: UserId): Promise<Email[]> {
    const { results } = await this.db.prepare(`
      SELECT ${EMAIL_COLS}
      FROM emails WHERE inbox_id = ? AND deleted_at IS NULL
      ORDER BY received_at DESC LIMIT 100
    `).bind(userId).all<Record<string, unknown>>();
    return (results ?? []).map((row) => D1RecordAdapter.mapEmail(row));
  }

  async findEmail(userId: UserId, filters?: { from?: EmailAddress; subject?: Subject }): Promise<Email | null> {
    const conditions = ['inbox_id = ?', 'deleted_at IS NULL'];
    const params: unknown[] = [userId];
    if (filters?.from) {
      conditions.push("lower(from_email) = lower(?)");
      params.push(filters.from.full);
    }
    if (filters?.subject) {
      conditions.push("subject = ?");
      params.push(filters.subject);
    }
    const where = conditions.join(' AND ');
    const row = await this.db.prepare(`SELECT ${EMAIL_COLS} FROM emails WHERE ${where} ORDER BY received_at DESC LIMIT 1`)
      .bind(...params).first<Record<string, unknown>>();
    return row ? D1RecordAdapter.mapEmail(row) : null;
  }

  async getUserArchivedCount(userId: UserId): Promise<ArchivedCount> {
    const row = await this.db.prepare(
      "SELECT COUNT(*) AS count FROM emails WHERE inbox_id = ? AND deleted_at IS NULL AND status = 'archived'"
    ).bind(userId).first<Record<string, number>>();
    return asArchivedCount(Number(row?.count ?? 0));
  }

  // --- Admin: fetch all emails across all inboxes ---
  async getAllEmails(): Promise<Email[]> {
    const { results } = await this.db.prepare(`
      SELECT ${EMAIL_COLS}
      FROM emails WHERE deleted_at IS NULL
      ORDER BY received_at DESC LIMIT 100
    `).all<Record<string, unknown>>();
    return (results ?? []).map((row) => D1RecordAdapter.mapEmail(row));
  }

  async getAllArchivedCount(): Promise<ArchivedCount> {
    const row = await this.db.prepare(
      "SELECT COUNT(*) AS count FROM emails WHERE deleted_at IS NULL AND status = 'archived'"
    ).first<Record<string, number>>();
    return asArchivedCount(Number(row?.count ?? 0));
  }

  async getEmailById(userId: UserId, emailId: EmailId): Promise<Email | null> {
    const row = await this.db.prepare(`
      SELECT ${EMAIL_COLS}
      FROM emails WHERE lower(id) = lower(?) AND inbox_id = ? AND deleted_at IS NULL LIMIT 1
    `).bind(emailId, userId).first<Record<string, unknown>>();
    return row ? D1RecordAdapter.mapEmail(row) : null;
  }

  async getEmailGlobal(emailId: EmailId): Promise<Email | null> {
    const row = await this.db.prepare(`
      SELECT ${EMAIL_COLS}
      FROM emails WHERE lower(id) = lower(?) LIMIT 1
    `).bind(emailId).first<Record<string, unknown>>();
    return row ? D1RecordAdapter.mapEmail(row) : null;
  }

  async upsertEmail(input: UpsertEmailInput): Promise<{ stored: Stored; reason?: Reason }> {
    const emailId = String(input.emailId).trim() as EmailId;
    const sender = input.sender.full;
    const recipient = input.recipient.full.trim().toLowerCase();
    if (!emailId || !sender || !recipient) return { stored: NOT_STORED, reason: asReason('invalid_input') };

    const userRow = await this.db.prepare('SELECT id FROM users WHERE lower(email) = ? LIMIT 1')
      .bind(recipient).first<Record<string, unknown>>();
    const userId = String(userRow?.id ?? '').trim() as UserId;
    if (!userId) return { stored: NOT_STORED, reason: asReason('recipient_not_found') };

    const subject = (input.subject?.trim() || '(No Subject)').slice(0, 998) as Subject;
    const snippet = (input.snippet?.trim() || `Inbound email from ${sender} to ${recipient}`).slice(0, 2000) as Snippet;
    const bodyText = (input.bodyText?.trim() || snippet).slice(0, 20000) as BodyText;
    const rawMime = (input.rawMime?.trim() || '').slice(0, 500000) as RawMime;
    const headersJson = (input.headersJson?.trim() || '').slice(0, 30000) as HeadersJson;
    const receivedAt = (input.receivedAt?.trim() || new Date().toISOString()) as Timestamp;
    const rawSize = rawMime.length;
    const toJson = JSON.stringify([{ email: recipient }]);

    await this.db.prepare(`
      INSERT INTO emails (id, inbox_id, message_id, from_email, to_json, subject, snippet, received_at,
        is_starred, status, raw_size, body_text, raw_mime, headers_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'unread', ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        inbox_id = excluded.inbox_id, from_email = excluded.from_email, to_json = excluded.to_json,
        subject = excluded.subject, snippet = excluded.snippet, body_text = excluded.body_text,
        raw_size = excluded.raw_size, raw_mime = excluded.raw_mime, headers_json = excluded.headers_json
    `).bind(emailId, userId, emailId, sender, toJson, subject, snippet, receivedAt,
      rawSize, bodyText, rawMime, headersJson).run();

    return { stored: STORED };
  }

  async applyEmailQuickAction(userId: UserId, emailId: EmailId, action: EmailQuickAction, actor: Actor): Promise<EmailActionResult> {
    const email = await this.getEmailById(userId, emailId);
    if (!email) {
      console.log('not_found', userId, emailId);
      return { updated: ACTION_NOT_UPDATED, reason: asReason('not_found') };
    }

    const fromState = this.buildEmailState(email);
    let updated: Email | null = email;

    if (action === 'star') {
      const newStarred = email.isStarred ? 0 : 1;
      await this.db.prepare('UPDATE emails SET is_starred = ? WHERE id = ? AND inbox_id = ?')
        .bind(newStarred, emailId, userId).run();
      updated = { ...email, isStarred: asIsStarred(newStarred === 1) };
    } else if (action === 'archive') {
      if (email.status === 'archived') {
        return { updated: ACTION_NOT_UPDATED, reason: asReason('already_archived'), email };
      }
      await this.db.prepare("UPDATE emails SET status = 'archived' WHERE id = ? AND inbox_id = ?")
        .bind(emailId, userId).run();
      updated = { ...email, status: 'archived' as any };
    } else if (action === 'mark_read') {
      if (email.status === 'read') {
        return { updated: ACTION_NOT_UPDATED, reason: asReason('already_read'), email };
      }
      await this.db.prepare("UPDATE emails SET status = 'read' WHERE id = ? AND inbox_id = ?")
        .bind(emailId, userId).run();
      updated = { ...email, status: 'read' as any, isRead: true };
    } else if (action === 'delete') {
      await this.db.prepare("DELETE FROM emails WHERE id = ? AND inbox_id = ?")
        .bind(emailId, userId).run();
      await this.db.prepare("DELETE FROM email_status_history WHERE email_id = ?")
        .bind(emailId).run().catch(() => { });
      return { updated: ACTION_UPDATED, email: null };
    } else {
      console.log('unknown_action', action);
      return { updated: ACTION_NOT_UPDATED, reason: asReason('unknown_action') };
    }

    if (updated) {
      await this.writeStatusHistory(emailId, action, actor, fromState, updated);
    }
    return { updated: ACTION_UPDATED, email: updated };
  }

  async cleanupExpiredEmails(maxAgeHours: MaxAgeHours): Promise<CleanupCount> {
    const result = await this.db.prepare(`
      UPDATE emails SET deleted_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL AND received_at <= datetime('now', '-' || ? || ' hours')
    `).bind(maxAgeHours).run();
    return asCleanupCount(result.meta?.changes ?? 0);
  }

  private buildEmailState(email: Email): RawText {
    const isRead = email.isRead ? 1 : 0;
    const isStarred = email.isStarred ? 1 : 0;
    const isArchived = email.status === 'archived' ? 1 : 0;
    const isDeleted = email.status === 'deleted' ? 1 : 0;
    return `read=${isRead},starred=${isStarred},archived=${isArchived},deleted=${isDeleted}` as RawText;
  }

  private async writeStatusHistory(emailId: EmailId, action: EmailQuickAction, actor: Actor, fromState: RawText, updatedEmail: Email): Promise<void> {
    const toState = this.buildEmailState(updatedEmail);
    try {
      await this.db.prepare(`
        INSERT INTO email_status_history (id, email_id, action, actor, from_state, to_state, created_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(crypto.randomUUID(), emailId, action, actor, fromState, toState).run();
    } catch { }
  }

  parseRecipients(raw: string) { return D1RecordAdapter.parseRecipients(raw); }
  parseAttachments(raw: string) { return D1RecordAdapter.parseAttachments(raw); }
  parseReferences(raw: string) { return D1RecordAdapter.parseReferences(raw); }
}
