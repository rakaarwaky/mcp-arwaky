/**
 * @module contract/email_ingest_io
 * @description IO contract for email ingestion from Cloudflare Email Routing.
 * Defines the shape of incoming raw email data and the acknowledgment output.
 */

import type { EmailId, EmailAddress, Subject, Snippet, BodyText, Timestamp, RawMime, ContentType, HeadersJson, Stored, Reason } from '../taxonomy';

export interface EmailIngestInput { parsedFromName?: string; parsedFromEmail?: string; parsedTo?: string; parsedCc?: string; parsedHasAttachments?: boolean; parsedAttachmentCount?: number; parsedAttachments?: string; parsedSpamScore?: number; parsedAuthResults?: string; emailId: EmailId; sender: EmailAddress; recipient: EmailAddress; subject?: Subject; snippet?: Snippet; bodyText?: BodyText; receivedAt?: Timestamp; rawMime?: RawMime; contentType?: ContentType; headersJson?: HeadersJson; }
export interface EmailIngestOutput { stored: Stored; reason?: Reason; }
