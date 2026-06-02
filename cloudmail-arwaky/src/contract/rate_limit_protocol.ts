// contract/rate_limit_protocol.ts
// Protocol for rate limiting — Phase 3 Multi-Agent Support

import type { ApiKeyId, UserId, RequestCount, Timestamp, WindowSeconds, Allowed } from '../taxonomy';

export interface RateLimitState {
  apiKeyId: ApiKeyId | null;
  userId: UserId | null;
  requestsInWindow: RequestCount;
  windowStart: Timestamp;
  limit: RequestCount;
}

export interface IRateLimitProtocol {
  checkLimit(apiKeyId: ApiKeyId | null, userId: UserId | null, limit: RequestCount, windowSeconds: WindowSeconds): Promise<{ allowed: Allowed; remaining: RequestCount; resetAt: Timestamp }>;
  recordRequest(apiKeyId: ApiKeyId | null, userId: UserId | null): Promise<void>;
  getCurrentUsage(apiKeyId: ApiKeyId | null, userId: UserId | null, windowSeconds: WindowSeconds): Promise<RateLimitState | null>;
}
