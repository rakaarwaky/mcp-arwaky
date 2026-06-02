// taxonomy/health_status_vo.ts
// Health status types for system health checks

export type HealthStatus = string & { readonly __brand: 'HealthStatus' };
export type Reason = string & { readonly __brand: 'Reason' };

/**
 * Validates and creates a HealthStatus.
 * Accepts: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
 */
export function asHealthStatus(s: string): HealthStatus {
  const valid = ['healthy', 'degraded', 'unhealthy', 'unknown'];
  if (!valid.includes(s)) {
    throw new Error(`Invalid health status: ${s}. Must be one of ${valid.join(', ')}`);
  }
  return s as HealthStatus;
}

export const HEALTHY = asHealthStatus('healthy');
export const DEGRADED = asHealthStatus('degraded');
export const UNHEALTHY = asHealthStatus('unhealthy');
export const UNKNOWN = asHealthStatus('unknown');

/**
 * Creates a Reason branded string (unvalidated free-text)
 */
export function asReason(s: string): Reason { return s as Reason; }
