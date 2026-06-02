// tests/non-functional/nf-security-performance.test.ts
// Non-functional: security validation, type safety, performance characteristics

import { describe, it, expect } from 'vitest';

describe('non-functional: security — no raw secrets in types', () => {
  it('CryptoHash is branded, not raw string', async () => {
    const { asCryptoHash } = await import('../../src/taxonomy/crypto_hash_vo');
    const hash = asCryptoHash('bcrypt-hash-here');
    // The point: only asCryptoHash can create this type
    // Direct string assignment fails at compile time
    expect(hash).toBe('bcrypt-hash-here');
  });

  it('Password is branded type', async () => {
    const { asPassword } = await import('../../src/taxonomy/auth_credential_vo');
    const pw = asPassword('hashed-pw');
    expect(pw).toBe('hashed-pw');
  });

  it('AuthToken is branded type', async () => {
    const { asAuthToken } = await import('../../src/taxonomy/auth_credential_vo');
    const token = asAuthToken('session-token-abc');
    expect(token).toBe('session-token-abc');
  });
});

describe('non-functional: type safety — immutable value objects', () => {
  it('EmailAddress is frozen', async () => {
    const { createEmailAddress } = await import('../../src/taxonomy/email_address_vo');
    const ea = createEmailAddress('user@example.com');
    expect(Object.isFrozen(ea)).toBe(true);
  });
});

describe('non-functional: rate limiting — retryAfter clamped', () => {
  it('RateLimitError always has non-negative retryAfter', async () => {
    const { RateLimitError } = await import('../../src/taxonomy/rate_limit_error');
    const { asRetryAfterSeconds } = await import('../../src/taxonomy/time_duration_vo');
    const err = new RateLimitError(asRetryAfterSeconds(0));
    expect(err.retryAfterSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe('non-functional: error handling — all errors have toJSON', () => {
  it('DomainError base class has toJSON', async () => {
    const { DomainError } = await import('../../src/taxonomy/domain_base_error');
    expect(DomainError.prototype.toJSON).toBeDefined();
  });

  it('RateLimitError overrides toJSON with retryAfter', async () => {
    const { RateLimitError } = await import('../../src/taxonomy/rate_limit_error');
    const { asRetryAfterSeconds } = await import('../../src/taxonomy/time_duration_vo');
    const err = new RateLimitError(asRetryAfterSeconds(30));
    const json = err.toJSON();
    expect(json).toHaveProperty('retryAfter');
  });
});

describe('non-functional: counter type clamping', () => {
  it('asTimeoutSeconds clamps negatives to 0', async () => {
    const { asTimeoutSeconds } = await import('../../src/taxonomy/time_duration_vo');
    expect(asTimeoutSeconds(-100)).toBe(0);
  });

  it('asPollIntervalSeconds clamps negatives to 0', async () => {
    const { asPollIntervalSeconds } = await import('../../src/taxonomy/time_duration_vo');
    expect(asPollIntervalSeconds(-1)).toBe(0);
  });

  it('asSessionMaxAge clamps negatives to 0', async () => {
    const { asSessionMaxAge } = await import('../../src/taxonomy/time_duration_vo');
    expect(asSessionMaxAge(-5)).toBe(0);
  });
});
describe('non-functional: performance — operation timing', () => {
  it('bulk VO creation should be efficient', async () => {
    const { createEmailAddress } = await import('../../src/taxonomy/email_address_vo');
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      createEmailAddress(`user${i}@example.com`);
    }
    const end = performance.now();
    const duration = end - start;
    // Expect 1000 small VOs to be created in less than 50ms on most systems
    expect(duration).toBeLessThan(50);
  });
});
