import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountServiceActions } from '../../src/capabilities/account_service_actions';
import { createMockDb, createMockMetricsCollector } from '../unit/mocks';

const mockAuditLog = { logEvent: vi.fn(), getUserAuditLogs: vi.fn() };

describe('functional: Phase 2 Automation (OpenRouter Account)', () => {
  let mockDb: any;
  let accountService: AccountServiceActions;

  beforeEach(() => {
    mockDb = createMockDb();
    accountService = new AccountServiceActions(mockDb, mockAuditLog as any, createMockMetricsCollector());
  });

  it('should create a pending account correctly', async () => {
    const { asInboxId, createEmailAddress, asServiceProvider } = await import('../../src/taxonomy');
    const inboxId = asInboxId('i1');
    const targetEmail = createEmailAddress('target@example.com');
    
    await accountService.createAccount({
      inboxId,
      provider: asServiceProvider('openrouter'),
      targetEmail
    });

    expect(mockDb.createAccountRecord).toHaveBeenCalledWith(
      expect.any(String), // id
      inboxId,
      asServiceProvider('openrouter'),
      targetEmail,
      expect.any(String), // expiresAt
      undefined,         // password (not provided)
      undefined          // apiKey (not provided)
    );
  });

  it('should update verification link when extracted', async () => {
    const { asAccountId, asUrl } = await import('../../src/taxonomy');
    const accountId = asAccountId('acc1');
    const link = asUrl('https://openrouter.ai/verify/xyz');

    await accountService.updateVerification({
      accountId,
      verificationLink: link
    });

    expect(mockDb.updateAccountVerificationLink).toHaveBeenCalledWith(accountId, link);
  });

  it('should mark account complete with extracted API key', async () => {
    const { asAccountId, asApiKeyId } = await import('../../src/taxonomy');
    const accountId = asAccountId('acc1');
    const apiKeyId = asApiKeyId('k123');

    await accountService.markComplete({
      accountId,
      apiKeyId
    });

    expect(mockDb.markAccountComplete).toHaveBeenCalledWith(accountId, apiKeyId, undefined);
  });

  it('should handle failed account automation', async () => {
    const { asAccountId, asErrorMessage } = await import('../../src/taxonomy');
    const accountId = asAccountId('acc1');
    const error = asErrorMessage('Extraction timed out');

    await accountService.markFailed(accountId, error);

    expect(mockDb.markAccountFailed).toHaveBeenCalledWith(accountId, error);
  });
});
