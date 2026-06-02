import { describe, it, expect, vi, beforeEach } from 'vitest';
import { D1DatabaseAdapter } from '../../src/infrastructure/d1_database_adapter';
import { 
  createEmailAddress, asSubject, asSnippet, asBodyText, asRawMime, 
  asContentType, asHeadersJson, asTimestamp,
  asUserId, asAccountId, asApiKeyId, asInboxId, asServiceProvider
} from '../../src/taxonomy';

// Mock D1 types
class MockD1PreparedStatement {
  constructor(public query: string, public binds: any[] = []) {}
  bind(...values: any[]) {
    return new MockD1PreparedStatement(this.query, values);
  }
  async first<T>() { return null as T | null; }
  async all<T>() { return { results: [] as T[] }; }
  async run() { return { meta: { changes: 0 } }; }
}

class MockD1Database {
  prepare(query: string) {
    return new MockD1PreparedStatement(query);
  }
}

describe('infrastructure: D1DatabaseAdapter', () => {
  let db: MockD1Database;
  let adapter: D1DatabaseAdapter;

  beforeEach(() => {
    db = new MockD1Database();
    adapter = new D1DatabaseAdapter(db as any);
    vi.restoreAllMocks();
  });

  it('getUsers maps database rows correctly', async () => {
    const mockRows = [
      { id: 'u1', email: 'u1@test.com', display_name: 'U1', password_hash: 'h1', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' }
    ];
    vi.spyOn(MockD1PreparedStatement.prototype, 'all').mockResolvedValue({ results: mockRows });

    const users = await adapter.getUsers();
    expect(users).toHaveLength(1);
    expect(users[0]!.id).toBe('u1');
    expect(users[0]!.email.full).toBe('u1@test.com');
    expect(users[0]!.displayName).toBe('U1');
  });

  it('getUserById returns null if not found', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue(null);
    const user = await adapter.getUserById('none' as any);
    expect(user).toBeNull();
  });

  it('createUser inserts and returns new user', async () => {
    const mockRow = { id: 'new-id', email: 'new@test.com', display_name: 'New', password_hash: 'hash', created_at: '2025-01-01T12:00:00Z', updated_at: '2025-01-01T12:00:00Z' };
    vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue(mockRow);
    
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('new-id' as any);

    const user = await adapter.createUser({
      email: createEmailAddress('new@test.com'),
      displayName: 'New' as any,
      passwordHash: 'hash' as any
    });

    expect(user.id).toBe('new-id');
    expect(uuidSpy).toHaveBeenCalled();
  });

  it('deleteUser returns false if user not found', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue(null);
    const deleted = await adapter.deleteUser('u1' as any);
    expect(deleted).toBe(false);
  });

  it('deleteUser returns false if user has emails or sessions', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'first')
      .mockResolvedValueOnce({ id: 'u1' }) // user exists
      .mockResolvedValueOnce({ count: 1 }); // has 1 email

    const deleted = await adapter.deleteUser('u1' as any);
    expect(deleted).toBe(false);
  });

  it('softDeleteUser handles owner protection', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({
      id: 'owner',
      email: 'owner@test.com',
      is_owner: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    });

    const result = await adapter.softDeleteUser('owner' as any);
    expect(result.deleted).toBe(false);
    expect((result as any).reason).toBe('protected_owner');
  });

  it('upsertEmail handles valid input', async () => {
    const { STORED } = await import('../../src/taxonomy');
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({ id: 'u1' });
    vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });

    const result = await adapter.upsertEmail({
      emailId: 'msg1' as any,
      sender: createEmailAddress('sender@test.com'),
      recipient: createEmailAddress('recipient@test.com'),
      subject: asSubject('Hello'),
      snippet: asSnippet('Hi'),
      bodyText: asBodyText('...'),
      rawMime: asRawMime('...'),
      contentType: asContentType('text/plain'),
      headersJson: asHeadersJson('{}'),
      receivedAt: asTimestamp('2025-01-01T12:00:00Z')
    });

    expect(result.stored).toBe(STORED);
  });

  it('getDashboardMetrics aggregates counts correctly', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({ user_count: 10 });
    const metrics = await adapter.getDashboardMetrics(asUserId('u1'));
    expect(metrics).toHaveLength(8);
    expect(metrics[0]!.value).toBe('10');
  });

  it('applyEmailQuickAction handles star toggle', async () => {
    const mockEmail = { 
      id: 'e1', 
      inbox_id: 'u1', 
      is_starred: 0, 
      status: 'unread',
      received_at: '2025-01-01T00:00:00Z',
      from_email: 's@t.com'
    };
    // Mock getEmailById called inside applyEmailQuickAction
    const getEmailSpy = vi.spyOn((adapter as any).emailModule, 'getEmailById')
      .mockResolvedValueOnce({ ...mockEmail, isStarred: false } as any); // first call

    vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });

    const result = await adapter.applyEmailQuickAction('u1' as any, 'e1' as any, 'star', 'admin' as any);
    expect(result.updated).toBe(true);
    expect(getEmailSpy).toHaveBeenCalledTimes(1);
  });

  it('parseRecipients handles invalid JSON fallback', async () => {
    const adapterAny = adapter as any;
    const recipients = adapterAny.parseRecipients('raw-string@test.com');
    expect(recipients).toHaveLength(1);
    expect(recipients[0]!.email.full).toBe('raw-string@test.com');
  });

  it('parseAttachments handles empty/invalid input', async () => {
    const adapterAny = adapter as any;
    expect(adapterAny.parseAttachments('')).toEqual([]);
    expect(adapterAny.parseAttachments('invalid-json')).toEqual([]);
    expect(adapterAny.parseAttachments(JSON.stringify([{ filename: 'f1' }]))).toHaveLength(1);
  });

  it('parseReferences handles spaces and JSON', async () => {
    const adapterAny = adapter as any;
    expect(adapterAny.parseReferences('ref1 ref2')).toEqual(['ref1', 'ref2']);
    expect(adapterAny.parseReferences(JSON.stringify(['ref3']))).toEqual(['ref3']);
    expect(adapterAny.parseReferences('')).toEqual([]);
  });

  it('Account management operations', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    await adapter.createAccountRecord(asAccountId('a1'), asInboxId('i1'), asServiceProvider('openrouter'), createEmailAddress('t@t.com'), asTimestamp('2025-12-31T23:59:59Z'), 'pass');
    await adapter.updateAccountVerificationLink(asAccountId('a1'), 'https://verify.me' as any);
    await adapter.markAccountComplete(asAccountId('a1'), asApiKeyId('k1'));
    await adapter.markAccountFailed(asAccountId('a1'), 'some error' as any);
    
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({
      id: 'a1', 
      inbox_id: 'i1', 
      provider: 'openrouter', 
      status: 'pending', 
      target_email: 't@t.com', 
      expires_at: '2025-12-31T23:59:59Z',
      created_at: '2025-01-01T00:00:00Z'
    });
    vi.spyOn(MockD1PreparedStatement.prototype, 'all').mockResolvedValue({ 
      results: [{ 
        id: 'a1', 
        inbox_id: 'i1',
        provider: 'openrouter',
        status: 'pending', 
        target_email: 't@t.com',
        expires_at: '2025-12-31T23:59:59Z', 
        created_at: '2025-01-01T00:00:00Z' 
      }] 
    });

    const acc = await adapter.getAccountById(asAccountId('a1'));
    expect(acc?.status).toBe('pending');

    const accByInbox = await adapter.getAccountByInboxId('i1' as any);
    expect(accByInbox?.id).toBe('a1');

    const pending = await adapter.listPendingAccounts();
    expect(pending).toHaveLength(1);
  });

  it('ApiKey management operations', async () => {
    const runSpy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    await adapter.createApiKeyRecord(asApiKeyId('k1'), 'hash' as any, 'Key 1' as any, 'admin' as any);
    expect(runSpy).toHaveBeenCalled();

    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({
      id: 'k1', key_hash: 'hash', name: 'Key 1', created_by: 'admin', created_at: '2025-01-01T00:00:00Z'
    });
    const key = await adapter.getApiKeyByHash('hash' as any);
    expect(key?.id).toBe('k1');

    vi.spyOn(MockD1PreparedStatement.prototype, 'all').mockResolvedValue({ 
      results: [{ id: 'k1', key_hash: 'hash', name: 'Key 1', created_by: 'admin', created_at: '2025-01-01T00:00:00Z' }] 
    });
    const keys = await adapter.listApiKeys();
    expect(keys).toHaveLength(1);
  });

  it('WorkerSettings operations', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    await adapter.setWorkerSetting('user_email_domain' as any, 'test.com' as any);

    vi.spyOn(MockD1PreparedStatement.prototype, 'all').mockResolvedValue({ 
      results: [{ key: 'user_email_domain', value: 'test.com', updated_at: '2025-01-01T00:00:00Z' }] 
    });
    const settings = await adapter.getWorkerSettings();
    expect(settings).toHaveLength(1);
    expect(settings[0]!.value).toBe('test.com');
  });

  it('Quota-related counts', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({ count: 5 });
    
    expect(await adapter.getUserInboxCount(asUserId('u1'))).toBe(5);
    expect(await adapter.getUserEmailCount(asUserId('u1'))).toBe(5);
    expect(await adapter.getRequestsLastMinute(asUserId('u1'))).toBe(5);
  });

  it('deleteExpiredSessions deletes rows', async () => {
    const spy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 5 } });
    const count = await adapter.deleteExpiredSessions();
    expect(count).toBe(5);
    expect(spy).toHaveBeenCalled();
  });

  it('cleanup methods work', async () => {
    const spy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    await adapter.cleanupExpiredEmails(24 as any);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('updateUserPassword handles database update', async () => {
    const spy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    await adapter.updateUserPassword('u1' as any, 'new-hash' as any);
    expect(spy).toHaveBeenCalled();
  });

  it('revokeApiKeyRecord updates status', async () => {
    const spy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    await adapter.revokeApiKeyRecord('k1' as any);
    expect(spy).toHaveBeenCalled();
  });

  it('recordApiRequest inserts row', async () => {
    const spy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    await adapter.recordApiRequest('k1' as any, 'u1' as any);
    expect(spy).toHaveBeenCalled();
  });

  it('getRequestCountInWindow handles various states', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({ count: 42 });
    const count = await adapter.getRequestCountInWindow('k1' as any, 'u1' as any, '2025-01-01T00:00:00Z' as any);
    expect(count).toBe(42);
  });

  it('Session management: create, get, delete', async () => {
    const runSpy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    const session = {
      id: 's1', tokenHash: 'thash', userId: 'u1', userAgent: 'UA', clientIp: '1.1.1.1'
    } as any;
    
    await adapter.createLoginSession(session);
    expect(runSpy).toHaveBeenCalled();

    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({
      id: 's1', token_hash: 'thash', user_id: 'u1', created_at: '2025-01-01T00:00:00Z', expires_at: '2025-01-08T00:00:00Z', user_agent: 'UA', client_ip: '1.1.1.1'
    });
    const retrieved = await adapter.getLoginSessionByTokenHash('thash' as any);
    expect(retrieved?.id).toBe('s1');

    await adapter.deleteLoginSession('s1' as any);
    expect(runSpy).toHaveBeenCalledTimes(2);
  });


  it('getUserByEmail returns user', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({ 
      id: 'u1', 
      email: 'test@t.com', 
      created_at: '2025-01-01T00:00:00Z', 
      updated_at: '2025-01-01T00:00:00Z' 
    });
    const user = await adapter.getUserByEmail(createEmailAddress('test@t.com'));
    expect(user?.id).toBe('u1');
  });

  it('updateUser handles partial updates', async () => {
    const spy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    await adapter.updateUser('u1' as any, { displayName: 'New Name' as any });
    await adapter.updateUser('u1' as any, { email: createEmailAddress('new@t.com') });
    await adapter.updateUser('u1' as any, {}); // No-op
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('getUserArchivedCount returns archived count', async () => {
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue({ count: 7 });
    const count = await adapter.getUserArchivedCount('u1' as any);
    expect(count).toBe(7);
  });


  it('mapEmailRow handles complex mapping including attachments', async () => {
    const mockRow = {
      id: 'e1',
      inbox_id: 'u1',
      status: 'read',
      is_starred: 1,
      parsed_from_name: 'Sender',
      parsed_from_email: 's@t.com',
      parsed_to: JSON.stringify([{ name: 'R', email: 'r@t.com' }]),
      parsed_attachments: JSON.stringify([{ filename: 'a.txt', contentType: 'text/plain', size: 100 }]),
      parsed_references: JSON.stringify(['ref1']),
      received_at: '2025-01-01T00:00:00Z'
    };
    vi.spyOn(MockD1PreparedStatement.prototype, 'all').mockResolvedValue({ results: [mockRow] });
    
    const emails = await adapter.getUserInboxEmails('u1' as any);
    expect(emails[0]!.status).toBe('read');
    expect(emails[0]!.isStarred).toBe(true);
    expect(emails[0]!.from.name).toBe('Sender');
    expect(emails[0]!.to).toHaveLength(1);
    expect(emails[0]!.attachments).toHaveLength(1);
    expect(emails[0]!.references).toContain('ref1');
  });

  it('applyEmailQuickAction handles archive and delete', async () => {
    const mockEmail = { id: 'e1', status: 'unread', inboxId: 'u1' };
    const getEmailSpy = vi.spyOn((adapter as any).emailModule, 'getEmailById')
      .mockResolvedValueOnce({ ...mockEmail, status: 'unread' } as any)
      .mockResolvedValueOnce({ ...mockEmail, status: 'archived' } as any); // for delete

    const runSpy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    
    const r1 = await adapter.applyEmailQuickAction('u1' as any, 'e1' as any, 'archive', 'admin' as any);
    expect(r1.updated).toBe(true);
    
    const r2 = await adapter.applyEmailQuickAction('u1' as any, 'e1' as any, 'delete', 'admin' as any);
    expect(r2.updated).toBe(true);
  });
});
