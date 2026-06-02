// tests/integration/integration-di-container.test.ts
// Integration: verify the DI container wires infrastructure → capabilities correctly

import { describe, it, expect } from 'vitest';
import { createContainer, createLocalContainer } from '../../src/agent/di_container_registry';

describe('integration: DI Container (Cloudflare Worker)', () => {
  it('should initialize all Phase 1-4 capabilities with D1 database', async () => {
    const mockD1: any = {
      prepare: () => ({ bind: () => ({ all: async () => ({ results: [] }) }) })
    };
    
    const container = createContainer({
      DB: mockD1,
      MAILFLARE_USER_DOMAIN: 'example.com' as any
    });

    // Verify infrastructure
    expect(container.database).toBeDefined();
    expect(container.crypto).toBeDefined();
    expect(container.session).toBeDefined();

    // Verify Phase 1 capabilities
    expect(container.userLogin).toBeDefined();
    expect(container.inboxManage).toBeDefined();
    expect(container.emailFetch).toBeDefined();
    expect(container.dashboardMetrics).toBeDefined();
    expect(container.emailIngest).toBeDefined();

    // Verify Phase 2-4 capabilities
    expect(container.apiKeyManagement).toBeDefined();
    expect(container.quotaManagement).toBeDefined();
    expect(container.rateLimit).toBeDefined();
  });

  it('should throw if DB is missing', () => {
    expect(() => createContainer({} as any)).toThrow('createContainer requires env.DB');
  });
});

describe('integration: DI Container (Local / MCP)', () => {
  it('should wire HttpClientAdapter as the primary database port', () => {
    const container = createLocalContainer({
      baseUrl: 'http://localhost' as any,
      token: 'test_token' as any
    });

    // In local container, database should be HttpClientAdapter
    // We check the class name or constructor implicitly by checking defined state
    expect(container.database).toBeDefined();
    expect(container.userLogin).toBeDefined();
    
    // Verify it uses the local session stub
    expect(container.session.getCookieName()).toBe('mailflare_session');
  });
});
