import {
  asEmailId,
  createEmailAddress,
  asSubject,
  asSnippet,
  asBodyText,
  asTimestamp,
  asRawMime,
  asContentType,
  asHeadersJson
} from '../taxonomy';
import type { EmailId, EmailAddress, Subject, Snippet, BodyText, Timestamp, RawMime, ContentType, HeadersJson } from '../taxonomy';
import type { EmailIngestInput } from '../contract/email_ingest_protocol';
import type { AgentEnv } from './di_container_registry';
import { agentLogger } from './logging_singleton_adapter';

// ─── Email Processing Helpers ───

function normalizeMessageId(value: string | null | undefined): string {
  const normalized = String(value || '')
    .replace(/[<>]/g, '')
    .replace(/[^a-zA-Z0-9._:@-]/g, '-')
    .slice(0, 120)
    .trim();
  return normalized || crypto.randomUUID();
}

function getHeader(message: ForwardableEmailMessage, name: string): string {
  const headers = message?.headers;
  if (!headers || typeof headers.get !== 'function') return '';
  return String(headers.get(name) || '').trim();
}

function headersToJson(message: ForwardableEmailMessage): string {
  const headers = message?.headers;
  if (!headers || typeof headers.forEach !== 'function') return '';
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    const k = String(key || '').trim().toLowerCase();
    if (!k) return;
    const next = String(value || '').trim();
    if (!next) return;
    if (out[k]) { out[k] = String(out[k]) + ', ' + next; return; }
    out[k] = next;
  });
  const serialized = JSON.stringify(out);
  return serialized.length > 30000 ? serialized.slice(0, 30000) : serialized;
}

function normalizeAddress(value: string | null | undefined): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const angleMatch = raw.match(/<([^>]+)>/);
  const addr = angleMatch ? angleMatch[1]! : raw;
  const single = (addr.split(',')[0] ?? '').split(';')[0] ?? '';
  return single.replace(/\s+/g, '');
}

async function readRawMime(message: ForwardableEmailMessage): Promise<string> {
  const raw = message?.raw;
  if (!raw) return '';
  try {
    const text = await new Response(raw).text();
    return text.length > 250000 ? text.slice(0, 250000) : text;
  } catch {
    return '';
  }
}

