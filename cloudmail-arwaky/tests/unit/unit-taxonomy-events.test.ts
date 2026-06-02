// tests/unit/unit-taxonomy-events.test.ts
// Supplemental unit tests for taxonomy modules that were previously missing coverage

import { describe, it, expect } from 'vitest';

// ── Identity Factories (100% Coverage for VO logic) ────────────────

describe('unit: Taxonomy Identity Factories', () => {
  it('IdIdentityVO provides unique random UUIDs', async () => {
    const { 
      newUserId, newInboxId, newEmailId, newSessionId, 
      newAccountId, newApiKeyId 
    } = await import('../../src/taxonomy/id_identity_vo');

    expect(newUserId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(newInboxId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(newEmailId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(newSessionId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(newAccountId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(newApiKeyId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('IdIdentityVO provides casters (asId)', async () => {
    const { 
      asUserId, asInboxId, asEmailId, asSessionId, 
      asAccountId, asApiKeyId 
    } = await import('../../src/taxonomy/id_identity_vo');

    expect(asUserId('u1')).toBe('u1');
    expect(asInboxId('i1')).toBe('i1');
    expect(asEmailId('e1')).toBe('e1');
    expect(asSessionId('s1')).toBe('s1');
    expect(asAccountId('a1')).toBe('a1');
    expect(asApiKeyId('k1')).toBe('k1');
  });

  it('EventIdentityVO provides UUIDs and casters', async () => {
    const { newEventId, asEventId, EVENT_IDENTITY_DOMAIN } = await import('../../src/taxonomy/event_identity_vo');
    expect(newEventId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(asEventId('evt-123')).toBe('evt-123');
    expect(EVENT_IDENTITY_DOMAIN).toBe('event_identity');
  });

  it('GenericIdentityVO provides all themed casters', async () => {
    const { 
      asName, asCreatedBy, asActor, asAction, asState, 
      asAttachmentFilename, asContentType 
    } = await import('../../src/taxonomy/generic_identity_vo');

    expect(asName('Name')).toBe('Name');
    expect(asCreatedBy('User')).toBe('User');
    expect(asActor('Actor')).toBe('Actor');
    expect(asAction('Action')).toBe('Action');
    expect(asState('State')).toBe('State');
    expect(asAttachmentFilename('file.txt')).toBe('file.txt');
    expect(asContentType('text/plain')).toBe('text/plain');
  });

  it('CryptoHashVO provides casters and constants', async () => {
    const { asCryptoHash, CRYPTO_HASH_DOMAIN } = await import('../../src/taxonomy/crypto_hash_vo');
    expect(asCryptoHash('hash')).toBe('hash');
    expect(CRYPTO_HASH_DOMAIN).toBe('crypto_hash');
  });

  it('IpNetworkVO provides casters and constants', async () => {
    const { asIpAddress, IP_NETWORK_DOMAIN } = await import('../../src/taxonomy/ip_network_vo');
    expect(asIpAddress('1.1.1.1')).toBe('1.1.1.1');
    expect(IP_NETWORK_DOMAIN).toBe('ip_network');
  });

  it('WebUrlVO provides casters and constants', async () => {
    const { asUrl, WEB_URL_DOMAIN } = await import('../../src/taxonomy/web_url_vo');
    expect(asUrl('https://example.com')).toBe('https://example.com');
    expect(WEB_URL_DOMAIN).toBe('web_url');
  });
});

// ── Domain Entity/VO Smoke Tests (Reachability) ──────────────────────

describe('unit: Taxonomy Domain Smoke Tests', () => {
  it('ensures all domain modules are reachable and expose domains', async () => {
    const testCases = [
      { path: 'api_key_event', constant: 'API_KEY_EVENT_DOMAIN', expected: 'api_key' },
      { path: 'email_domain_event', constant: 'EMAIL_EVENT_DOMAIN', expected: 'email' },
      { path: 'inbox_domain_event', constant: 'INBOX_EVENT_DOMAIN', expected: 'inbox' },
      { path: 'registration_domain_event', constant: 'REGISTRATION_EVENT_DOMAIN', expected: 'registration' },
      { path: 'session_domain_event', constant: 'SESSION_EVENT_DOMAIN', expected: 'session' },
      { path: 'worker_settings_entity', constant: 'WORKER_SETTINGS_DOMAIN', expected: 'worker_settings' },
      { path: 'email_mail_entity', constant: 'EMAIL_MAIL_DOMAIN', expected: 'email_mail' },
      { path: 'email_metadata_vo', constant: 'EMAIL_METADATA_DOMAIN', expected: 'email_metadata' },
      { path: 'email_wait_vo', constant: 'EMAIL_WAIT_DOMAIN', expected: 'email_wait' },
      { path: 'http_context_vo', constant: 'HTTP_CONTEXT_DOMAIN', expected: 'http_context' },
      { path: 'mcp_command_vo', constant: 'MCP_COMMAND_DOMAIN', expected: 'mcp_command' },
      { path: 'quota_limit_vo', constant: 'QUOTA_LIMIT_DOMAIN', expected: 'quota_limit' },
      { path: 'session_auth_entity', constant: 'SESSION_AUTH_DOMAIN', expected: 'session_auth' },
      { path: 'text_content_vo', constant: 'TEXT_CONTENT_DOMAIN', expected: 'text_content' },
      { path: 'worker_metric_vo', constant: 'WORKER_METRIC_DOMAIN', expected: 'worker_metric' },
      { path: 'operation_status_vo', constant: 'OPERATION_STATUS_DOMAIN', expected: 'operation_status' },
      { path: 'email_audit_entity', constant: 'EMAIL_AUDIT_DOMAIN', expected: 'email_audit' }
    ];

    for (const { path, constant, expected } of testCases) {
      const mod = await import(`../../src/taxonomy/${path}`);
      expect(mod[constant]).toBe(expected);
    }
    
    // Check non-constant modules
    const { ALL_ENTITY_TYPES } = await import('../../src/taxonomy/entity_type_vo');
    expect(ALL_ENTITY_TYPES).toContain('User');
  });
});
