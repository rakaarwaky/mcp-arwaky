import type { 
  User, UserId, EmailAddress, DisplayName, CryptoHash, DeleteResult, SoftDeleteResult 
} from '../taxonomy';
import type { IDatabaseQueryPort, CreateUserInput } from '../contract';
import { D1RecordAdapter } from './d1_record_adapter';
import { InfrastructureError } from '../taxonomy/platform_failure_error.js';

const USER_COLS = 'id, email, display_name, role, password_hash, is_owner, created_at, updated_at';

export class D1UserModule {
  constructor(private db: D1Database, private adapter: IDatabaseQueryPort) { }

  async getUsers(): Promise<User[]> {
    const { results } = await this.db.prepare(`
      SELECT ${USER_COLS}
      FROM users ORDER BY created_at DESC, id DESC LIMIT 100
    `).all<Record<string, unknown>>();
    return (results ?? []).map((row) => D1RecordAdapter.mapUser(row));
  }

  async getUserById(userId: UserId): Promise<User | null> {
    const row = await this.db.prepare(`
      SELECT ${USER_COLS}
      FROM users WHERE id = ? LIMIT 1
    `).bind(userId).first<Record<string, unknown>>();
    return row ? D1RecordAdapter.mapUser(row) : null;
  }

  async getUserByEmail(email: EmailAddress): Promise<User | null> {
    const row = await this.db.prepare(`
      SELECT ${USER_COLS}
      FROM users WHERE lower(email) = lower(?) LIMIT 1
    `).bind(email.full).first<Record<string, unknown>>();
    return row ? D1RecordAdapter.mapUser(row) : null;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const id = crypto.randomUUID() as UserId;
    const { success } = await this.db.prepare(`INSERT OR IGNORE INTO users (id, email, display_name, role, password_hash, is_owner, created_at, updated_at)
      VALUES (?, ?, ?, 'user', ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(id, input.email.full, input.displayName ?? null, input.passwordHash ?? null).run();
    // If the row already existed (conflict on email), fall through to fetch-by-email.
    // If inserted, success === 1 changes; if ignored, success === 0.
    const row = await this.db.prepare('SELECT * FROM users WHERE email = ?').bind(input.email.full).first<Record<string, unknown>>();
    if (!row) throw new InfrastructureError('Failed to create user');
    return D1RecordAdapter.mapUser(row);
  }

  async deleteUser(userId: UserId): Promise<DeleteResult> {
    const userRow = await this.db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first<Record<string, unknown>>();
    if (!userRow) return false as DeleteResult;
    
    // Cross-module logic using adapter
    const emailCount = await this.db.prepare('SELECT COUNT(*) AS count FROM emails WHERE inbox_id = ?').bind(userId).first<Record<string, number>>();
    const sessionCount = await this.db.prepare('SELECT COUNT(*) AS count FROM login_sessions WHERE user_id = ?').bind(userId).first<Record<string, number>>();
    
    if ((emailCount?.count ?? 0) > 0 || (sessionCount?.count ?? 0) > 0) return false as DeleteResult;
    
    await this.db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
    return true as DeleteResult;
  }

  async softDeleteUser(userId: UserId): Promise<SoftDeleteResult> {
    const row = await this.db.prepare(`
      SELECT ${USER_COLS}
      FROM users WHERE id = ? LIMIT 1
    `).bind(userId).first<Record<string, unknown>>();

    if (!row) return { deleted: false, reason: 'not_found' };

    const user = D1RecordAdapter.mapUser(row);
    const isOwner = user.isOwner;
    if (isOwner) return { deleted: false, reason: 'protected_owner' };

    await this.db.prepare('DELETE FROM email_status_history WHERE email_id IN (SELECT id FROM emails WHERE inbox_id = ?)').bind(userId).run().catch(() => { });
    await this.db.prepare('DELETE FROM emails WHERE inbox_id = ?').bind(userId).run();
    await this.db.prepare('DELETE FROM login_sessions WHERE user_id = ?').bind(userId).run();
    await this.db.prepare('DELETE FROM accounts WHERE inbox_id = ?').bind(userId).run().catch(() => { });
    await this.db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    return { deleted: true };
  }

  async updateUser(userId: UserId, updates: { email?: EmailAddress; displayName?: DisplayName }): Promise<void> {
    const sets: string[] = [];
    const binds: unknown[] = [];
    if (updates.email) { sets.push('email = ?'); binds.push(updates.email.full); }
    if (updates.displayName) { sets.push('display_name = ?'); binds.push(updates.displayName); }
    if (sets.length === 0) return;
    sets.push('updated_at = CURRENT_TIMESTAMP');
    binds.push(userId);
    await this.db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  }

  async updateUserPassword(userId: UserId, passwordHash: CryptoHash): Promise<void> {
    await this.db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(passwordHash, userId).run();
  }
}
