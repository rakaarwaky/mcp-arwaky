// capabilities/worker_settings_actions.ts
// Implements IWorkerSettingsProtocol — worker config

import type { SettingKey, SettingValue, AppConfig } from '../taxonomy';
import type { IWorkerSettingsProtocol } from '../contract/worker_settings_protocol';
import type { IDatabaseQueryPort, IMetricsCollectorPort } from '../contract';
import { asSettingKey, asSettingValue, maskSecret, asServiceName, asAction } from '../taxonomy';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';
/**
 * Capability for managing worker settings and infrastructure configuration.
 * Handles merging of environment defaults with persistent database overrides.
 */
export class WorkerSettingsActions implements IWorkerSettingsProtocol {
  private cache = new Map<string, { settings: Record<SettingKey, SettingValue | null> }>();

  constructor(
    private db: IDatabaseQueryPort,
    private config: AppConfig,
    private metrics: IMetricsCollectorPort
  ) { }

  /**
   * Retrieves all worker settings by merging environment defaults with database overrides.
   * Settings like API keys and tokens are automatically masked for security.
   * 
   * @returns Record of setting keys to masked or plain setting values
   */
  async getSettings(): Promise<{ settings: Record<SettingKey, SettingValue | null> }> {
    return withMetrics(this.metrics, asServiceName('settings'), asAction('getSettings'), async () => {
      const cached = this.cache.get('merged_settings');
      if (cached) return cached;

      const settingsRows = await this.db.getWorkerSettings();

      // Layer 1: Configuration defaults (.env / config.yaml)
      const settings: Record<SettingKey, SettingValue | null> = {
        [asSettingKey('cmf_api_base_url')]: asSettingValue(this.config.api.baseUrl),
        [asSettingKey('user_email_domain')]: asSettingValue(this.config.email.defaultDomain),
        [asSettingKey('cmf_quota_max_emails')]: asSettingValue(String(this.config.quota.maxEmailsPerInbox)),
        [asSettingKey('cmf_quota_max_inboxes')]: asSettingValue(String(this.config.quota.maxInboxesPerKey)),
      };

      // Layer 2: Database overrides (takes priority)
      for (const row of settingsRows) {
        settings[row.key] = row.value;
      }

      // Mask sensitive keys (canonical masking rule)
      for (const key of Object.keys(settings)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = lowerKey.includes('api') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('token') ||
          lowerKey.includes('password');

        if (isSensitive) {
          const val = settings[asSettingKey(key)];
          if (val) {
            settings[asSettingKey(key)] = asSettingValue(maskSecret(String(val)));
          }
        }
      }

      const result = { settings };
      this.cache.set('merged_settings', result);
      return result;
    });
  }

  /**
   * Persists specific worker setting overrides to the database.
   * 
   * @param updates Collection of key-value pairs to update
   */
  async updateSettings(updates: Record<SettingKey, SettingValue>): Promise<void> {
    return withMetrics(this.metrics, asServiceName('settings'), asAction('updateSettings'), async () => {
      for (const [key, value] of Object.entries(updates)) {
        await this.db.setWorkerSetting(asSettingKey(key), value);
      }
      this.cache.clear(); // Invalidate cache on update
    });
  }
}
