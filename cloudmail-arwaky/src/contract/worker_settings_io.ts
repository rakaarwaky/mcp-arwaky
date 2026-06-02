// contract/worker_settings_io.ts
// Worker settings — get, update

import type { SettingKey, SettingValue, ApiOperationSuccess } from '../taxonomy';

// ── Input ──
export interface WorkerSettingsGetInput {}
export interface WorkerSettingsUpdateInput { updates: Record<SettingKey, SettingValue>; }

// ── Output ──
export interface WorkerSettingsGetOutput { settings: Record<SettingKey, SettingValue | null>; }
export interface WorkerSettingsUpdateOutput { ok: ApiOperationSuccess; }