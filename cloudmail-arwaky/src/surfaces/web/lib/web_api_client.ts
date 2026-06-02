// surfaces/web/lib/api.ts
// API client — all response types from contract _io

import type {
  AuthLoginOutput,
  AuthLogoutOutput,
  AuthHealthOutput,
  ValidateSessionOutput,
  UserMeOutput,
  InboxListOutput,
  EmailActionOutput,
  EmailGetOutput,
  UserListOutput,
  UserGetOutput,
  UserCreateOutput,
  UserUpdateOutput,
  UserDeleteOutput,
  DashboardMetricsOutput,
  WorkerSettingsGetOutput,
  WorkerSettingsUpdateOutput,
  ApiKeyListOutput,
  ApiKeyCreateOutput,
  ApiKeyRevokeOutput,
  CleanupOutput,
  GetAccountOutput,
  CreateAccountOutput,
} from '$contract';
import type { Account, UserId, Name, EmailAddress, Password, InboxId, AccountId, ApiKeyId, ServiceProvider, Username, EmailId, EmailAction, UserRole, IsOwner, SettingKey, SettingValue, SanitizedUser } from '$taxonomy';


async function api<T>(path: string, options: RequestInit & { baseUrl?: string; headers?: Record<string, string>; apiHandler?: (req: Request) => Promise<Response>; signal?: AbortSignal } = {}): Promise<T> {
  const { baseUrl, apiHandler, signal, ...fetchOptions } = options;
  const headers = new Headers(options.headers);
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  // Prepend baseUrl if provided (essential for SSR absolute URLs)
  let url = `/api${path}`;
  if (baseUrl) {
    url = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${url}`;
  }

  let res: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s default timeout

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    if (apiHandler) {
      const req = new Request(url, { ...fetchOptions, headers, signal: controller.signal });
      res = await apiHandler(req);
    } else {
      res = await fetch(url, { 
        ...fetchOptions, 
        headers, 
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal
      });
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out or cancelled');
    }
    throw new Error(`Network error: ${err.message || 'Unable to reach server'}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (res.status === 401) {
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    let text = await res.text();
    // During SSR, we might get an HTML error page from a higher-level proxy
    if (text.includes('<!DOCTYPE html>')) {
      text = `API returned HTML instead of JSON (Status ${res.status}). Likely a routing error.`;
    }
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
  }

  const json = await res.json();
  const data = json as T & { error?: string };
  if (!res.ok) throw new Error((data.error || `HTTP ${res.status}`).slice(0, 200));
  return data as T;
}

// Auth
export const loginApi = (email: EmailAddress, password: Password, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<AuthLoginOutput>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: email.full, password }),
    baseUrl,
    headers,
    apiHandler,
    signal
  });

export const logoutApi = (baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) => 
  api<AuthLogoutOutput>('/auth/logout', { method: 'POST', baseUrl, headers, apiHandler, signal });

export const getCurrentUserApi = (baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) => 
  api<UserMeOutput>('/me', { baseUrl, headers, apiHandler, signal });

export const verifySessionApi = (baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) => 
  api<UserMeOutput>('/me', { baseUrl, headers, apiHandler, signal });

// Users
export const listUsersApi = (baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) => api<UserListOutput>('/users', { baseUrl, headers, apiHandler, signal });

export const createUserApi = (username: Username, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<UserCreateOutput>('/users', {
    method: 'POST',
    body: JSON.stringify({ username }),
    baseUrl,
    headers,
    apiHandler,
    signal
  });

export const deleteUserApi = (id: UserId, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<UserDeleteOutput>(`/users/${id}`, { method: 'DELETE', baseUrl, headers, apiHandler, signal });

export const getUserApi = (id: UserId, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<UserGetOutput>(`/users/${id}`, { baseUrl, headers, apiHandler, signal });

export const updateUserApi = (id: UserId, updates: { email?: EmailAddress; displayName?: Name; password?: Password }, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<UserUpdateOutput>(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
    baseUrl,
    headers,
    apiHandler,
    signal
  });

// Inbox
export const getInboxApi = (baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, params?: { limit?: number; offset?: number }, signal?: AbortSignal) => {
  let path = '/me/inbox';
  const q = new URLSearchParams();
  if (params?.limit !== undefined) q.set('limit', params.limit.toString());
  if (params?.offset !== undefined) q.set('offset', params.offset.toString());
  const qs = q.toString();
  if (qs) path += `?${qs}`;
  
  return api<InboxListOutput>(path, { baseUrl, headers, apiHandler, signal });
};

export const getUserInboxApi = (userId: UserId, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<InboxListOutput>(`/users/${userId}/inbox`, { baseUrl, headers, apiHandler, signal });

export const getEmailApi = (emailId: EmailId, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<EmailGetOutput>(`/me/emails/${encodeURIComponent(emailId)}`, { baseUrl, headers, apiHandler, signal });

export const emailActionApi = (emailId: EmailId, action: EmailAction, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<EmailActionOutput>(`/me/emails/${encodeURIComponent(emailId)}/action`, {
    method: 'POST',
    body: JSON.stringify({ action }),
    baseUrl,
    headers,
    apiHandler,
    signal
  });

// Dashboard
export const getDashboardApi = (baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) => api<DashboardMetricsOutput>('/dashboard', { baseUrl, headers, apiHandler, signal });

// Settings
export const getSettingsApi = (baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) => api<WorkerSettingsGetOutput>('/worker-settings', { baseUrl, headers, apiHandler, signal });

export const updateSettingsApi = (updates: Record<SettingKey, SettingValue | null>, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<WorkerSettingsUpdateOutput>('/worker-settings', {
    method: 'PUT',
    body: JSON.stringify(updates),
    baseUrl,
    headers,
    apiHandler,
    signal
  });

// API Keys
export const listApiKeysApi = (baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) => 
  api<ApiKeyListOutput>('/apikeys', { baseUrl, headers, apiHandler, signal });

export const createApiKeyApi = (name: Name, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<ApiKeyCreateOutput>('/apikeys', {
    method: 'POST',
    body: JSON.stringify({ name }),
    baseUrl,
    headers,
    apiHandler,
    signal
  });

export const revokeApiKeyApi = (id: ApiKeyId, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<ApiKeyRevokeOutput>(`/apikeys/${id}`, { method: 'DELETE', baseUrl, headers, apiHandler, signal });

// Cleanup
export const runCleanupApi = (maxAgeHours: number = 24, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<CleanupOutput>('/cleanup', {
    method: 'POST',
    body: JSON.stringify({ maxAgeHours }),
    baseUrl,
    headers,
    apiHandler,
    signal
  });

// Health
export const healthCheckApi = (options: { baseUrl?: string; signal?: AbortSignal } = {}) =>
  api<AuthHealthOutput>('/health', { baseUrl: options.baseUrl, signal: options.signal });

// ── Accounts ──
export const listAccountsApi = (userId: UserId, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<GetAccountOutput>(`/users/${userId}/accounts`, { baseUrl, headers, apiHandler, signal });


export const createAccountApi = (input: { inboxId: InboxId; provider?: ServiceProvider; targetEmail: EmailAddress; password?: Password; apiKey?: string; }, baseUrl?: string, headers?: Record<string, string>, apiHandler?: (req: Request) => Promise<Response>, signal?: AbortSignal) =>
  api<CreateAccountOutput>('/accounts', {
    method: 'POST',
    body: JSON.stringify(input),
    baseUrl,
    headers,
    apiHandler,
    signal
  });
