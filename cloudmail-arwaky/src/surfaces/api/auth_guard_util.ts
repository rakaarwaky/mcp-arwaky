// surfaces/api/auth_guard_util.ts
// Helper — extract token, validate session, rate limit check, return userId or null
// Replaces 5-line auth check boilerplate in every protected handler

import type { AgentEnv } from '../../agent/di_container_registry';
import type { AgentOrchestrator } from '../../agent/request_flow_facade';
import type { UserId, AuthToken, ApiKeyId, UserRole } from '../../taxonomy';
import { asRequestCount, asWindowSeconds } from '../../taxonomy';
import { extractToken } from './request_token_util';
import { jsonResponse, errorResponse } from './http_response_util';

export interface AuthResult {
  userId: UserId;
  token: AuthToken;
  role: UserRole;
  apiKeyId?: ApiKeyId;
  rateLimit?: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
}

const authCache = new WeakMap<Request, AuthResult | Response>();

function getRateLimitConfig(env: AgentEnv | undefined): { session: number; apiKey: number } {
  const session = parseInt(env?.RATE_LIMIT_SESSION ?? '60', 10);
  const apiKey = parseInt(env?.RATE_LIMIT_APIKEY ?? '100', 10);
  return {
    session: Number.isFinite(session) && session > 0 ? session : 60,
    apiKey: Number.isFinite(apiKey) && apiKey > 0 ? apiKey : 100,
  };
}

export async function requireAuth(
  request: Request,
  orchestrator: AgentOrchestrator,
  env?: AgentEnv
): Promise<AuthResult | Response> {
  const cached = authCache.get(request);
  if (cached) return cached;

  const result = await _requireAuth(request, orchestrator, env);
  authCache.set(request, result);
  return result;
}

async function _requireAuth(
  request: Request,
  orchestrator: AgentOrchestrator,
  env?: AgentEnv
): Promise<AuthResult | Response> {
  const token = extractToken(request);
  const rateLimits = getRateLimitConfig(env);

  // Try session auth first
  if (token) {
    const session = await orchestrator.validateSession(token);
    if (session && session.userId) {
      const user = await orchestrator.getUser(session.userId);
      if (!user) {
        return errorResponse('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check rate limit for session auth
      const limit = rateLimits.session;
      const rateCheck = await orchestrator.checkRateLimit(
        null,
        session.userId,
        asRequestCount(limit),
        asWindowSeconds(60)
      );
      if (!rateCheck.allowed) {
        const err = errorResponse(
          'Rate limit exceeded. Retry after ' + rateCheck.resetAt,
          429,
          'RATE_LIMIT_EXCEEDED'
        );
        err.headers.set('X-RateLimit-Limit', String(limit));
        err.headers.set('X-RateLimit-Remaining', '0');
        err.headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
        return err;
      }
      await orchestrator.recordRequest(null, session.userId);
      return {
        userId: session.userId,
        token,
        role: user.role,
        rateLimit: {
          limit,
          remaining: rateCheck.remaining,
          resetAt: rateCheck.resetAt
        }
      };
    }

    // Try API key token validation (session tokens starting with 'apikey:')
    const apiKeyResult = await orchestrator.validateApiKeyToken(token);
    if (apiKeyResult.valid && apiKeyResult.apiKeyId && apiKeyResult.userId) {
      const user = await orchestrator.getUser(apiKeyResult.userId);
      if (!user) {
        return errorResponse('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check rate limit for API key auth
      const limit = rateLimits.apiKey;
      const rateCheck = await orchestrator.checkRateLimit(
        apiKeyResult.apiKeyId,
        apiKeyResult.userId,
        asRequestCount(limit),
        asWindowSeconds(60)
      );
      if (!rateCheck.allowed) {
        const err = errorResponse(
          'Rate limit exceeded. Retry after ' + rateCheck.resetAt,
          429,
          'RATE_LIMIT_EXCEEDED'
        );
        err.headers.set('X-RateLimit-Limit', String(limit));
        err.headers.set('X-RateLimit-Remaining', '0');
        err.headers.set('X-RateLimit-Reset', String(rateCheck.resetAt));
        return err;
      }
      await orchestrator.recordRequest(apiKeyResult.apiKeyId, apiKeyResult.userId);
      return {
        userId: apiKeyResult.userId,
        token,
        role: user.role,
        apiKeyId: apiKeyResult.apiKeyId,
        rateLimit: {
          limit,
          remaining: rateCheck.remaining,
          resetAt: rateCheck.resetAt
        }
      };
    }
  }

  return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
}

export function isResponse(value: AuthResult | Response): value is Response {
  return value instanceof Response;
}

export function requireAdmin(auth: AuthResult): Response | null {
  if (auth.role !== 'admin') {
    return errorResponse('Forbidden', 403, 'FORBIDDEN');
  }
  return null;
}

export function authorizeSelfOrAdmin(auth: AuthResult, targetUserId: UserId): Response | null {
  if (auth.userId !== targetUserId && auth.role !== 'admin') {
    return errorResponse('Forbidden', 403, 'FORBIDDEN');
  }
  return null;
}