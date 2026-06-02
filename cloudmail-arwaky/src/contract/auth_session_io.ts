// contract/auth_session_io.ts
// Authentication — login, logout, health

import type { EmailAddress, Password, UserAgent, ClientIp, AuthToken, Session, HealthStatus, Timestamp, ApiOperationSuccess } from '../taxonomy';

export interface AuthLoginInput { email: EmailAddress; password: Password; userAgent: UserAgent; clientIp: ClientIp; }
export interface AuthLogoutInput { token: AuthToken; }
export interface AuthHealthInput {}
export interface AuthLoginOutput {
  token?: AuthToken;
  session?: Session;
  ok?: ApiOperationSuccess;
  message?: string;
  error?: string;
  values?: { email: string };
}
export interface AuthLogoutOutput { ok?: ApiOperationSuccess; message?: string; error?: string; }
export interface AuthHealthOutput { status: HealthStatus; timestamp: Timestamp; ok?: ApiOperationSuccess; }
