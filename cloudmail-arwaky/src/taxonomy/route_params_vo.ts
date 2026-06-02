// taxonomy/api_route_params_vo.ts
// Strongly-typed route parameter and request body interfaces for API handlers

/**
 * Route parameters for endpoints that require a user ID.
 */
export interface UserIdParams {
    userId: string;
}

/**
 * Route parameters for endpoints that require an email ID.
 */
export interface EmailIdParams {
    emailId: string;
}

/**
 * Route parameters for endpoints that require an API key ID.
 */
export interface ApiKeyIdParams {
    keyId: string;
}

/**
 * Route parameters for endpoints that require an account ID.
 */
export interface AccountIdParams {
    accountId: string;
}

/**
 * Route parameters for endpoints with no parameters.
 */
export interface EmptyParams { }

/**
 * Request body for creating a new user.
 */
export interface CreateUserBody {
    email: string;
    password: string;
}

/**
 * Request body for updating an existing user.
 */
export interface UpdateUserBody {
    email?: string;
    password?: string;
    role?: 'user' | 'admin';
}

/**
 * Request body for creating a new email account.
 */
export interface CreateAccountBody {
    provider: 'gmail' | 'outlook' | 'yahoo';
    targetEmail: string;
    password: string;
    apiKeyId?: string;
}

/**
 * Request body for updating user settings.
 */
export interface UpdateSettingsBody {
    maxInboxes?: number;
    requestsPerMinute?: number;
}

/**
 * Request body for creating an API key.
 */
export interface CreateApiKeyBody {
    name: string;
}

/**
 * Request body for updating an API key.
 */
export interface UpdateApiKeyBody {
    name?: string;
    disabled?: boolean;
}
