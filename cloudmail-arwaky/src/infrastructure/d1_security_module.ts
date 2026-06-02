import type { 
  Session, SessionId, CryptoHash, CleanupCount, Timestamp, RequestCount, 
  ApiKey, ApiKeyId, Name, CreatedBy, UserId 
} from '../taxonomy';
import { asCleanupCount, asRequestCount, asTimestamp, asCryptoHash, asApiKeyId, asName, asCreatedBy } from '../taxonomy';
import type { IDatabaseQueryPort } from '../contract';
import { D1RecordAdapter } from './d1_record_adapter';

export class D1SecurityModule {
  constructor(private db: D1Database, private adapter: IDatabaseQueryPort) { }

  // --- Login Sessions ---
  async createLoginSession(session: Session): Promise<void> {
    await this.db.prepare(`
      INSERT INTO login_sessions (id, token_hash, user_id, created_at, expires_at, user_agent, client_ip)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, datetime('now', '+7 day'), ?, ?)
    `).bind(session.id, session.tokenHash, session.userId, session.userAgent, session.clientIp).run();
  }

  async getLoginSessionByTokenHash(tokenHash: CryptoHash): Promise<Session | null> {
    const row = await this.db.prepare(`
      SELECT ls.id, ls.token_hash, ls.user_id, ls.created_at, ls.expires_at, ls.user_agent, ls.client_ip
      FROM login_sessions ls
      WHERE ls.token_hash = ? AND ls.expires_at > CURRENT_TIMESTAMP LIMIT 1
    `).bind(tokenHash).first<Record<string, unknown>>();
    if (!row) return null;
    return D1RecordAdapter.mapSession(row);
  }

  async deleteLoginSession(sessionId: SessionId): Promise<boolean> {
    await this.db.prepare('DELETE FROM login_sessions WHERE id = ?').bind(sessionId).run();
    return true;
  }

  async deleteExpiredSessions(): Promise<CleanupCount> {
    const result = await this.db.prepare(
      "DELETE FROM login_sessions WHERE expires_at <= CURRENT_TIMESTAMP"
    ).run();
    return asCleanupCount(result.meta?.changes ?? 0);
  }

  // --- API Keys ---
  async createApiKeyRecord(id: ApiKeyId, keyHash: CryptoHash, name: Name | null, createdBy: CreatedBy | null): Promise<void> {
    await this.db.prepare(`
      INSERT INTO api_keys (id, key_hash, name, created_by, created_at, revoked_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, NULL)
    `).bind(id, keyHash, name, createdBy).run();
  }

  async getApiKeyByHash(keyHash: CryptoHash): Promise<ApiKey | null> {
    const row = await this.db.prepare(`
      SELECT id, key_hash, name, created_by, created_at, revoked_at
      FROM api_keys WHERE key_hash = ? LIMIT 1
    `).bind(keyHash).first<Record<string, unknown>>();
    if (!row) return null;
    return {
      id: asApiKeyId(String(row.id)),
      keyHash: asCryptoHash(String(row.key_hash)),
      name: row.name ? asName(String(row.name)) : null,
      createdBy: row.created_by ? asCreatedBy(String(row.created_by)) : null,
      createdAt: asTimestamp(String(row.created_at ?? '')),
      revokedAt: row.revoked_at ? asTimestamp(String(row.revoked_at)) : null
    };
  }

  async getApiKeyById(apiKeyId: ApiKeyId): Promise<ApiKey | null> {
    const row = await this.db.prepare(`
      SELECT id, key_hash, name, created_by, created_at, revoked_at
      FROM api_keys WHERE id = ? LIMIT 1
    `).bind(apiKeyId).first<Record<string, unknown>>();
    if (!row) return null;
    return {
      id: asApiKeyId(String(row.id)),
      keyHash: asCryptoHash(String(row.key_hash)),
      name: row.name ? asName(String(row.name)) : null,
      createdBy: row.created_by ? asCreatedBy(String(row.created_by)) : null,
      createdAt: asTimestamp(String(row.created_at ?? '')),
      revokedAt: row.revoked_at ? asTimestamp(String(row.revoked_at)) : null
    };
  }

  async listApiKeys(): Promise<ApiKey[]> {
    const { results } = await this.db.prepare(`
      SELECT id, key_hash, name, created_by, created_at, revoked_at
      FROM api_keys ORDER BY created_at DESC LIMIT 100
    `).all<Record<string, unknown>>();
    return (results ?? []).map(row => ({
      id: asApiKeyId(String(row.id)),
      keyHash: asCryptoHash(String(row.key_hash)),
      name: row.name ? asName(String(row.name)) : null,
      createdBy: row.created_by ? asCreatedBy(String(row.created_by)) : null,
      createdAt: asTimestamp(String(row.created_at ?? '')),
      revokedAt: row.revoked_at ? asTimestamp(String(row.revoked_at)) : null
    }));
  }

  async revokeApiKeyRecord(apiKeyId: ApiKeyId): Promise<void> {
    await this.db.prepare(
      'UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND revoked_at IS NULL'
    ).bind(apiKeyId).run();
  }

  // --- Rate Limiting ---
  async getRequestCountInWindow(apiKeyId: ApiKeyId | null, userId: UserId | null, windowStart: Timestamp): Promise<RequestCount> {
    const conditions: string[] = ['created_at >= ?'];
    const binds: unknown[] = [windowStart];

    if (apiKeyId) { conditions.push('api_key_id = ?'); binds.push(apiKeyId); }
    if (userId) { conditions.push('user_id = ?'); binds.push(userId); }

    const row = await this.db.prepare(
      `SELECT COUNT(*) AS count FROM rate_limits WHERE ${conditions.join(' AND ')}`
    ).bind(...binds).first<Record<string, number>>();

    return asRequestCount(Number(row?.count ?? 0));
  }

  async recordApiRequest(apiKeyId: ApiKeyId | null, userId: UserId | null): Promise<void> {
    await this.db.prepare(`
      INSERT INTO rate_limits (id, api_key_id, user_id, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(crypto.randomUUID(), apiKeyId, userId).run();
  }
}
