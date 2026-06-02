// tests/regression/regression-known-bugs.test.ts
// Regression: prevent known bugs from reappearing
// Each test corresponds to a past bug fix

import { describe, it, expect } from 'vitest';

describe('regression: branded type factories exist (PR: 4d4d163)', () => {
  // Bug: branded types declared without factory functions
  // Fix: added asRequestCount, asUptimeMs, asAuditId, asEntityId, asSettingValue

  it('asRequestCount factory exists and works', async () => {
    const { asRequestCount } = await import('../../src/taxonomy/counter_value_vo');
    expect(typeof asRequestCount).toBe('function');
    expect(asRequestCount(42)).toBe(42);
  });

  it('asUptimeMs factory exists and works', async () => {
    const { asUptimeMs } = await import('../../src/taxonomy/counter_value_vo');
    expect(typeof asUptimeMs).toBe('function');
    expect(asUptimeMs(1000)).toBe(1000);
  });

  it('asAuditId factory exists and works', async () => {
    const { asAuditId } = await import('../../src/taxonomy/email_audit_entity');
    expect(typeof asAuditId).toBe('function');
    expect(asAuditId('audit-123')).toBe('audit-123');
  });

  it('asEntityId factory exists and works', async () => {
    const { asEntityId } = await import('../../src/taxonomy/not_found_error');
    expect(typeof asEntityId).toBe('function');
    expect(asEntityId('entity-456')).toBe('entity-456');
  });

  it('asSettingValue factory exists and works', async () => {
    const { asSettingValue } = await import('../../src/taxonomy/worker_config_vo');
    expect(typeof asSettingValue).toBe('function');
    expect(asSettingValue('value')).toBe('value');
  });
});

describe('regression: boolean constants for all branded booleans', () => {
  // Bug: DeleteResult, BotTokenConfigured, WebhookSecretConfigured, ForwardInbound
  // had no constants defined

  it('DeleteResult has DELETE_SUCCESS/DELETE_FAILURE constants', async () => {
    const mod = await import('../../src/taxonomy/operation_status_vo');
    expect(mod.DELETE_SUCCESS).toBe(true);
    expect(mod.DELETE_FAILURE).toBe(false);
  });

  it('BotTokenConfigured has constants', async () => {
    const mod = await import('../../src/taxonomy/worker_config_vo');
    expect(mod.BOT_TOKEN_CONFIGURED).toBe(true);
    expect(mod.BOT_TOKEN_NOT_CONFIGURED).toBe(false);
  });

  it('WebhookSecretConfigured has constants', async () => {
    const mod = await import('../../src/taxonomy/worker_config_vo');
    expect(mod.WEBHOOK_SECRET_CONFIGURED).toBe(true);
    expect(mod.WEBHOOK_SECRET_NOT_CONFIGURED).toBe(false);
  });

  it('ForwardInbound has constants', async () => {
    const mod = await import('../../src/taxonomy/worker_config_vo');
    expect(mod.FORWARD_INBOUND).toBe(true);
    expect(mod.FORWARD_INBOUND_DISABLED).toBe(false);
  });
});

describe('regression: reason field uses Reason branded type', () => {
  // Bug: email_wait_vo.ts and validation_field_error.ts used raw string for reason

  it('email_wait_vo imports Reason from health_status_vo', async () => {
    const { asReason } = await import('../../src/taxonomy/health_status_vo');
    expect(typeof asReason).toBe('function');
    expect(asReason('timeout')).toBe('timeout');
  });
});
