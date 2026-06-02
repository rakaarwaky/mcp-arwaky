/**
 * @module contract/email_ingest_protocol
 * @description Protocol interface for email ingestion capability.
 * Defines the contract that EmailIngestActions must implement.
 * Consumed by: Cloudflare Email Routing → Worker email() handler.
 */

import type { EmailIngestInput, EmailIngestOutput } from './email_ingest_io';

export type { EmailIngestInput, EmailIngestOutput } from './email_ingest_io';
export interface IEmailIngestProtocol { ingestEmail(data: EmailIngestInput): Promise<EmailIngestOutput>; }
