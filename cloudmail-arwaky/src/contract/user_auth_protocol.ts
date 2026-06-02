// contract/user_auth_protocol.ts
// Protocol for authentication operations (split from IUserLoginProtocol)

import type { EmailAddress, Password, UserAgent, ClientIp, AuthToken, Timestamp, HealthStatus } from '../taxonomy';
import type { AuthLoginOutput } from './auth_session_io';

export interface IAuthProtocol {
  login(email: EmailAddress, password: Password, meta: { userAgent: UserAgent; clientIp: ClientIp }): Promise<AuthLoginOutput>;
  logout(token: AuthToken): Promise<void>;
  healthCheck(): Promise<{ status: HealthStatus; timestamp: Timestamp }>;
}
