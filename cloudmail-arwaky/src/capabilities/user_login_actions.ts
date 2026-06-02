// capabilities/user_login_actions.ts
// Implements IAuthProtocol + IUserManageProtocol — taxonomy-aligned

import type {
  User, UserId, Session, AuthToken, Name, UserAgent, ClientIp,
  Timestamp, HealthStatus, DeleteResult, SoftDeleteResult, EmailAddress, Password, CryptoHash, DisplayName,
} from '../taxonomy';
import {
  createEmailAddress, asDisplayName, asHealthStatus, asTimestamp, asCryptoHash,
  AuthUnauthorizedError, ValidationFieldError, asFieldName, asLogMessage, asIpAddress, asServiceName, asAction
} from '../taxonomy';
import { getConfig } from '../infrastructure/config_loader_adapter';
import type { IAuthProtocol, IUserManageProtocol, AuthLoginOutput } from '../contract';
import type { IDatabaseQueryPort, IPasswordHashPort, ISessionAuthPort, IMetricsCollectorPort, IAppLoggerPort } from '../contract';
import { AuditLogActions } from './audit_log_actions';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

/**
 * Capability for user authentication and identity management.
 * Handles login, logout, and CRUD operations for user accounts.
 */
export class UserLoginActions implements IAuthProtocol, IUserManageProtocol {
  constructor(
    private db: IDatabaseQueryPort,
    private passwordHash: IPasswordHashPort,
    private sessionAuth: ISessionAuthPort,
    private auditLog: AuditLogActions,
    private metrics: IMetricsCollectorPort,
    private logger: IAppLoggerPort
  ) { }

  // ── IAuthProtocol ──

  async login(email: EmailAddress, password: Password, meta: { userAgent: UserAgent; clientIp: ClientIp }): Promise<AuthLoginOutput> {
    return withMetrics(this.metrics, asServiceName('auth'), asAction('login'), async () => {
      this.logger.info(asLogMessage('User login attempt'), { email: email.full, ip: meta.clientIp });
      const user = await this.db.getUserByEmail(email);
      if (!user) {
        this.logger.warn(asLogMessage('Login failed: user not found'), { email: email.full });
        await this.auditLog.logEvent({
          eventType: 'user_login',
          userId: null,
          ipAddress: asIpAddress(meta.clientIp),
          userAgent: meta.userAgent,
          metadata: { email: email.full, success: false, reason: 'user_not_found' }
        });
        throw new AuthUnauthorizedError('Invalid email or password');
      }
      if (!user.passwordHash) {
        this.logger.warn(asLogMessage('Login failed: password login disabled'), { userId: user.id });
        throw new AuthUnauthorizedError('Password login disabled for this user');
      }
      const valid = await this.passwordHash.verifyPassword(password, user.passwordHash);
      if (!valid) {
        this.logger.warn(asLogMessage('Login failed: invalid password'), { userId: user.id });
        await this.auditLog.logEvent({
          eventType: 'user_login',
          userId: user.id,
          ipAddress: asIpAddress(meta.clientIp),
          userAgent: meta.userAgent,
          metadata: { email: email.full, success: false, reason: 'invalid_password' }
        });
        throw new AuthUnauthorizedError('Invalid email or password');
      }
      const result = await this.sessionAuth.createSession(user.id, meta);
      this.logger.info(asLogMessage('User login successful'), { userId: user.id, sessionId: result.session.id });
      await this.auditLog.logEvent({
        eventType: 'user_login',
        userId: user.id,
        ipAddress: asIpAddress(meta.clientIp),
        userAgent: meta.userAgent,
        metadata: { email: email.full, success: true, sessionId: result.session.id }
      });
      return result;
    });
  }

  /**
   * Destroys an active session by token.
   * Records the logout event in the audit log.
   * 
   * @param token The authentication token to revoke
   */
  async logout(token: AuthToken): Promise<void> {
    return withMetrics(this.metrics, asServiceName('auth'), asAction('logout'), async () => {
      this.logger.info(asLogMessage('User logout requested'));
      // Get session info before destroying for audit log
      const tokenHash = await this.passwordHash.sha256Hex(asCryptoHash(token));
      const session = await this.db.getLoginSessionByTokenHash(tokenHash);

      await this.sessionAuth.destroySession(token);

      if (session) {
        this.logger.info(asLogMessage('User logout successful'), { userId: session.userId });
        await this.auditLog.logEvent({
          eventType: 'user_logout',
          userId: session.userId,
          metadata: { sessionId: session.id }
        });
      }
    });
  }

  /**
   * Performs a basic health check of the authentication system.
   */
  async healthCheck(): Promise<{ status: HealthStatus; timestamp: Timestamp }> {
    return withMetrics(this.metrics, asServiceName('auth'), asAction('healthCheck'), async () => {
      return {
        status: asHealthStatus('healthy'),
        timestamp: asTimestamp(new Date().toISOString())
      };
    });
  }

  // ── IUserManageProtocol ──

  /**
   * Lists all registered users in the system.
   * Note: For security, sensitive fields should be sanitized by the caller.
   */
  async listUsers(): Promise<User[]> {
    return withMetrics(this.metrics, asServiceName('auth'), asAction('listUsers'), async () => {
      return this.db.getUsers();
    });
  }

