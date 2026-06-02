// taxonomy/resilience_breaker_error.ts
// Circuit breaker error (503) — service protection active

import { DomainError } from './domain_base_error';
import { ServiceName } from './text_content_vo';

/**
 * Thrown when a circuit breaker is in OPEN state, preventing calls to a failing service.
 * Standardizes to CIRCUIT_OPEN code with 503 status.
 */
export class CircuitBreakerError extends DomainError {
  /**
   * Name of the service being protected
   */
  public readonly serviceName: ServiceName;

  constructor(serviceName: ServiceName) {
    super('CIRCUIT_OPEN', 503, `Service protection active for: ${serviceName} (Circuit Open)`);
    this.name = 'CircuitBreakerError';
    this.serviceName = serviceName;
  }

  toJSON() {
    return { ...super.toJSON(), serviceName: this.serviceName };
  }
}
