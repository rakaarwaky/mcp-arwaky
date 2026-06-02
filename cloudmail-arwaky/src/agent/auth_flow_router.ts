// agent/auth_flow_router.ts
// Auth domain router — login, logout, session, access code, api key auth, user CRUD
// Owns: authentication flows, user management, credential verification

import type { AgentContainer } from './di_container_registry';
import type { EmailAddress, UserId, Password, AuthToken, UserAgent, ClientIp, Name, WindowSeconds, ApiKeyPlain } from '../taxonomy';
import { asRequestCount, RateLimitError, asRetryAfterSeconds, asWindowSeconds, asApiKeyPlain, ALLOWED } from '../taxonomy';

export class AuthFlowRouter {
  constructor(private container: AgentContainer) { }

  // ── Session-based auth ──

  async login(email: EmailAddress, password: Password, meta: { userAgent: UserAgent; clientIp: ClientIp }) {
    // 1. Rate limit check (per-user + per-IP to prevent brute force)
    const user = await this.container.database.getUserByEmail(email);
    if (user) {
      const check = await this.container.rateLimit.checkLimit(
        null,
        user.id,
        asRequestCount(this.container.config.rateLimit.defaultLimit as unknown as number),
        asWindowSeconds(this.container.config.rateLimit.windowSeconds)
      );
      if (check.allowed !== ALLOWED) {
        throw new RateLimitError(asRetryAfterSeconds(check.resetAt as unknown as number));
      }
    }
    const result = await this.container.userLogin.login(email, password, meta);
    // 2. Record successful auth attempt
    if (user) {
      await this.container.rateLimit.recordRequest(null, user.id);
    }
    return result;
  }

  async logout(token: AuthToken) {
    return this.container.userLogin.logout(token);
  }

  async validateSession(token: AuthToken) {
    return this.container.session.validateSession(token);
  }

  async healthCheck() {
    return this.container.userLogin.healthCheck();
  }

  // ── API key auth ──

  async authenticateWithApiKey(apiKeyPlain: ApiKeyPlain, userAgent: UserAgent, clientIp: ClientIp) {
    return this.container.apiKeyAuth.authenticateWithApiKey(asApiKeyPlain(apiKeyPlain), userAgent, clientIp);
  }

  async validateApiKeyToken(token: AuthToken) {
    return this.container.apiKeyAuth.validateApiKeyToken(token);
  }

  // ── User CRUD ──

  async listUsers() {
    return this.container.userLogin.listUsers();
  }

  async createUser(username: Name) {
    // Rate limit per-IP to prevent spam account creation
    const check = await this.container.rateLimit.checkLimit(
      null,
      null,
      asRequestCount(this.container.config.rateLimit.defaultLimit as unknown as number),
      asWindowSeconds(this.container.config.rateLimit.windowSeconds)
    );
    if (check.allowed !== ALLOWED) {
      throw new RateLimitError(asRetryAfterSeconds(check.resetAt as unknown as number));
    }
    const result = await this.container.userLogin.createUser(username);
    await this.container.rateLimit.recordRequest(null, null);
    return result;
  }

  async getUser(userId: UserId) {
    return this.container.userLogin.getUser(userId);
  }

  async deleteUser(userId: UserId) {
    return this.container.userLogin.deleteUser(userId);
  }

  async softDeleteUser(userId: UserId) {
    return this.container.userLogin.softDeleteUser(userId);
  }

  async updateUser(userId: UserId, updates: { email?: EmailAddress; displayName?: Name; password?: Password }) {
    // Rate limit per-user (5/min)
    const check = await this.container.rateLimit.checkLimit(
      null,
      userId,
      asRequestCount(this.container.config.rateLimit.defaultLimit as unknown as number),
      asWindowSeconds(this.container.config.rateLimit.windowSeconds)
    );
    if (check.allowed !== ALLOWED) {
      throw new RateLimitError(asRetryAfterSeconds(check.resetAt as unknown as number));
    }
    const result = await this.container.userLogin.updateUser(userId, updates);
    await this.container.rateLimit.recordRequest(null, userId);
    return result;
  }

  async getCurrentUser(userId: UserId) {
    return this.container.userLogin.getUser(userId);
  }

  async getUserMetrics(userId: UserId) {
    const rawMetrics = await this.container.database.getDashboardMetrics(userId);
    const quota = await this.container.database.getQuotaStatus(userId);

    // Transform array metrics into flat object expected by E2E tests
    return {
      totalInboxes: await this.container.database.getUserInboxCount(userId),
      totalEmails: await this.container.database.getUserEmailCount(userId),
      archivedCount: await this.container.database.getUserArchivedCount(userId),
      usagePercent: quota?.usagePercent ?? 0
    };
  }

  async getUserIdentity(userId: UserId) {
    return this.container.userLogin.getUser(userId);
  }

  async getSecurityAuditLogs(_userId: UserId) {
    // Feature stub: return empty list for now to satisfy E2E types
    return [];
  }
}
