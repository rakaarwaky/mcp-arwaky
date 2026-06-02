// tests/unit/unit-credential.test.ts
// Unit tests: credential VOs and branded string types

import { describe, it, expect } from 'vitest';

describe('unit: credential VOs', () => {
  it('asPassword wraps string', async () => {
    const { asPassword } = await import('../../src/taxonomy/auth_credential_vo');
    expect(asPassword('secret123')).toBe('secret123');
  });

  it('asCryptoHash wraps string', async () => {
    const { asCryptoHash } = await import('../../src/taxonomy/crypto_hash_vo');
    expect(asCryptoHash('abc123hash')).toBe('abc123hash');
  });
});

describe('unit: ErrorCode VO', () => {
  it('ERROR_STATUS_MAP maps all 7 codes correctly', async () => {
    const { ERROR_STATUS_MAP } = await import('../../src/taxonomy/error_code_vo');
    expect(ERROR_STATUS_MAP.UNAUTHORIZED).toBe(401);
    expect(ERROR_STATUS_MAP.FORBIDDEN).toBe(403);
    expect(ERROR_STATUS_MAP.NOT_FOUND).toBe(404);
    expect(ERROR_STATUS_MAP.VALIDATION_ERROR).toBe(400);
    expect(ERROR_STATUS_MAP.CONFLICT).toBe(409);
    expect(ERROR_STATUS_MAP.RATE_LIMITED).toBe(429);
    expect(ERROR_STATUS_MAP.INTERNAL_ERROR).toBe(500);
  });
});

describe('unit: HealthStatus VO', () => {
  it('asHealthStatus accepts valid statuses', async () => {
    const { asHealthStatus } = await import('../../src/taxonomy/health_status_vo');
    expect(asHealthStatus('healthy')).toBe('healthy');
    expect(asHealthStatus('degraded')).toBe('degraded');
    expect(asHealthStatus('unhealthy')).toBe('unhealthy');
    expect(asHealthStatus('unknown')).toBe('unknown');
  });

  it('asHealthStatus rejects invalid status', async () => {
    const { asHealthStatus } = await import('../../src/taxonomy/health_status_vo');
    expect(() => asHealthStatus('ok')).toThrow('Invalid health status');
  });

  it('constants are correct branded values', async () => {
    const { HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN } = await import('../../src/taxonomy/health_status_vo');
    expect(HEALTHY).toBe('healthy');
    expect(DEGRADED).toBe('degraded');
    expect(UNHEALTHY).toBe('unhealthy');
    expect(UNKNOWN).toBe('unknown');
  });

  it('asReason wraps string without validation', async () => {
    const { asReason } = await import('../../src/taxonomy/health_status_vo');
    expect(asReason('anything goes')).toBe('anything goes');
    expect(asReason('')).toBe('');
  });
});

describe('unit: EmailStatus VO', () => {
  it('asEmailStatus accepts valid statuses', async () => {
    const { asEmailStatus } = await import('../../src/taxonomy/email_status_vo');
    expect(asEmailStatus('unread')).toBe('unread');
    expect(asEmailStatus('read')).toBe('read');
    expect(asEmailStatus('archived')).toBe('archived');
    expect(asEmailStatus('deleted')).toBe('deleted');
  });

  it('asEmailStatus rejects invalid status', async () => {
    const { asEmailStatus } = await import('../../src/taxonomy/email_status_vo');
    expect(() => asEmailStatus('pending')).toThrow('Invalid email status');
  });

  it('constants match expected values', async () => {
    const mod = await import('../../src/taxonomy/email_status_vo');
    expect(mod.EMAIL_STATUS_UNREAD).toBe('unread');
    expect(mod.EMAIL_STATUS_READ).toBe('read');
    expect(mod.EMAIL_STATUS_ARCHIVED).toBe('archived');
    expect(mod.EMAIL_STATUS_DELETED).toBe('deleted');
  });
});

