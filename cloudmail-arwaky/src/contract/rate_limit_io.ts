/**
 * @module contract/rate_limit_io
 * @description IO contract for rate limiting operations.
 * Defines check/usage inputs keyed by API key or user ID with sliding window.
 */

import type { ApiKeyId, UserId, RequestCount, Timestamp, WindowSeconds, Allowed } from '../taxonomy';

export interface RateLimitCheckInput { apiKeyId: ApiKeyId | null; userId: UserId | null; limit: RequestCount; windowSeconds: WindowSeconds; }
export interface RateLimitUsageInput { apiKeyId: ApiKeyId | null; userId: UserId | null; windowSeconds: WindowSeconds; }
export interface RateLimitCheckOutput { allowed: Allowed; remaining: RequestCount; resetAt: Timestamp; }
export interface RateLimitUsageOutput { apiKeyId: ApiKeyId | null; userId: UserId | null; requestsInWindow: RequestCount; windowStart: Timestamp; limit: RequestCount; }
