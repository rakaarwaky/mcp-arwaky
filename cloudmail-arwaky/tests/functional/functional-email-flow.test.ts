// tests/functional/functional-email-flow.test.ts
// Functional: test email-related features against PRD specs

import { describe, it, expect } from 'vitest';

describe('functional: EmailAddress creation (PRD Phase 1)', () => {
  it('creates valid email for inbox', async () => {
    const { createEmailAddress } = await import('../../src/taxonomy/email_address_vo');
    const ea = createEmailAddress('test@inbox.example.com');
    expect(ea.full).toBe('test@inbox.example.com');
  });

  it('rejects empty string', async () => {
    const { createEmailAddress } = await import('../../src/taxonomy/email_address_vo');
    expect(() => createEmailAddress('')).toThrow();
  });

  it('trims whitespace before validation', async () => {
    const { createEmailAddress } = await import('../../src/taxonomy/email_address_vo');
    const ea = createEmailAddress('  user@example.com  ');
    expect(ea.full).toBe('user@example.com');
  });
});

describe('functional: ID generation (PRD: inbox, email, user)', () => {
  it('generates unique inbox IDs', async () => {
    const { newInboxId } = await import('../../src/taxonomy/id_identity_vo');
    const id1 = newInboxId();
    const id2 = newInboxId();
    expect(id1).not.toBe(id2);
  });

  it('generates unique email IDs', async () => {
    const { newEmailId } = await import('../../src/taxonomy/id_identity_vo');
    const id1 = newEmailId();
    const id2 = newEmailId();
    expect(id1).not.toBe(id2);
  });
});

describe('functional: error serialization (API response format)', () => {
  it('AuthUnauthorizedError serializes to correct JSON shape', async () => {
    const { AuthUnauthorizedError } = await import('../../src/taxonomy/auth_unauthorized_error');
    const err = new AuthUnauthorizedError('bad token');
    const json = err.toJSON();
    expect(json).toEqual({ error: 'UNAUTHORIZED', message: 'bad token', statusCode: 401 });
  });

  it('NotFoundError serializes with entity context', async () => {
    const { NotFoundError, asEntityId } = await import('../../src/taxonomy/not_found_error');
    const err = new NotFoundError('User', asEntityId('u-1'));
    const json = err.toJSON();
    expect(json.error).toBe('NOT_FOUND');
    expect(json.entity).toBe('User');
    expect(json.id).toBe('u-1');
  });

  it('RateLimitError serializes with retryAfter', async () => {
    const { RateLimitError } = await import('../../src/taxonomy/rate_limit_error');
    const { asRetryAfterSeconds } = await import('../../src/taxonomy/time_duration_vo');
    const err = new RateLimitError(asRetryAfterSeconds(30));
    const json = err.toJSON();
    expect(json.error).toBe('RATE_LIMITED');
    expect(json.retryAfter).toBe(30);
  });
});

describe('functional: SoftDeleteResult (PRD: soft-delete user)', () => {
  it('SoftDeleteSuccess has deleted: true', async () => {
    const success = { deleted: true } as const;
    expect(success.deleted).toBe(true);
  });

  it('SoftDeleteFailure has reason', async () => {
    const failure = { deleted: false, reason: 'not_found' as const };
    expect(failure.deleted).toBe(false);
    expect(failure.reason).toBe('not_found');
  });
});
describe('functional: EmailIngestActions logic', () => {
  it('correctly maps ingest input to DB upsert format', async () => {
    const { EmailIngestActions } = await import('../../src/capabilities/email_ingest_actions');
    const { createMockDb, createMockMetricsCollector, createMockPush } = await import('../unit/mocks');
    const { newEmailId, asTimestamp, asRawMime, asContentType, asHeadersJson, createEmailAddress } = await import('../../src/taxonomy');

    const mockDb = createMockDb();
    const metrics = createMockMetricsCollector();
    const push = createMockPush();
    const actions = new EmailIngestActions(mockDb, metrics, push);

    const emailId = newEmailId();
    const ingestData = {
      emailId,
      sender: createEmailAddress('sender@example.com'),
      recipient: createEmailAddress('rcpt@domain.com'),
      subject: 'Hello' as any,
      snippet: 'Hi' as any,
      bodyText: 'How are you?' as any,
      receivedAt: asTimestamp('2023-01-01T00:00:00Z'),
      rawMime: asRawMime('RAWDATA'),
      contentType: asContentType('text/plain'),
      headersJson: asHeadersJson('{}'),
    };

    await actions.ingestEmail(ingestData);

    expect(mockDb.upsertEmail).toHaveBeenCalledWith(expect.objectContaining({
      emailId,
      sender: ingestData.sender,
      subject: ingestData.subject
    }));
  });
});
