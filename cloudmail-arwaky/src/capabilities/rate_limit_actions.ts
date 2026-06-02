// capabilities/rate_limit_actions.ts
// Implements IRateLimitProtocol — request rate limiting per API key/user

import {
  ApiKeyId, UserId, RequestCount, Timestamp, WindowSeconds, Allowed,
  asTimestamp, asRequestCount, asAllowed, asServiceName, asAction
} from '../taxonomy';
import type {
  IRateLimitProtocol,
  RateLimitState,
  IDatabaseQueryPort,
  IMetricsCollectorPort
} from '../contract';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';

function windowStart(windowSeconds: number): Timestamp {
  return asTimestamp(new Date(Date.now() - windowSeconds * 1000).toISOString());
}

export class RateLimitActions implements IRateLimitProtocol {
  constructor(
    private db: IDatabaseQueryPort,
    private metrics: IMetricsCollectorPort
  ) {}

  async checkLimit(
    apiKeyId: ApiKeyId | null,
    userId: UserId | null,
    limit: RequestCount,
    windowSeconds: WindowSeconds
  ): Promise<{ allowed: Allowed; remaining: RequestCount; resetAt: Timestamp }> {
    return withMetrics(this.metrics, asServiceName('rate_limit'), asAction('checkLimit'), async () => {
      const windowStartTs = windowStart(windowSeconds);
      const requestsInWindow = await this.db.getRequestCountInWindow(
        apiKeyId,
        userId,
        windowStartTs
      );

      const allowed = asAllowed(requestsInWindow < limit);
      const remaining = asRequestCount(Math.max(0, limit - requestsInWindow));
      const resetAt = asTimestamp(new Date(Date.now() + windowSeconds * 1000).toISOString());

      return { allowed, remaining, resetAt };
    });
  }

  async recordRequest(
    apiKeyId: ApiKeyId | null,
    userId: UserId | null
  ): Promise<void> {
    return withMetrics(this.metrics, asServiceName('rate_limit'), asAction('recordRequest'), async () => {
      await this.db.recordApiRequest(
        apiKeyId,
        userId
      );
    });
  }

  async getCurrentUsage(
    apiKeyId: ApiKeyId | null,
    userId: UserId | null,
    windowSeconds: WindowSeconds
  ): Promise<RateLimitState | null> {
    return withMetrics(this.metrics, asServiceName('rate_limit'), asAction('getCurrentUsage'), async () => {
      const windowStartTs = windowStart(windowSeconds);
      const requestsInWindow = await this.db.getRequestCountInWindow(
        apiKeyId,
        userId,
        windowStartTs
      );

      return {
        apiKeyId,
        userId,
        requestsInWindow: asRequestCount(requestsInWindow),
        windowStart: windowStartTs,
        limit: asRequestCount(0) // limit is not stored, it's provided at check time
      };
    });
  }
}
