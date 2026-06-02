// infrastructure/session_auth_adapter.ts
// Implements ISessionAuthPort — taxonomy-aligned Session type

import type { Session, UserId, AuthToken, CookieName, SessionMaxAge, DeleteResult, RawText, ByteLength, UserRole } from '../taxonomy';
import type { UserAgent, ClientIp, CryptoHash, SessionId } from '../taxonomy';
import type { ISessionAuthPort, SessionResult } from '../contract';
import type { CryptoPasswordAdapter } from './crypto_password_adapter';
import { createEmailAddress, asUserRole, asAuthToken, asClientIp } from '../taxonomy';
import { asCryptoHash, asSessionId, asUserId, asTimestamp } from '../taxonomy';

const SESSION_COOKIE_NAME = 'mailflare_session' as CookieName;
const DEFAULT_SESSION_MAX_AGE = 604800; // 7 days
const META_UA_LIMIT = 255 as ByteLength;
const META_IP_LIMIT = 64 as ByteLength;

import { getConfig } from './config_loader_adapter';
const CONFIG = getConfig();
const RAW_MAX_AGE = Number(CONFIG.session?.maxAgeSeconds ?? DEFAULT_SESSION_MAX_AGE);
const SESSION_MAX_AGE_SECONDS = (isNaN(RAW_MAX_AGE) || RAW_MAX_AGE <= 0 ? DEFAULT_SESSION_MAX_AGE : RAW_MAX_AGE) as SessionMaxAge;

function normalizeMeta(value: RawText | null, limit: ByteLength): RawText {
  return (value ?? '').trim().slice(0, limit) as RawText;
}

export class SessionAuthAdapter implements ISessionAuthPort {
  constructor(
    private db: D1Database,
    private crypto: CryptoPasswordAdapter
  ) {}

  async createSession(userId: UserId, meta: { userAgent: UserAgent; clientIp: ClientIp }): Promise<{ token: AuthToken; session: Session }> {
    const token = this.crypto.randomToken();
    const tokenHash = await this.crypto.sha256Hex(asCryptoHash(token));
    const sessionId = crypto.randomUUID() as SessionId;

    await this.db.prepare(`
      INSERT INTO login_sessions (id, token_hash, user_id, created_at, expires_at, user_agent, client_ip)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, datetime('now', '+' || ? || ' second'), ?, ?)
    `).bind(
      sessionId, tokenHash, userId,
      Number(SESSION_MAX_AGE_SECONDS),
      normalizeMeta(meta.userAgent as string as RawText, META_UA_LIMIT),
      normalizeMeta(meta.clientIp as string as RawText, META_IP_LIMIT)
    ).run();

    const session: Session = {
      id: sessionId,
      type: 'login' as const,
      tokenHash: tokenHash,
      userId,
      createdAt: asTimestamp(new Date().toISOString()),
      expiresAt: asTimestamp(new Date(Date.now() + Number(SESSION_MAX_AGE_SECONDS) * 1000).toISOString()),
      revokedAt: null,
      userAgent: meta.userAgent,
      clientIp: meta.clientIp
    };

    return { token, session };
  }

  async validateSession(token: AuthToken): Promise<SessionResult | null> {
    const normalized = token.trim();
    if (!normalized) return null;

    const tokenHash = await this.crypto.sha256Hex(asCryptoHash(normalized));
    const row = await this.db.prepare(`
      WITH owner AS (SELECT id AS owner_id FROM users ORDER BY created_at ASC, id ASC LIMIT 1)
      SELECT ls.user_id, u.email, COALESCE(u.role, 'agent') AS role,
        CASE WHEN ls.user_id = (SELECT owner_id FROM owner) THEN 'admin' ELSE COALESCE(u.role, 'agent') END AS effective_role
      FROM login_sessions ls JOIN users u ON u.id = ls.user_id
      WHERE ls.token_hash = ? AND ls.expires_at > CURRENT_TIMESTAMP LIMIT 1
    `).bind(tokenHash).first<Record<string, unknown>>();

    if (!row) return null;
    return {
      userId: asUserId(String(row.user_id)),
      email: createEmailAddress(String(row.email)),
      role: asUserRole(String(row.effective_role || 'agent'))
    };
  }

  async destroySession(token: AuthToken): Promise<DeleteResult> {
    const normalized = token.trim();
    if (!normalized) return false as DeleteResult;
    const tokenHash = await this.crypto.sha256Hex(asCryptoHash(normalized));
    await this.db.prepare('DELETE FROM login_sessions WHERE token_hash = ?').bind(tokenHash).run();
    return true as DeleteResult;
  }

  extractClientIp(request: Request): ClientIp {
    const cfIp = request.headers.get('cf-connecting-ip');
    if (cfIp) return asClientIp(normalizeMeta(cfIp as RawText, META_IP_LIMIT));
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return asClientIp(normalizeMeta((forwarded.split(',')[0]?.trim() ?? '') as RawText, META_IP_LIMIT));
    return asClientIp('');
  }

  getCookieName(): CookieName { return SESSION_COOKIE_NAME; }
  getMaxAgeSeconds(): SessionMaxAge { return SESSION_MAX_AGE_SECONDS; }
}
