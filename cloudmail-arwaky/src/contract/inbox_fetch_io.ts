/**
 * @module contract/inbox_fetch_io
 * @description IO contract for inbox email listing operations.
 * Defines the input filters and output shape for inbox queries.
 */

import type { Email, UserId, ArchivedCount, EmailStatus, ApiOperationSuccess } from '../taxonomy';
 
 export type InboxStatusFilter = EmailStatus | 'all';
 export interface InboxListInput { userId?: UserId; status?: InboxStatusFilter; }
 export interface InboxListOutput { userId: UserId; emails: Email[]; archivedCount: ArchivedCount; ok?: ApiOperationSuccess; message?: string; error?: string; }