  /**
   * Creates a new user identity with generated credentials.
   * 
   * @param username The desired handle (will be converted to lowercase)
   * @returns The created user object and initial plaintext credentials
   */
  async createUser(username: Name): Promise<{ user: User; credentials: { username: Name; email: EmailAddress; password: Password } }> {
    return withMetrics(this.metrics, asServiceName('auth'), asAction('createUser'), async () => {
      const displayName = String(username).trim().toLowerCase();
      this.validateUsername(displayName);

      const email = createEmailAddress(`${displayName}@${getConfig().email.defaultDomain}`);
      const password = this.passwordHash.generateSecurePassword();
      const passwordHashValue = await this.passwordHash.hashPassword(password);
      const user = await this.db.createUser({
        email,
        displayName: asDisplayName(displayName),
        passwordHash: passwordHashValue
      });

      // Audit log
      await this.auditLog.logEvent({
        eventType: 'user_created',
        userId: user.id,
        metadata: { email: email.full, displayName: displayName }
      });

      return { user, credentials: { username, email, password } };
    });
  }

  /**
   * Retrieves a specific user by their unique ID.
   */
  async getUser(userId: UserId): Promise<User | null> {
    return withMetrics(this.metrics, asServiceName('auth'), asAction('getUser'), async () => {
      return this.db.getUserById(userId);
    });
  }

  /**
   * Completely purges a user identity from the system.
   * Will fail if the user is the system owner.
   */
  async deleteUser(userId: UserId): Promise<DeleteResult> {
    return withMetrics(this.metrics, asServiceName('auth'), asAction('deleteUser'), async () => {
      const user = await this.db.getUserById(userId);
      if (user?.isOwner) throw new AuthUnauthorizedError('Protection Fault: System owner identity cannot be purged.');
      const result = await this.db.deleteUser(userId);
      if (result) {
        await this.auditLog.logEvent({
          eventType: 'user_deleted',
          userId: userId,
          metadata: { email: user?.email.full }
        });
      }
      return result;
    });
  }

  /**
   * Revokes a user's access without deleting their records immediately.
   */
  async softDeleteUser(userId: UserId): Promise<SoftDeleteResult> {
    return withMetrics(this.metrics, asServiceName('auth'), asAction('softDeleteUser'), async () => {
      const user = await this.db.getUserById(userId);
      if (user?.isOwner) throw new AuthUnauthorizedError('Protection Fault: System owner access cannot be revoked.');
      const result = await this.db.softDeleteUser(userId);
      if (result.deleted) {
        await this.auditLog.logEvent({
          eventType: 'user_deleted',
          userId: userId,
          metadata: { email: user?.email.full, reason: result.deleted ? 'soft_delete' : 'unknown' }
        });
      }
      return result;
    });
  }

  /**
   * Updates user profile fields or rotates their password.
   */
  async updateUser(userId: UserId, updates: { email?: EmailAddress; displayName?: Name; password?: Password }): Promise<User | null> {
    return withMetrics(this.metrics, asServiceName('auth'), asAction('updateUser'), async () => {
      const dbUpdates: { email?: EmailAddress; displayName?: DisplayName } = {};

      if (updates.displayName) {
        const displayName = String(updates.displayName).trim();
        this.validateDisplayName(displayName);
        dbUpdates.displayName = asDisplayName(displayName);
      }

      if (updates.email) dbUpdates.email = updates.email;

      if (dbUpdates.email || dbUpdates.displayName) {
        await this.db.updateUser(userId, dbUpdates);
      }

      if (updates.password) {
        this.validatePassword(String(updates.password));
        const hash: CryptoHash = await this.passwordHash.hashPassword(updates.password);
        await this.db.updateUserPassword(userId, hash);
      }
      return this.db.getUserById(userId);
    });
  }

  // ── Internal Validation ──

  /**
   * Validates that a username follows security and format rules.
   * Rules: Alphanumeric (plus underscores), 3-20 characters.
   */
  private validateUsername(username: string): void {
    if (!username) {
      throw new ValidationFieldError(asFieldName('username'), 'Username is required');
    }
    const alphanumericRegex = /^[a-zA-Z0-9_]+$/;
    if (!alphanumericRegex.test(username)) {
      throw new ValidationFieldError(asFieldName('username'), 'Username must be alphanumeric (underscores allowed)');
    }
    if (username.length < 3 || username.length > 20) {
      throw new ValidationFieldError(asFieldName('username'), 'Username must be between 3 and 20 characters');
    }
  }

  /**
   * Validates display name format.
   * Rules: 1-100 characters, any printable characters allowed.
   */
  private validateDisplayName(displayName: string): void {
    if (!displayName) {
      throw new ValidationFieldError(asFieldName('displayName'), 'Display name is required');
    }
    const trimmed = displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 100) {
      throw new ValidationFieldError(asFieldName('displayName'), 'Display name must be between 1 and 100 characters');
    }
  }

  /**
   * Validates password strength.
   * Rules: Min 8 characters, must have uppercase, lowercase, and numbers.
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationFieldError(asFieldName('password'), 'Password must be at least 8 characters long');
    }
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      throw new ValidationFieldError(asFieldName('password'), 'Password must contain uppercase, lowercase, and numbers');
    }
  }
}
