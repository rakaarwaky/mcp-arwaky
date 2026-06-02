import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../../src/agent/request_flow_facade';
import { asApiKeyPlain } from '../../src/taxonomy';
import { createMockDb, createMockSessionAuth, createMockPasswordHash } from './mocks';

describe('Agent: Orchestration & Routers', () => {
  let agent: AgentOrchestrator;
  let container: any;

  beforeEach(() => {
    // We create a mock container that mimics the DI structure
    container = {
      database: createMockDb(),
      session: createMockSessionAuth(),
      crypto: createMockPasswordHash(),
      // Add other capabilities as needed by the routers
      userLogin: { 
        login: vi.fn(), 
        logout: vi.fn(),
        healthCheck: vi.fn().mockResolvedValue({ status: 'ok' })
      },
      inboxManage: { getUserInbox: vi.fn() },
      emailFetch: { getEmail: vi.fn() },
      apiKeyAuth: { authenticateWithApiKey: vi.fn() },
      quota: { checkQuota: vi.fn().mockResolvedValue({ allowed: true }) }
    };
    agent = new AgentOrchestrator(container as any);
  });

  describe('Core Routing', () => {
    it('should delegate health check to userLogin capability', async () => {
      const res = await agent.healthCheck();
      expect(res.status).toBe('ok');
    });

    it('should delegate login/logout', async () => {
      container.userLogin.login.mockResolvedValue({ token: 't1' });
      const res = await agent.login('u@e.com' as any, 'p' as any, {} as any);
      expect(res.token).toBe('t1');
    });
  });

  describe('Inbox Routing', () => {
    it('should delegate getUserInbox', async () => {
      container.inboxManage.getUserInbox.mockResolvedValue({ emails: [] });
      const res = await agent.getUserInbox('u1' as any);
      expect(res.emails).toEqual([]);
    });
  });

  describe('Security/Auth Routing', () => {
    it('should delegate API key authentication', async () => {
      container.apiKeyAuth.authenticateWithApiKey.mockResolvedValue({ token: 't' });
      const res = await agent.authenticateWithApiKey(asApiKeyPlain('sk-key'), 'ua' as any, 'ip' as any);
      expect(res.token).toBe('t');
    });
  });
});
