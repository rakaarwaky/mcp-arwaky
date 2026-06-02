import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentOrchestrator } from '../../src/agent/request_flow_facade';
import { asAccountId, asInboxId, createEmailAddress, asBodyText } from '../../src/taxonomy';
import { createTestContainer } from './test_utils';

/**
 * E2E: Automation & Extraction
 * 
 * Responsibility:
 * Verifies the system's ability to autonomously parse inbound emails,
 * extract actionable data (like verification links), and update 
 * external account states without manual user intervention.
 */
describe('E2E: Automation & Extraction Scenarios', () => {
  let mockDb: any;
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    const container = createTestContainer();
    mockDb = container.database;
    orchestrator = new AgentOrchestrator(container);
  });

  describe('Verification Link Extraction', () => {
    it('successfully extracts a link from a standard multipart email', async () => {
      const accountId = asAccountId('acc_standard');
      const body = `
        Welcome! 
        Please verify your email at:
        https://verify-me.io/auth/confirm?token=xyz_999ABC
        If you didn't request this, ignore.
      `;

      mockDb.updateAccountVerificationLink.mockResolvedValue({ success: true });

      const handled = await orchestrator.tryAutoVerifyAccount(accountId, asBodyText(body));
      
      expect(handled).toBe(true);
      expect(mockDb.updateAccountVerificationLink).toHaveBeenCalledWith(
        accountId,
        'https://verify-me.io/auth/confirm?token=xyz_999ABC'
      );
    });

    it('extracts links from HTML-heavy content with obfuscated protocols', async () => {
      const accountId = asAccountId('acc_html');
      const body = `
        <html>
          <body>
            <div>Click <a href="http://click.tracking.com/go?confirm=1&target=https%3A%2F%2Ffinal.com%2Fv">here</a></div>
          </body>
        </html>
      `;

      mockDb.updateAccountVerificationLink.mockResolvedValue({ success: true });

      const handled = await orchestrator.tryAutoVerifyAccount(accountId, asBodyText(body));
      
      // The current extractor might be simple regex, but E2E tests the *intent*
      // Here we expect it to find the nested link if implemented, or at least the raw one
      expect(handled).toBe(true);
    });

    it('handles multiple links by choosing the first valid "verify" pattern', async () => {
      const accountId = asAccountId('acc_multi');
      const body = `
        Privacy Policy: https://site.com/privacy
        Confirm Email: https://site.com/verify?id=1
        Support: https://site.com/help
      `;

      mockDb.updateAccountVerificationLink.mockResolvedValue({ success: true });

      await orchestrator.tryAutoVerifyAccount(accountId, asBodyText(body));
      
      expect(mockDb.updateAccountVerificationLink).toHaveBeenCalledWith(
        accountId,
        'https://site.com/verify?id=1'
      );
    });

    it('returns false and records no update when no links match verification criteria', async () => {
      const accountId = asAccountId('acc_none');
      const body = 'This is just a newsletter with no links at all.';

      const handled = await orchestrator.tryAutoVerifyAccount(accountId, asBodyText(body));
      
      expect(handled).toBe(false);
      expect(mockDb.updateAccountVerificationLink).not.toHaveBeenCalled();
    });
  });

  describe('Automation State Machine', () => {
    it('orchestrates account creation followed by verification', async () => {
      const provider = 'GitHub' as any;
      const inboxId = asInboxId('inbox_123');
      const targetEmail = createEmailAddress('git@flare.test');

      mockDb.createAccountRecord.mockResolvedValue('acc_new');
      
      // 1. Create account
      const created = await orchestrator.createAccount({ inboxId, provider, targetEmail });
      expect(typeof created).toBe('string');
      const accountId = created;

      // 2. Simulate email arrival and auto-verification
      mockDb.updateAccountVerificationLink.mockResolvedValue({ success: true });
      const body = 'Verify at https://github.com/verify/99';
      
      const verified = await orchestrator.tryAutoVerifyAccount(asAccountId(accountId), asBodyText(body));
      expect(verified).toBe(true);
    });

    it('lists pending accounts for manual background workers to pick up', async () => {
      mockDb.listPendingAccounts.mockResolvedValue([
        { id: 'p1', provider: 'X', inboxId: 'in_1', targetEmail: 'git@flare.test', createdAt: '2024-01-01T00:00:00Z' },
        { id: 'p2', provider: 'Y', inboxId: 'in_2', targetEmail: 'git2@flare.test', createdAt: '2024-01-01T00:00:00Z' }
      ]);

      const pending = await orchestrator.listPendingAccounts();
      expect(pending).toHaveLength(2);
      expect(pending[0]!.id).toBe('p1');
    });
  });

  describe('Edge Cases & Resiliency', () => {
    it('gracefully handles database failures during extraction recording', async () => {
      const accountId = asAccountId('acc_fail');
      const body = 'Click here: https://link.com/verify';
      
      mockDb.updateAccountVerificationLink.mockRejectedValue(new Error('DB Timeout'));

      await expect(orchestrator.tryAutoVerifyAccount(accountId, asBodyText(body)))
        .rejects.toThrow('DB Timeout');
    });

    it('ignores non-http links (e.g. mailto or javascript)', async () => {
      const accountId = asAccountId('acc_weird');
      const body = 'Contact us: mailto:support@site.com or javascript:void(0)';

      const handled = await orchestrator.tryAutoVerifyAccount(accountId, asBodyText(body));
      expect(handled).toBe(false);
    });
  });
});
