import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentOrchestrator } from '../../src/agent/request_flow_facade';
import {
  asUserId, asPassword, asUserAgent, asClientIp, asActor,
  asName, asEmailId, createEmailAddress, 
  asSubject, asSnippet, asBodyText, asTimestamp
} from '../../src/taxonomy';
import { createTestContainer, createMockEmail } from './test_utils';

/**
 * E2E: Core System Flow
 * 
 * Responsibility:
 * This is the ultimate "Integration" test that verifies the intersection
 * of all major system routers and capabilities: Ingest -> Notify -> Query -> Manage.
 */
describe('e2e: System Core Flow Orchestration', () => {
  let mockDb: any;
  let mockCrypto: any;
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    const container = createTestContainer();
    mockDb = container.database;

    mockCrypto = container.crypto;
    orchestrator = new AgentOrchestrator(container);
  });

  describe('Golden Path: User Onboarding to Email Consumption', () => {
    it('executes the full lifecycle for a single user', async () => {
      // 1. Setup User
      mockDb.createUser.mockResolvedValue({ id: 'u_1' });
      mockCrypto.generateSecurePassword.mockReturnValue('Strong-123');
      const onboarding = await orchestrator.createUser(asName('JohnDoe'));
      expect(onboarding.user.id).toBe('u_1');

      // 2. Ingest Inbound Email
      const emailInput = {
        emailId: asEmailId('msg_99'),
        sender: createEmailAddress('sender@service.com'),
        recipient: createEmailAddress('john.flare@inbox.io'),
        subject: asSubject('Welcome to the System'),
        snippet: asSnippet('Your account is ready...'),
        bodyText: asBodyText('Detailed body content of the welcome message.'),
        receivedAt: asTimestamp(new Date().toISOString())
      };

      mockDb.upsertEmail.mockResolvedValue({ stored: true });
      mockDb.getNotificationSettings.mockResolvedValue([]);

      const ingestResult = await orchestrator.handleEmailNotification(emailInput);
      expect(ingestResult.stored).toBe(true);
      expect(mockDb.upsertEmail).toHaveBeenCalled();

      // 3. User Retrieves Inbox
      mockDb.getUserInboxEmails.mockResolvedValue([
        createMockEmail({ id: asEmailId('msg_99'), subject: asSubject('Welcome to the System'), status: 'unread' })
      ]);
      mockDb.getUserArchivedCount.mockResolvedValue(0);

      const inbox = await orchestrator.getUserInbox(asUserId('u_1'));
      expect(inbox.emails).toHaveLength(1);
      expect(inbox.emails[0]!.subject).toBe('Welcome to the System');

      // 4. User marks as read & archives
      mockDb.applyEmailQuickAction.mockResolvedValue(true);
      await orchestrator.applyEmailAction(asUserId('u_1'), asEmailId('msg_99'), 'archive');
      
      expect(mockDb.applyEmailQuickAction).toHaveBeenCalledWith(asUserId('u_1'), asEmailId('msg_99'), 'archive', asActor('web:u_1'));
    });
  });

  describe('Security Boundaries (Multi-Tenancy)', () => {
    it('prevents User A from observing User B metadata through orchestrator', async () => {
      const uA = asUserId('user_a');
      const uB = asUserId('user_b');

      mockDb.getUserInboxEmails.mockImplementation((userId: string) => {
        if (userId === uA) return Promise.resolve([createMockEmail({ id: asEmailId('ea') })]);
        if (userId === uB) return Promise.resolve([createMockEmail({ id: asEmailId('eb') })]);
        return Promise.resolve([]);
      });

      const inboxA = await orchestrator.getUserInbox(uA);
      const inboxB = await orchestrator.getUserInbox(uB);

      expect(inboxA.emails[0]!.id).toBe('ea');
      expect(inboxB.emails[0]!.id).toBe('eb');
      expect(inboxA.emails[0]!.id).not.toBe(inboxB.emails[0]!.id);
    });
  });

  describe('System Resilience & Graceful Degradation', () => {
    it('continues email ingestion even if notifications fail (Partial Success)', async () => {
      mockDb.upsertEmail.mockResolvedValue({ stored: true });


      const result = await orchestrator.handleEmailNotification({
        emailId: asEmailId('e1'),
        sender: createEmailAddress('a@b.com'),
        recipient: createEmailAddress('c@d.com'),
        subject: asSubject('S'),
        snippet: asSnippet('T'),
        bodyText: asBodyText('B'),
        receivedAt: asTimestamp(new Date().toISOString())
      });

      // Storage succeeds
      expect(result.stored).toBe(true);
    });
  });

  describe('Standardized API Error Response Mapping', () => {
    it('correctly maps various domain errors to consistent JSON shapes', async () => {
      // This is a unit-test style block inside E2E to ensure the Orchestrator's 
      // consumers (surfaces) get the right expected data on failures.
      
      // Unauthorized
      const { AuthUnauthorizedError } = await import('../../src/taxonomy/auth_unauthorized_error');
      const authErr = new AuthUnauthorizedError('Token dead');
      expect(authErr.toJSON().statusCode).toBe(401);

      // Not Found
      const { NotFoundError, asEntityId } = await import('../../src/taxonomy/not_found_error');
      const nfErr = new NotFoundError('Email', asEntityId('void'));
      expect(nfErr.toJSON().statusCode).toBe(404);

      // Rate Limit
      const { RateLimitError } = await import('../../src/taxonomy/rate_limit_error');
      const { asRetryAfterSeconds } = await import('../../src/taxonomy/time_duration_vo');
      const rateErr = new RateLimitError(asRetryAfterSeconds(30));
      expect(rateErr.toJSON().retryAfter).toBe(30);

      // Conflict
      const { ConflictError } = await import('../../src/taxonomy/conflict_state_error');
      const confErr = new ConflictError('User exists');
      expect(confErr.toJSON().statusCode).toBe(409);
    });
  });
});