describe('unit: EmailAction VO', () => {
  it('asEmailStatus accepts all 10 valid actions', async () => {
    const { asEmailAction } = await import('../../src/taxonomy/email_action_vo');
    expect(asEmailAction('forward')).toBe('forward');
    expect(asEmailAction('reply')).toBe('reply');
    expect(asEmailAction('archive')).toBe('archive');
    expect(asEmailAction('delete')).toBe('delete');
    expect(asEmailAction('mark_read')).toBe('mark_read');
    expect(asEmailAction('mark_unread')).toBe('mark_unread');
    expect(asEmailAction('star')).toBe('star');
    expect(asEmailAction('unstar')).toBe('unstar');
    expect(asEmailAction('parse_verification')).toBe('parse_verification');
    expect(asEmailAction('extract_api_key')).toBe('extract_api_key');
  });

  it('asEmailAction rejects invalid actions', async () => {
    const { asEmailAction } = await import('../../src/taxonomy/email_action_vo');
    expect(() => asEmailAction('forward_all')).toThrow('Invalid email action');
    expect(() => asEmailAction('')).toThrow('Invalid email action');
  });

  it('all 10 action constants have correct values', async () => {
    const mod = await import('../../src/taxonomy/email_action_vo');
    expect(mod.EMAIL_ACTION_FORWARD).toBe('forward');
    expect(mod.EMAIL_ACTION_REPLY).toBe('reply');
    expect(mod.EMAIL_ACTION_ARCHIVE).toBe('archive');
    expect(mod.EMAIL_ACTION_DELETE).toBe('delete');
    expect(mod.EMAIL_ACTION_MARK_READ).toBe('mark_read');
    expect(mod.EMAIL_ACTION_MARK_UNREAD).toBe('mark_unread');
    expect(mod.EMAIL_ACTION_STAR).toBe('star');
    expect(mod.EMAIL_ACTION_UNSTAR).toBe('unstar');
    expect(mod.EMAIL_ACTION_PARSE_VERIFICATION).toBe('parse_verification');
    expect(mod.EMAIL_ACTION_EXTRACT_API_KEY).toBe('extract_api_key');
  });
});

