// capabilities/index.ts
// Barrel export — capability services implementing protocols

export { UserLoginActions } from './user_login_actions';
export { InboxManageActions } from './inbox_manage_actions';
export { EmailFetchActions } from './email_fetch_actions';
export { DashboardMetricsActions } from './dashboard_metrics_actions';
export { DashboardFetchActions } from './dashboard_fetch_actions';
export { WorkerSettingsActions } from './worker_settings_actions';
export { InboxCleanupActions } from './inbox_cleanup_actions';
export { EmailIngestActions } from './email_ingest_actions';
export { EmailExtractionActions } from './email_extraction_actions';
export { OpenRouterAutomationActions } from './openrouter_automation_actions';

// Phase 2-4: New protocol implementations
export { ApiKeyManagementActions } from './apikey_manage_actions';
export { ApiKeyAuthActions } from './apikey_auth_actions';
export { RateLimitActions } from './rate_limit_actions';
export { QuotaManagementActions } from './quota_management_actions';
export { AccountServiceActions } from './account_service_actions';