function deriveBodyText(rawMime: string, fallbackText: string): string {
  if (!rawMime) return fallbackText.trim();
  const parts = String(rawMime).split(/\r?\n\r?\n/);
  if (parts.length < 2) return fallbackText.trim();
  const body = parts.slice(1).join('\n\n');
  const cleaned = body.replace(/=\r?\n/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallbackText.trim();
  return cleaned.length > 20000 ? cleaned.slice(0, 20000) : cleaned;
}

function rejectEmail(message: ForwardableEmailMessage, reason: string): boolean {
  if (message && typeof message.setReject === 'function') {
    message.setReject(reason);
    return true;
  }
  return false;
}

function extractLocalPart(address: string): string {
  const atIndex = address.indexOf('@');
  if (atIndex <= 0) return '';
  const localRaw = address.slice(0, atIndex);
  const plusIndex = localRaw.indexOf('+');
  return (plusIndex >= 0 ? localRaw.slice(0, plusIndex) : localRaw).trim();
}

async function resolveRecipient(db: D1Database, recipient: string, authorativeDomain: string): Promise<string> {
  const exact = await db.prepare('SELECT email FROM users WHERE lower(email) = ? LIMIT 1').bind(recipient).first<{ email: string }>();
  if (exact?.email) return String(exact.email).trim().toLowerCase();

  const localPart = extractLocalPart(recipient);
  if (!localPart) return '';

  const localMatches = await db.prepare(
    "SELECT email FROM users WHERE password_hash IS NOT NULL AND lower(substr(email, 1, instr(email, '@') - 1)) = ? ORDER BY created_at DESC, id DESC LIMIT 2"
  ).bind(localPart).all<{ email: string }>();

  const results = localMatches?.results || [];
  if (results.length === 1 && results[0]?.email) {
    return String(results[0].email).trim().toLowerCase();
  }

  if (authorativeDomain) {
    const correctedAddr = localPart + '@' + String(authorativeDomain).trim().toLowerCase();
    const corrected = await db.prepare('SELECT email FROM users WHERE lower(email) = ? LIMIT 1').bind(correctedAddr).first<{ email: string }>();
    if (corrected?.email) {
      agentLogger.info(`[mailflare-email] Resolved via domain-corrected fallback: ${recipient} → ${corrected.email}`);
      return String(corrected.email).trim().toLowerCase();
    }
  }

  return '';
}

// ─── Main Inbound Handler ───

export async function handleInboundEmail(
  message: ForwardableEmailMessage,
  env: AgentEnv,
  ctx: ExecutionContext,
  _workerFetch: (req: Request, env: unknown, ctx: unknown) => Promise<Response>
) {
  const authorativeDomain = String(env.MAILFLARE_USER_DOMAIN || '').trim().toLowerCase();

  const toEnvelope = (() => {
    try {
      const v = message?.to;
      if (!v) return '';
      const parsed = JSON.parse(JSON.stringify(v));
      return typeof parsed === 'string' ? parsed : '';
    } catch {
      return '';
    }
  })();

  const candidateRaw = [
    toEnvelope,
    message?.to,
    getHeader(message, 'delivered-to'),
    getHeader(message, 'x-original-to'),
    getHeader(message, 'x-forwarded-to')
  ];
  const candidates = candidateRaw.map(v => normalizeAddress(v as string)).filter((v, i, arr) => v && arr.indexOf(v) === i);

  if (candidates.length === 0) {
    rejectEmail(message, 'Invalid recipient');
    return;
  }

  const db = env.DB;
  if (!db) {
    rejectEmail(message, 'Recipient verification unavailable');
    return;
  }

  let resolvedRecipient = '';
  let resolvedFrom = '';
  for (const candidate of candidates) {
    const resolved = await resolveRecipient(db, candidate, authorativeDomain).catch(() => '');
    if (resolved) {
      resolvedRecipient = resolved;
      resolvedFrom = candidate;
      break;
    }
  }

  const recipient = resolvedFrom || candidates[0];

  if (!resolvedRecipient) {
    rejectEmail(message, 'Unknown recipient');
    agentLogger.info(`[mailflare-email] Dropped inbound email for unknown recipient: ${recipient}`);
    return;
  }

  const sender = String(message?.from || '').trim();
  const recipientOriginal = String(message?.to || '').trim();
  const subject = getHeader(message, 'subject') || '(No Subject)';
  const contentTypeRaw = getHeader(message, 'content-type');
  const headersJsonRaw = headersToJson(message);
  const headerMessageId = getHeader(message, 'message-id');
  const receivedAtRaw = new Date().toISOString();
  const emailIdRaw = normalizeMessageId(headerMessageId);
  const snippetRaw = `Inbound email from ${sender} to ${recipientOriginal} at ${receivedAtRaw}`;
  const rawMimeRaw = await readRawMime(message);
  const bodyTextRaw = deriveBodyText(rawMimeRaw, snippetRaw);

  try {
    const { createContainer } = await import('./di_container_registry');
    const container = createContainer(env);
    const { NotificationDispatchRouter } = await import('./notification_dispatch_router');
    const notificationRouter = new NotificationDispatchRouter(container);

    const data: EmailIngestInput = {
      emailId: asEmailId(emailIdRaw),
      sender: createEmailAddress(sender),
      recipient: createEmailAddress(resolvedRecipient),
      subject: asSubject(subject),
      snippet: asSnippet(snippetRaw),
      bodyText: asBodyText(bodyTextRaw),
      receivedAt: asTimestamp(receivedAtRaw),
      rawMime: asRawMime(rawMimeRaw),
      contentType: asContentType(contentTypeRaw),
      headersJson: asHeadersJson(headersJsonRaw),
    };

    const waitUntil = (ctx && typeof ctx.waitUntil === 'function')
      ? (p: Promise<unknown>) => ctx.waitUntil(p)
      : undefined;

    await notificationRouter.handleEmailNotification(data, waitUntil);
    agentLogger.info(`[mailflare-email] Successfully ingested email: ${emailIdRaw}`);
  } catch (err) {
    agentLogger.error(`[mailflare-email] Failed to ingest email ${emailIdRaw}: ${err}`);
  }
}