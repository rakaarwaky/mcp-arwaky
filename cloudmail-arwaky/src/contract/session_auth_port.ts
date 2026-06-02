// contract/session_auth_port.ts
import type { Session, UserId, EmailAddress, AuthToken, CookieName, SessionMaxAge, DeleteResult, UserRole } from '../taxonomy';
import type { UserAgent, ClientIp } from '../taxonomy';

export interface SessionResult {
  userId: UserId;
  email: EmailAddress;
  role: UserRole;
}

export interface ISessionAuthPort {
  createSession(userId: UserId, meta: { userAgent: UserAgent; clientIp: ClientIp }): Promise<{ token: AuthToken; session: Session }>;
  validateSession(token: AuthToken): Promise<SessionResult | null>;
  destroySession(token: AuthToken): Promise<DeleteResult>;
  extractClientIp(request: Request): ClientIp;
  getCookieName(): CookieName;
  getMaxAgeSeconds(): SessionMaxAge;
}
