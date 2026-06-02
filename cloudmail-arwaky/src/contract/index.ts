// contract/index.ts
// Barrel — all files STRICT 3-word: {domain}_{aspect}_{type}

// ═══ PORT ═══
export * from './db_query_port';
export * from './password_hash_port';
export * from './session_auth_port';
export * from './chrome_cdp_port';
export * from './app_logger_port';
export * from './metrics_collector_port';
export * from './feature_flag_port';
export * from './push_notify_port';
export * from './telemetry_tracer_port';
export * from './cache_client_port';

// ═══ PROTOCOL ═══
export * from './account_service_protocol';
export * from './apikey_proto_protocol';
export * from './data_cleanup_protocol';
export * from './dash_stats_protocol';
export * from './email_fetch_protocol';
export * from './email_extraction_protocol';
export * from './email_ingest_protocol';
export * from './inbox_manage_protocol';
export * from './openrouter_auto_protocol';
export * from './quota_proto_protocol';
export * from './rate_limit_protocol';
export * from './user_auth_protocol';
export * from './user_manage_protocol';
export * from './worker_settings_protocol';

// ═══ VALIDATION SCHEMAS ═══
export * from './io_validation_io';
export * from './accts_manage_io';
export * from './api_keys_io';
export * from './auth_session_io';
export * from './cleanup_task_io';
export * from './dash_stats_io';
export * from './email_ops_io';
export * from './email_ingest_io';
export * from './inbox_fetch_io';
export * from './quota_check_io';
export * from './rate_limit_io';
export * from './sess_valid_io';
export * from './user_crud_io';
export * from './user_update_io';
export * from './worker_settings_io';
// ═══ TAXONOMY RE-EXPORTS (Commonly used in IO) ═══
export type { ApiOperationSuccess, Deleted, ActionUpdated } from '$taxonomy';
