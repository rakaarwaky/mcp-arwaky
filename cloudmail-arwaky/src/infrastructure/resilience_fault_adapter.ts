// infrastructure/fault_injector.ts
// Resilience testing — Fault injection (Chaos Monkey)

import type { AppConfig, FaultId } from '../taxonomy';

export interface IResilienceFaultPort {
  shouldFail(id: FaultId): boolean;
  injectDelay(id: FaultId): Promise<void>;
}

/**
 * Injects random failures and delays based on configuration.
 */
export class ResilienceFaultAdapter implements IResilienceFaultPort {
  constructor(private config: AppConfig) {}

  /**
   * Deterministically or randomly decides if an operation should fail.
   * @param id Identifier for the injection point (e.g., 'db_query')
   */
  shouldFail(id: FaultId): boolean {
    const faultConfig = this.config.resilience?.faultInjection?.[id];
    if (!faultConfig) return false;

    // Fixed failure if configured
    if (faultConfig.enabled && Math.random() < (faultConfig.probability || 0)) {
      return true;
    }

    return false;
  }

  /**
   * Injects a delay if configured.
   * @param id Identifier for the injection point
   */
  async injectDelay(id: FaultId): Promise<void> {
    const faultConfig = this.config.resilience?.faultInjection?.[id];
    if (faultConfig?.delayMs && Math.random() < (faultConfig.delayProbability || 0)) {
      const delay = Math.random() * faultConfig.delayMs;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
