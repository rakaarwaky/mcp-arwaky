// surfaces/index.ts
// Barrel export — all surface entry points

// API
export { handleLogin, handleLogout } from './api/api_auth_entry';
export { handleHealth } from './api/api_health_entry';
export { handleListUsers, handleCreateUser, handleGetUser, handleGetCurrentUser, handleUpdateUser, handleDeleteUser } from './api/api_users_entry';
export { handleGetInbox, handleGetEmail, handleWaitForEmail, handleEmailQuickAction, handleGetUserInbox, handleGetUserEmail, handleUserEmailQuickAction } from './api/api_inbox_entry';
export { handleDashboard } from './api/api_dashboard_entry';
export { handleGetSettings, handleUpdateSettings } from './api/api_settings_entry';
export { handleScheduled } from './api/api_scheduled_entry';
export { handleApiRequest, matchRoute } from './api/api_route_registry';
export { handleCleanup } from './api/api_cleanup_entry';



// MCP — runs standalone via: npx tsx src/surfaces/mcp/mcp_tools_entry.ts
// CLI — runs standalone via: npx tsx src/surfaces/cli/cli_entry.ts
