// agent/index.ts
// God folder — exports the nerve system and heart
// All surfaces call through here

export { getLifecycleManager } from './lifecycle_state_manager';
export type { LifecycleState } from './lifecycle_state_manager';
export { AgentOrchestrator } from './request_flow_facade';
export { createContainer, createLocalContainer } from './di_container_registry';
export type { AgentEnv, AgentContainer, LocalEnv } from './di_container_registry';

// Routers (for advanced surface access if needed)
export { AuthFlowRouter } from './auth_flow_router';
export { InboxQueryRouter } from './inbox_query_router';
export { NotificationDispatchRouter } from './notification_dispatch_router';
export { ApiQuotaRouter } from './api_quota_router';
export { AccountManageRouter } from './account_manage_router';
export { WorkerSetupRouter } from './worker_setup_router';
