// tests/unit/unit-taxonomy-extras.test.ts
import { describe, it, expect } from 'vitest';

describe('unit: Taxonomy VOs — Extras', () => {
  it('account_verification_vo — brands correctly', async () => {
    const { asVerificationCode, asVerificationLink, asExtractedApiKey } = await import('../../src/taxonomy/account_verification_vo');
    expect(asVerificationCode('123456')).toBe('123456');
    expect(asVerificationLink('https://v.test')).toBe('https://v.test');
    expect(asExtractedApiKey('key-123')).toBe('key-123');
  });

  it('email_wait_vo — status flags and logic', async () => {
    const { isWaitSuccess, isWaitTimeout } = await import('../../src/taxonomy/email_wait_vo');
    const success: any = { status: 'matched', emailId: 'e1' };
    const timeout: any = { status: 'timeout', emailId: null };
    expect(isWaitSuccess(success)).toBe(true);
    expect(isWaitTimeout(timeout)).toBe(true);
    expect(isWaitSuccess({ status: 'pending', emailId: null } as any)).toBe(false);
  });

  it('worker_metric_vo — brands value', async () => {
    const { asWorkerMetricValue } = await import('../../src/taxonomy/worker_metric_vo');
    expect(asWorkerMetricValue(123)).toBe(123);
  });

  it('quota_limit_vo — brands, constants and logic', async () => {
    const { asMaxInboxes, asInboxCount, asRequestsPerMinute, DEFAULT_QUOTA, isOverQuota, remainingInboxes } = await import('../../src/taxonomy/quota_limit_vo');
    expect(asMaxInboxes(10)).toBe(10);
    expect(asInboxCount(5)).toBe(5);
    expect(DEFAULT_QUOTA.maxInboxes).toBe(50);

    const limits = { ...DEFAULT_QUOTA, maxInboxes: asMaxInboxes(2), requestsPerMinute: asRequestsPerMinute(10) };
    const usage = { currentInboxes: asInboxCount(1), currentEmails: 0 as any, requestsLastMinute: 0 as any };
    
    expect(isOverQuota(usage, limits)).toBe(false);
    expect(remainingInboxes(usage, limits)).toBe(1);

    // Exactly at limit
    const atLimit = { ...usage, currentInboxes: asInboxCount(2) };
    expect(isOverQuota(atLimit, limits)).toBe(false);

    // Over limit
    const overInboxes = { ...usage, currentInboxes: asInboxCount(3) };
    expect(isOverQuota(overInboxes, limits)).toBe(true);


    const overRequests = { ...usage, requestsLastMinute: 11 as any };
    expect(isOverQuota(overRequests, limits)).toBe(true);
    
    expect(remainingInboxes({ ...usage, currentInboxes: asInboxCount(5) }, limits)).toBe(0);
  });

  it('email_address_vo — additional coverage (createEmailAddressAsciiOnly)', async () => {
    const { createEmailAddressAsciiOnly } = await import('../../src/taxonomy/email_address_vo');
    const ea = createEmailAddressAsciiOnly('user@example.com');
    expect(ea.full).toBe('user@example.com');
    expect(() => createEmailAddressAsciiOnly('u s e r@ex.com')).toThrow();
    expect(() => createEmailAddressAsciiOnly('user@ex')).toThrow();
  });
});
