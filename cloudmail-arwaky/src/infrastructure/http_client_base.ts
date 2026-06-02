// infrastructure/http_client_base.ts
// Base HTTP client with retry, circuit breaker, and token management.
// Shared by concrete adapters (e.g., HttpClientAdapter).
// This class knows nothing about domain endpoints — only transport.

import type { Url, AuthToken, CorrelationId, HttpMethod, RelativePath } from '../taxonomy';
import { asServiceName, asCorrelationId, asLogMessage, asTimeoutMs, asRetryCount } from '../taxonomy';
import { ResilienceBreakerAdapter } from './resilience_breaker_adapter.js';
import { withRetry } from './resilience_retry_adapter.js';
import { InfrastructureError } from '../taxonomy/platform_failure_error.js';
import { structuredLogger } from './structured_logger_util';

export interface HttpClientConfig {
  baseUrl: Url;
  token?: AuthToken;
  requestId?: CorrelationId;
}

export abstract class HttpClientBase {
  protected baseUrl: Url;
  protected token: AuthToken | null;
  protected requestId: CorrelationId | null;
  protected circuitBreaker: ResilienceBreakerAdapter;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '') as Url;
    this.token = config.token ?? null;
    this.requestId = config.requestId ?? null;
    this.circuitBreaker = new ResilienceBreakerAdapter(asServiceName('Backend API'), {
      failureThreshold: 3,
      resetTimeoutMs: asTimeoutMs(60000)
    });
  }

  setToken(token: AuthToken): void {
    this.token = token;
  }

  /**
   * Low-level HTTP request with circuit breaking and retry logic.
   */
  protected async request<T>(method: HttpMethod, path: RelativePath, body?: unknown): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (this.token) headers['authorization'] = `Bearer ${this.token}`;
        if (this.requestId) headers['x-request-id'] = this.requestId;

        let res: Response;
        try {
          const options: RequestInit = { method, headers };
          if (body && method !== 'GET' && method !== 'HEAD') {
            options.body = JSON.stringify(body);
          }
          res = await fetch(`${this.baseUrl}${path}`, options);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Network error';
          throw new InfrastructureError(`HTTP request failed: ${message}`);
        }

        let data: unknown;
        try {
          data = await res.json();
        } catch {
          throw new InfrastructureError(`HTTP ${res.status}: invalid JSON response`);
        }

        if (!res.ok) {
          const e = data as Record<string, unknown>;
          throw new InfrastructureError(String(e.error ?? `HTTP ${res.status}`));
        }

        structuredLogger.info(asLogMessage(`HTTP ${method} ${path} success`), { status: res.status });
        return data as T;
      }, {
        maxRetries: asRetryCount(2),
        initialDelayMs: asTimeoutMs(500),
        retryOn: (err) => err.message.includes('HTTP request failed') || err.message.includes('invalid JSON response')
      });
    });
  }
}
