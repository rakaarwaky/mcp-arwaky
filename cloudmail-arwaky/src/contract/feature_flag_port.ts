// contract/feature_flag_port.ts
// Feature flag port — abstraction for toggling features dynamically

/**
 * Interface for feature flag providers (e.g., config-based, DB-based, or LaunchDarkly).
 */
import type { FeatureFlag, Enabled } from '../taxonomy';

export interface IFeatureFlagPort {
  /**
   * Checks if a specific feature flag is enabled.
   *
   * @param flag Unique identifier for the feature flag
   * @param context Optional segmenting context (userId, email, etc.)
   * @returns true if the feature is active
   */
  isEnabled(flag: FeatureFlag, context?: Record<string, unknown>): Promise<Enabled>;
}
