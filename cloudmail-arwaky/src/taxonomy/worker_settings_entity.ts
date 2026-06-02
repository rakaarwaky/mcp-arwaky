// taxonomy/worker_settings_entity.ts

import type { Timestamp } from './timestamp_epoch_vo';
import type { SettingKey, SettingValue, EmailDomain } from './worker_config_vo';

export interface WorkerSettings {
  key: SettingKey;
  value: SettingValue | null;
  updatedAt: Timestamp;
}

export interface WorkerSettingsConfig {
  user_email_domain: EmailDomain | null;
}
export const WORKER_SETTINGS_DOMAIN = "worker_settings";
