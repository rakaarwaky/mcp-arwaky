import { describe, it, expect, vi, beforeEach } from 'vitest';
import { D1DatabaseAdapter } from '../../src/infrastructure/d1_database_adapter';
import { createEmailAddress, asTimestamp } from '../../src/taxonomy';

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

describe('infrastructure: D1DatabaseAdapter Password Storage', () => {
  let db: MockD1Database;
  let adapter: D1DatabaseAdapter;

  beforeEach(() => {
    db = new MockD1Database();
    adapter = new D1DatabaseAdapter(db as any);
    vi.restoreAllMocks();
  });

  it('createAccountRecord binds password correctly', async () => {
    const runSpy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    const bindSpy = vi.spyOn(MockD1PreparedStatement.prototype, 'bind');

    await adapter.createAccountRecord(
      'acc-1' as any,
      'inbox-1' as any,
      'openrouter' as any,
      createEmailAddress('t@t.com'),
      '2025-12-31' as any,
      'plain-password'   // password provided, no apiKey
    );

    // Expect 8 bound values: id, inboxId, provider, status, targetEmail, password (encrypted), apiKey (null), expiresAt
    expect(bindSpy).toHaveBeenCalledWith(
      'acc-1',
      'inbox-1',
      'openrouter',
      'pending',          // status derived when apiKey absent
      't@t.com',
      expect.any(String), // encryptedPassword (result of crypto.encrypt)
      null,              // encryptedApiKey = null when apiKey not provided
      '2025-12-31'
    );
  });

  it('createAccountRecord sets status=key_extracted when apiKey provided', async () => {
    const runSpy = vi.spyOn(MockD1PreparedStatement.prototype, 'run').mockResolvedValue({ meta: { changes: 1 } });
    const bindSpy = vi.spyOn(MockD1PreparedStatement.prototype, 'bind');

    await adapter.createAccountRecord(
      'acc-2' as any,
      'inbox-2' as any,
      'openrouter' as any,
      createEmailAddress('t2@t.com'),
      '2025-12-31' as any,
      'plain-password',
      'sk-test-key'      // apiKey provided
    );

    // Expect status = 'key_extracted' and encrypted apiKey bound
    expect(bindSpy).toHaveBeenCalledWith(
      'acc-2',
      'inbox-2',
      'openrouter',
      'key_extracted',   // status when apiKey present
      't2@t.com',
      expect.any(String), // encryptedPassword
      expect.any(String), // encryptedApiKey
      '2025-12-31'
    );
  });

  it('getAccountById maps password from database row', async () => {
    const mockRow = {
      id: 'acc-1',
      inbox_id: 'inbox-1',
      provider: 'openrouter',
      status: 'pending',
      target_email: 't@t.com',
      password: 'saved-password',
      created_at: '2025-01-01T00:00:00Z',
      expires_at: '2025-12-31T23:59:59Z'
    };
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue(mockRow);

    const acc = await adapter.getAccountById('acc-1' as any);
    expect(acc?.password).toBe('saved-password');
  });

  it('getAccountById handles null password', async () => {
    const mockRow = {
      id: 'acc-2',
      inbox_id: 'inbox-2',
      provider: 'openrouter',
      status: 'pending',
      target_email: 't2@t.com',
      password: null,
      created_at: '2025-01-01T00:00:00Z',
      expires_at: '2025-12-31T23:59:59Z'
    };
    vi.spyOn(MockD1PreparedStatement.prototype, 'first').mockResolvedValue(mockRow);

    const acc = await adapter.getAccountById('acc-2' as any);
    expect(acc?.password).toBeNull();
  });
});
