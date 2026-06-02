// infrastructure/resilience_breaker_adapter.ts
// Simple Circuit Breaker implementation for protecting external dependencies.

import { CircuitBreakerError } from '../taxonomy/resilience_breaker_error.js';
import { ServiceName, CircuitState, ResilienceBreakerOptions, DEFAULT_RESILIENCE_OPTIONS } from '../taxonomy';


/**
 * Simple Circuit Breaker implementation for protecting external dependencies.
 */
export class ResilienceBreakerAdapter {
  /**
   * NOTE: In a serverless/Worker environment, this state is LOCAL to the isolate
   * and EPHEMERAL. It will reset when the isolate is reclaimed.
   * For cross-isolate state, a Durable Object or external store would be needed.
   */
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastErrorTime?: number;
  private options: ResilienceBreakerOptions;

  constructor(
    private readonly serviceName: ServiceName,
    options: Partial<ResilienceBreakerOptions> = {}
  ) {
    this.options = { ...DEFAULT_RESILIENCE_OPTIONS, ...options };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkState();

    if (this.state === CircuitState.OPEN) {
      throw new CircuitBreakerError(this.serviceName);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private checkState() {
    if (this.state === CircuitState.OPEN && this.lastErrorTime) {
      const now = Date.now();
      if (now - this.lastErrorTime > this.options.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      }
    }
  }

  private onSuccess() {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.minSuccessesForClose) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
      }
    } else if (this.state === CircuitState.CLOSED) {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastErrorTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN || this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    this.checkState();
    return this.state;
  }
}
