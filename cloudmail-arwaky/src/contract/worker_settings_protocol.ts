/**
 * @module contract/worker_settings_protocol
 * @description Protocol interface for worker runtime settings.
 * Provides get/set operations for key-value configuration stored in D1.
 */
// contract/worker_settings_protocol.ts
import type { SettingKey, SettingValue } from '../taxonomy';

export interface IWorkerSettingsProtocol {
  getSettings(): Promise<{ settings: Record<SettingKey, SettingValue | null> }>;
  updateSettings(updates: Record<SettingKey, SettingValue>): Promise<void>;
}
