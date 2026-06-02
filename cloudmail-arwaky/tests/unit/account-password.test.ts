import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountServiceActions } from '../../src/capabilities/account_service_actions';
import { createMockDb, createMockMetricsCollector } from './mocks';
import { createEmailAddress, asInboxId, asTimestamp, newAccountId, asPasswordPlain } from '../../src/taxonomy';

const mockAuditLog = { logEvent: vi.fn(), getUserAuditLogs: vi.fn() };

describe('capabilities: AccountServiceActions Password Storage', () => {
  let db: any;
  let service: AccountServiceActions;

  beforeEach(() => {
    db = createMockDb();
    service = new AccountServiceActions(db, mockAuditLog as any, createMockMetricsCollector());
    vi.restoreAllMocks();
  });

  it('createAccount passes password to database record', async () => {
    const input = {
      inboxId: asInboxId('inbox-1'),
      provider: 'openrouter' as any,
      targetEmail: createEmailAddress('target@test.com'),
      password: asPasswordPlain('plain-text-password-123')
    };

    await service.createAccount(input);

    expect(db.createAccountRecord).toHaveBeenCalledWith(
      expect.any(String), // id
      input.inboxId,
      input.provider,
      input.targetEmail,
      expect.any(String), // expiresAt
      input.password,
      undefined           // apiKey (not provided)
    );
  });

  it('getAccount nullifies password in detail', async () => {
    const accountId = 'acc-1' as any;
    const mockAccount = {
      id: accountId,
      inboxId: asInboxId('inbox-1'),
      provider: 'openrouter',
      status: 'pending',
      targetEmail: createEmailAddress('target@test.com'),
      password: 'stored-password',
      createdAt: asTimestamp('2025-01-01T00:00:00Z'),
      expiresAt: asTimestamp('2025-01-01T23:59:59Z')
    };

    db.getAccountById.mockResolvedValue(mockAccount);

    const detail = await service.getAccount(accountId);
    expect(detail).not.toBeNull();
    expect((detail as any).password).toBeNull();
  });

  it('getAccountByInbox nullifies password in detail', async () => {
    const inboxId = asInboxId('inbox-1');
    const mockAccount = {
      id: 'acc-1',
      inboxId: inboxId,
      provider: 'openrouter',
      status: 'pending',
      targetEmail: createEmailAddress('target@test.com'),
      password: 'inbox-password',
      createdAt: asTimestamp('2025-01-01T00:00:00Z'),
      expiresAt: asTimestamp('2025-01-01T23:59:59Z')
    };

    db.getAccountByInboxId.mockResolvedValue(mockAccount);

    const detail = await service.getAccountByInbox(inboxId);
    expect(detail).not.toBeNull();
    expect((detail as any).password).toBeNull();
  });
});
