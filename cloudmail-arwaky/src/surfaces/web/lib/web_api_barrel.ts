// surfaces/web/lib/api.ts
// API client — re-exports web_api_client functions (alias for lib/api)
export {
  loginApi, logoutApi, getCurrentUserApi, verifySessionApi,
  listUsersApi, createUserApi, deleteUserApi, getUserApi, updateUserApi,
  getInboxApi, getUserInboxApi, getEmailApi, emailActionApi,
  getDashboardApi,
  getSettingsApi, updateSettingsApi,
  listApiKeysApi, createApiKeyApi, revokeApiKeyApi,
  runCleanupApi, healthCheckApi,
  listAccountsApi, createAccountApi,
} from './web_api_client';
