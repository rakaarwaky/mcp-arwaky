// taxonomy/platform_failure_error.ts
// Infrastructure error (503) — failure in external port/adapter

import { DomainError } from './domain_base_error';
import type { Timestamp } from './timestamp_epoch_vo';

/**
 * Thrown when an external infrastructure component (database, external API, file system) fails.
 * Standardizes to INFRASTRUCTURE_ERROR code with 503 status.
 */
export class InfrastructureError extends DomainError {
  /**
   * Additional technical details about the failure (optional)
   */
  public readonly details: any;

  /** When the failure occurred */
  public readonly timestamp: Timestamp;

  constructor(message: string, details: any = null) {
    super('INFRASTRUCTURE_ERROR', 503, message);
    this.name = 'InfrastructureError';
    this.details = details;
    this.timestamp = new Date().toISOString() as Timestamp;
  }

  toJSON() {
    return { ...super.toJSON(), details: this.details };
  }
}
