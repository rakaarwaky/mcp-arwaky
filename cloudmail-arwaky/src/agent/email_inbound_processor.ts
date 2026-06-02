/// <reference types="@cloudflare/workers-types" />
// agent/email_inbound_processor.ts
// Inbound email processing logic for MailFlare Worker
// Extracted (AES file-size compliance: original was 349 lines)

import PostalMime from 'postal-mime';
import { createEmailAddress, asLogMessage } from '../taxonomy';
import type { EmailId, Subject, Snippet, BodyText, Timestamp, RawMime, ContentType, HeadersJson } from '../taxonomy';
import type { EmailIngestInput } from '../contract/email_ingest_io';
import { structuredLogger } from '../infrastructure/structured_logger_util';
import { createContainer } from './di_container_registry';
import type { AgentEnv } from './di_container_registry';

function normalizeMessageId(value: string | null | undefined): string {
  const normalized = String(value || '')
    .replace(/[<>]/g, '')
    .replace(/[^a-zA-Z0-9._:@+-]/g, '-')
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
  headers.forEach((value: string, key: string) => {
    const k = String(key || '').trim().toLowerCase();
    if (!k) return;
    const next = String(value || '').trim();
    if (!next) return;
    if (out[k]) { out[k] = out[k] + ', ' + next; return; }
    out[k] = next;
  });
  const serialized = JSON.stringify(out);
  return serialized.length > 30000 ? serialized.slice(0, 30000) : serialized;
}


function normalizeAddress(value: string | undefined): string {
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
  
  // Find double newline that separates headers from body
  const headerEnd = rawMime.indexOf('\r\n\r\n');
  const headerEndAlt = rawMime.indexOf('\n\n');
  const splitIndex = headerEnd !== -1 ? headerEnd + 4 : (headerEndAlt !== -1 ? headerEndAlt + 2 : -1);
  
  if (splitIndex === -1) return fallbackText.trim();
  const body = rawMime.slice(splitIndex);

  // Naive cleanup: remove HTML tags and multiple spaces
  const cleaned = body
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/=\r?\n/g, '') // Quoted-printable joiner
    .replace(/\s+/g, ' ')
    .trim();
    
  if (!cleaned || cleaned.length < 5) return fallbackText.trim();
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
      structuredLogger.info(asLogMessage('Email: resolved via domain-corrected fallback'), { recipient, resolved: corrected.email });
      return String(corrected.email).trim().toLowerCase();
    }
  }

  return '';
}

export async function handleInboundEmail(message: ForwardableEmailMessage, env: AgentEnv, _ctx: ExecutionContext, _workerFetch: any) {
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
    structuredLogger.info(asLogMessage('Email: dropped inbound email for unknown recipient'), { recipient });
    return;
  }


  const sender = String(message?.from || '').trim();
  const recipientOriginal = String(message?.to || '').trim();
  const rawMimeStr = await readRawMime(message);

  // --- Advanced Parsing with PostalMime ---
  const parser = new (PostalMime as any)();
  const parsed = await parser.parse(rawMimeStr);

  const subject = (parsed.subject || getHeader(message, 'subject') || '(No Subject)') as Subject;
  const contentType = getHeader(message, 'content-type') as ContentType;
  const headersJson = headersToJson(message) as HeadersJson;
  const receivedAt = new Date().toISOString() as Timestamp;
  const emailId = normalizeMessageId(parsed.messageId || getHeader(message, 'message-id')) as EmailId;
  const bodyText = (parsed.text || parsed.html || deriveBodyText(rawMimeStr, '')) as BodyText;
  const snippet = (bodyText.slice(0, 200) || `Email from ${sender}`) as Snippet;

  // --- Persist email to database ---
  try {
    const container = createContainer(env);
    const ingestInput: EmailIngestInput = {
      emailId,
      sender: createEmailAddress(sender || 'unknown@localhost'),
      recipient: createEmailAddress(resolvedRecipient),
      subject,
      snippet,
      bodyText,
      receivedAt,
      rawMime: rawMimeStr as RawMime,
      contentType,
      headersJson,
      parsedFromName: parsed.from?.name,
      parsedFromEmail: parsed.from?.address,
      parsedTo: parsed.to?.map((t: any) => `${t.name} <${t.address}>`).join(', '),
      parsedCc: parsed.cc?.map((t: any) => `${t.name} <${t.address}>`).join(', '),
      parsedHasAttachments: (parsed.attachments?.length ?? 0) > 0,
      parsedAttachmentCount: parsed.attachments?.length ?? 0,
      parsedAttachments: JSON.stringify(parsed.attachments?.map((a: any) => ({
        filename: a.filename,
        mimeType: a.mimeType,
        size: a.content?.byteLength ?? 0
      }))),
      parsedSpamScore: 0, // Placeholder
      parsedAuthResults: getHeader(message, 'authentication-results')
    };
    const result = await container.emailIngest.ingestEmail(ingestInput);
    structuredLogger.info(asLogMessage('Email: ingest result'), { stored: result.stored, reason: result.reason, emailId, resolvedRecipient });
  } catch (err) {
    structuredLogger.error(asLogMessage('Email: ingest error'), { error: String(err) });
  }
}

// ============================================================================
// SCHEDULED (CRON) PROCESSING
// ============================================================================

