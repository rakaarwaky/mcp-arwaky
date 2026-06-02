// taxonomy/counter_value_vo.ts

export type EmailCount = number & { readonly __brand: 'EmailCount' };
export type UnreadCount = number & { readonly __brand: 'UnreadCount' };

export type UpdateId = number & { readonly __brand: 'UpdateId' };
export type ArchivedCount = number & { readonly __brand: 'ArchivedCount' };
export type RequestCount = number & { readonly __brand: 'RequestCount' };
export type UptimeMs = number & { readonly __brand: 'UptimeMs' };
export type Offset = number & { readonly __brand: 'Offset' };

/**
 * Total emails sent in a period.
 */
export type SentCount = number & { readonly __brand: 'SentCount' };

/**
 * Number of attachments in an email.
 */
export type AttachmentCount = number & { readonly __brand: 'AttachmentCount' };
export type PageSize = number & { readonly __brand: 'PageSize' };
export type RemoteDebuggingPort = number & { readonly __brand: 'RemoteDebuggingPort' };


export function asEmailCount(n: number): EmailCount { return Math.max(0, Math.floor(n || 0)) as EmailCount; }
export function asUnreadCount(n: number): UnreadCount { return Math.max(0, Math.floor(n || 0)) as UnreadCount; }
export function asUpdateId(n: number): UpdateId { return Math.max(0, Math.floor(n || 0)) as UpdateId; }
export function asArchivedCount(n: number): ArchivedCount { return Math.max(0, Math.floor(n || 0)) as ArchivedCount; }
export function asRequestCount(n: number): RequestCount { return Math.max(0, Math.floor(n || 0)) as RequestCount; }
export function asUptimeMs(n: number): UptimeMs { return Math.max(0, Math.floor(n || 0)) as UptimeMs; }
export function asOffset(n: number): Offset { return Math.max(0, Math.floor(n || 0)) as Offset; }
export function asSentCount(n: number): SentCount { return Math.max(0, Math.floor(n || 0)) as SentCount; }
export function asAttachmentCount(n: number): AttachmentCount {
  return Math.max(0, Math.floor(n || 0)) as AttachmentCount;
}

/** Validates page size (must be positive integer ≥1) */
export function asPageSize(n: number): PageSize {
  return Math.max(1, Math.floor(n)) as PageSize;
}

/** Validates Chrome remote debugging port (1-65535) */
export function asRemoteDebuggingPort(n: number): RemoteDebuggingPort {
  const p = Math.max(1, Math.min(65535, Math.floor(n)));
  return p as RemoteDebuggingPort;
}

export type Count = number & { readonly __brand: 'Count' };
export function asCount(n: number): Count { return Math.max(0, Math.floor(n || 0)) as Count; }
