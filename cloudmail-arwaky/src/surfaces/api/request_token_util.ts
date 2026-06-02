// infrastructure/request_token_util.ts
// Shared auth token extraction from request headers/cookies

import type { AuthToken } from '../../taxonomy';

export function extractToken(request: Request): AuthToken | null {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const sessionMatch = cookieHeader.match(/(?:^|;\s*)mailflare_session=([^;]+)/);
  if (sessionMatch) {
    return sessionMatch[1] as AuthToken;
  }

  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7) as AuthToken;
  }

  return null;
}
