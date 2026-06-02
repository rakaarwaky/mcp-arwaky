// taxonomy/timestamp_epoch_vo.ts
// ISO 8601 timestamp — D1 compatible

export type Timestamp = string & { readonly __brand: 'Timestamp' };

export function nowTimestamp(): Timestamp {
  return new Date().toISOString() as Timestamp;
}

export function asTimestamp(s: string): Timestamp {
  if (typeof s !== 'string') {
    throw new Error(`Invalid ISO 8601 timestamp: ${s} (not a string)`);
  }

  // Reject numeric-only strings like '123'
  if (/^\d+$/.test(s)) {
    throw new Error(`Invalid ISO 8601 timestamp: ${s} (numeric only)`);
  }

  // ISO 8601 pattern: YYYY-MM-DDTHH:mm:ss(.sss)?Z or YYYY-MM-DD HH:mm:ss
  // Must have proper date format with dashes and colons
  const isoPattern = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?$/;
  if (!isoPattern.test(s)) {
    throw new Error(`Invalid ISO 8601 timestamp: ${s}`);
  }

  const date = new Date(s);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ISO 8601 timestamp: ${s} (Invalid date)`);
  }

  // Strict check: JS Date rolls over invalid dates (e.g. Feb 29 on non-leap year becomes Mar 1)
  // We check if the year/month/day parts match
  const parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (parts) {
    const y = parseInt(parts[1]!, 10);
    const m = parseInt(parts[2]!, 10) - 1; // 0-indexed
    const d = parseInt(parts[3]!, 10);
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) {
      throw new Error(`Invalid ISO 8601 timestamp: ${s} (Calendar rollover)`);
    }
  }

  return s as Timestamp;
}

export function isExpired(ts: Timestamp): boolean {
  return new Date(ts).getTime() < Date.now();
}
