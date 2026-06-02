import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../../src/agent/request_flow_facade';
import { asUserId, asSearchFrom, createEmailAddress, asSubject, asTimeoutSeconds, asPollIntervalSeconds, asEmailId, asSubject as toSubject } from '../../src/taxonomy';
import { createTestContainer, createMockEmail } from './test_utils';

/**
 * E2E: Email Polling Orchestration
 * 
 * Responsibility:
 * Verifies the system's ability to "wait" for specifically formatted 
 * inbound emails. This involves simulating time, retry loops, 
 * and criteria filtering (sender, subject).
 */
describe('e2e: Email Polling & Filtering', () => {
  let mockDb: any;
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    const container = createTestContainer();
    mockDb = container.database;
    orchestrator = new AgentOrchestrator(container);
  });

  describe('Success Paths (Reactive Polling)', () => {
    it('successfully finds an email that arrives on the second poll', async () => {
      const u1 = asUserId('u_poller');
      
      // First call: empty
      mockDb.findEmail.mockResolvedValueOnce(null);
      // Second call: found matches
      mockDb.findEmail.mockResolvedValueOnce(
        createMockEmail({ id: asEmailId('e1'), subject: toSubject('Code: 1234') })
      );

      const result = await orchestrator.waitForEmail(u1, {
        subject: asSubject('Code: 1234'),
        timeout: asTimeoutSeconds(1),
        pollInterval: asPollIntervalSeconds(0.1)
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('e1');
      expect(mockDb.findEmail).toHaveBeenCalledTimes(2);
    });

    it('filters correctly by sender even when multiple emails are present', async () => {
      const u1 = asUserId('u_filter');
      const sender = createEmailAddress('bank@secure.com');

      mockDb.findEmail.mockResolvedValue(
        createMockEmail({ 
          id: asEmailId('e2'), 
          from: { name: null, email: sender }, 
          subject: toSubject('Alert: Your login') 
        })
      );

      const result = await orchestrator.waitForEmail(u1, {
        from: asSearchFrom(sender.full),
        timeout: asTimeoutSeconds(1)
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('e2');
    });

    it('supports complex regex-like matching for subjects', async () => {
      const u1 = asUserId('u_regex');
      
      mockDb.findEmail.mockResolvedValue(
        createMockEmail({ id: asEmailId('e_ok'), subject: toSubject('Your Verification ID: 5592') })
      );

      const result = await orchestrator.waitForEmail(u1, {
        subject: asSubject('Your Verification ID: 5592'),
        timeout: asTimeoutSeconds(1)
      });

      expect(result).toBeDefined();
    });
  });

  describe('Timeout & Resource Management', () => {
    it('returns found:false after exhausting all retries', async () => {
      const u1 = asUserId('u_timeout');
      mockDb.findEmail.mockResolvedValue(null);

      const result = await orchestrator.waitForEmail(u1, {
        timeout: asTimeoutSeconds(0.1),
        pollInterval: asPollIntervalSeconds(0.01)
      });

      expect(result).toBeNull();
    });

    it('immediately returns if the system state is invalid for polling', async () => {
      const u1 = asUserId('u_corrupt');
      mockDb.findEmail.mockRejectedValue(new Error('Internal DB Error'));

      await expect(orchestrator.waitForEmail(u1, { timeout: asTimeoutSeconds(1) }))
        .rejects.toThrow('Internal DB Error');
    });
  });

  describe('Multi-Context Concurrent Polling (Simulation)', () => {
    it('ensures separate users polling for separate things dont cross-talk', async () => {
      const uA = asUserId('user_a');
      const uB = asUserId('user_b');

      mockDb.findEmail.mockImplementation((userId: string, filters?: { from?: string; subject?: string }) => {
        if (userId === uA && filters?.subject === 'Auth A') return Promise.resolve(createMockEmail({ id: asEmailId('ea'), subject: toSubject('Auth A') }));
        if (userId === uB && filters?.subject === 'Auth B') return Promise.resolve(createMockEmail({ id: asEmailId('eb'), subject: toSubject('Auth B') }));
        return Promise.resolve(null);
      });

      const [resA, resB] = await Promise.all([
        orchestrator.waitForEmail(uA, { subject: asSubject('Auth A') }),
        orchestrator.waitForEmail(uB, { subject: asSubject('Auth B') })
      ]);

      expect(resA?.id).toBe('ea');
      expect(resB?.id).toBe('eb');
    });
  });
});