describe('unit: URL VO', () => {
  it('asUrl accepts valid URLs', async () => {
    const { asUrl } = await import('../../src/taxonomy/web_url_vo');
    expect(asUrl('https://example.com')).toBe('https://example.com');
    expect(asUrl('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('asUrl rejects invalid URLs', async () => {
    const { asUrl } = await import('../../src/taxonomy/web_url_vo');
    expect(() => asUrl('not a url')).toThrow('Invalid URL');
  });

  it('asWebhookUrl wraps through asUrl validation', async () => {
    const { asWebhookUrl } = await import('../../src/taxonomy/web_url_vo');
    expect(asWebhookUrl('https://hooks.example.com/abc')).toBe('https://hooks.example.com/abc');
    expect(() => asWebhookUrl('nope')).toThrow('Invalid URL');
  });
});

describe('unit: FieldName VO', () => {
  it('asFieldName accepts non-empty strings', async () => {
    const { asFieldName, fieldNameOf } = await import('../../src/taxonomy/field_name_vo');
    const f = asFieldName('email');
    expect(f).toBe('email');
    expect(fieldNameOf(f)).toBe('email');
  });

  it('asFieldName rejects empty string', async () => {
    const { asFieldName } = await import('../../src/taxonomy/field_name_vo');
    expect(() => asFieldName('')).toThrow('Field name cannot be empty');
  });

  it('asFieldName rejects whitespace-only string', async () => {
    const { asFieldName } = await import('../../src/taxonomy/field_name_vo');
    expect(() => asFieldName('   ')).toThrow('Field name cannot be empty');
  });

  it('fieldNameOf returns raw string', async () => {
    const { asFieldName, fieldNameOf } = await import('../../src/taxonomy/field_name_vo');
    expect(fieldNameOf(asFieldName('username'))).toBe('username');
  });
});

describe('unit: FlagState VO', () => {
  it('STARRED/NOT_STARRED constants', async () => {
    const mod = await import('../../src/taxonomy/flag_state_vo');
    expect(mod.STARRED).toBe(true);
    expect(mod.NOT_STARRED).toBe(false);
  });

  it('WITH/WITHOUT_ATTACHMENTS constants', async () => {
    const mod = await import('../../src/taxonomy/flag_state_vo');
    expect(mod.WITH_ATTACHMENTS).toBe(true);
    expect(mod.WITHOUT_ATTACHMENTS).toBe(false);
  });

  it('asIsStarred converts truthy/falsy', async () => {
    const { asIsStarred } = await import('../../src/taxonomy/flag_state_vo');
    expect(asIsStarred(true)).toBe(true);
    expect(asIsStarred(false)).toBe(false);
    expect(asIsStarred(1)).toBe(true);
    expect(asIsStarred(0)).toBe(false);
  });
});

describe('unit: DataSize VO — clamping behavior', () => {
  it('asByteLength floors and clamps to 0', async () => {
    const { asByteLength } = await import('../../src/taxonomy/data_size_vo');
    expect(asByteLength(5.7)).toBe(5);
    expect(asByteLength(-3)).toBe(0);
    expect(asByteLength(0)).toBe(0);
    expect(asByteLength(100)).toBe(100);
  });

  it('asPasswordLength floors and clamps to 0', async () => {
    const { asPasswordLength } = await import('../../src/taxonomy/data_size_vo');
    expect(asPasswordLength(3.9)).toBe(3);
    expect(asPasswordLength(-1)).toBe(0);
  });

  it('asAttachmentSize floors and clamps to 0', async () => {
    const { asAttachmentSize } = await import('../../src/taxonomy/data_size_vo');
    expect(asAttachmentSize(1024.5)).toBe(1024);
    expect(asAttachmentSize(-100)).toBe(0);
  });

  it('NaN returns NaN (known limitation)', async () => {
    const { asByteLength } = await import('../../src/taxonomy/data_size_vo');
    expect(asByteLength(NaN)).toBeNaN();
  });
});

describe('unit: TimeDuration VO — clamping behavior', () => {
  it('asTimeoutSeconds floors and clamps to 0', async () => {
    const { asTimeoutSeconds } = await import('../../src/taxonomy/time_duration_vo');
    expect(asTimeoutSeconds(5.9)).toBe(5);
    expect(asTimeoutSeconds(-1)).toBe(0);
    expect(asTimeoutSeconds(30)).toBe(30);
  });

  it('asPollIntervalSeconds floors and clamps to 0', async () => {
    const { asPollIntervalSeconds } = await import('../../src/taxonomy/time_duration_vo');
    expect(asPollIntervalSeconds(2.1)).toBe(2);
    expect(asPollIntervalSeconds(-5)).toBe(0);
  });

  it('asSessionMaxAge floors and clamps to 0', async () => {
    const { asSessionMaxAge } = await import('../../src/taxonomy/time_duration_vo');
    expect(asSessionMaxAge(86400)).toBe(86400);
    expect(asSessionMaxAge(-1)).toBe(0);
  });

  it('asMaxAgeHours floors and clamps to 0', async () => {
    const { asMaxAgeHours } = await import('../../src/taxonomy/time_duration_vo');
    expect(asMaxAgeHours(24.7)).toBe(24);
    expect(asMaxAgeHours(-10)).toBe(0);
  });
});

describe('unit: CleanupResult VO', () => {
  it('asCleanupCount floors and clamps to 0', async () => {
    const { asCleanupCount } = await import('../../src/taxonomy/cleanup_result_vo');
    expect(asCleanupCount(10.5)).toBe(10);
    expect(asCleanupCount(-5)).toBe(0);
    expect(asCleanupCount(0)).toBe(0);
  });
});

describe('unit: CounterValue VO', () => {
  it('asEmailCount wraps number', async () => {
    const { asEmailCount } = await import('../../src/taxonomy/counter_value_vo');
    expect(asEmailCount(42)).toBe(42);
    expect(asEmailCount(0)).toBe(0);
    expect(asEmailCount(-1)).toBe(0); // clamped to 0
  });

  it('asUnreadCount wraps number', async () => {
    const { asUnreadCount } = await import('../../src/taxonomy/counter_value_vo');
    expect(asUnreadCount(5)).toBe(5);
  });

  it('asAttachmentCount wraps number', async () => {
    const { asAttachmentCount } = await import('../../src/taxonomy/counter_value_vo');
    expect(asAttachmentCount(3)).toBe(3);
  });

  it('asRetryAfterSeconds wraps number', async () => {
    const { asRetryAfterSeconds } = await import('../../src/taxonomy/time_duration_vo');
    expect(asRetryAfterSeconds(60)).toBe(60);
  });

  it('asUpdateId wraps number', async () => {
    const { asUpdateId } = await import('../../src/taxonomy/counter_value_vo');
    expect(asUpdateId(12345)).toBe(12345);
  });

  it('asArchivedCount wraps number', async () => {
    const { asArchivedCount } = await import('../../src/taxonomy/counter_value_vo');
    expect(asArchivedCount(7)).toBe(7);
  });

  it('asRequestCount wraps number', async () => {
    const { asRequestCount } = await import('../../src/taxonomy/counter_value_vo');
    expect(asRequestCount(999)).toBe(999);
  });

  it('asUptimeMs wraps number', async () => {
    const { asUptimeMs } = await import('../../src/taxonomy/counter_value_vo');
    expect(asUptimeMs(1000000)).toBe(1000000);
  });

  it('asOffset wraps number', async () => {
    const { asOffset } = await import('../../src/taxonomy/counter_value_vo');
    expect(asOffset(50)).toBe(50);
  });

  it('asSentCount wraps number', async () => {
    const { asSentCount } = await import('../../src/taxonomy/counter_value_vo');
    expect(asSentCount(10)).toBe(10);
  });
});
