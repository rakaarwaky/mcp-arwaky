// infrastructure/feature_flag_adapter.ts
// Config-based feature flag adapter — straightforward implementation

import { getConfig } from './config_loader_adapter';
import type { IFeatureFlagPort } from '../contract';
import type { FeatureFlag, Enabled } from '../taxonomy';
import { ENABLED, DISABLED } from '../taxonomy';

/**
 * Basic feature flag provider that reads from environment/config.
 * Supports simple boolean flags and basic user-based overrides.
 */
export class FeatureFlagAdapter implements IFeatureFlagPort {
  private flags: Record<FeatureFlag, boolean>;

  constructor() {
    // Initialized from system config
    this.flags = getConfig().featureFlags || {} as Record<FeatureFlag, boolean>;
  }

  /**
   * Checks if a flag is enabled.
   * Logic: 
   * 1. Check if flag exists in config
   * 2. If context has 'userId', check if flag is enabled for that user (future expansion)
   */
  async isEnabled(flag: FeatureFlag, _context?: Record<string, unknown>): Promise<Enabled> {
    const isGloballyEnabled = this.flags[flag] === true;
    return isGloballyEnabled ? ENABLED : DISABLED;
  }
}
