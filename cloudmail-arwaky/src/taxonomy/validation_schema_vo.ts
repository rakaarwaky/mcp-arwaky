// taxonomy/api_validation_schema_vo.ts
// Zod validation schemas for API request bodies

import { z } from 'zod';

/**
 * Schema for login request body.
 */
export const loginBodySchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

/**
 * Schema for API key authentication request body.
 */
export const apiKeyAuthBodySchema = z.object({
    apiKey: z.string().min(1, 'API key is required'),
});

/**
 * Schema for cleanup request body.
 */
export const cleanupBodySchema = z.object({
    maxAgeHours: z.number().int().min(1).max(168).optional(),
});
export const createUserSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    displayName: z.string().max(100, 'Display name too long').optional(),
});

/**
 * Schema for updating an existing user.
 * All fields optional; validates format when present.
 */
export const updateUserSchema = z.object({
    email: z.string().email('Invalid email format').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    displayName: z.string().max(100, 'Display name too long').optional(),
    role: z.enum(['user', 'admin', 'agent']).optional(),
});

/**
 * Schema for creating a new email account (Gmail, Outlook, Yahoo).
 */
export const createAccountSchema = z.object({
    inboxId: z.string().min(1, 'inboxId is required'),
    provider: z.string().optional(),
    targetEmail: z.string().email('Invalid target email format'),
    password: z.string().optional(),
    apiKey: z.string().optional(),
});

/**
 * Schema for updating user settings.
 */
export const updateSettingsSchema = z.object({
    key: z.string().min(1, 'Key is required'),
    value: z.string().min(1, 'Value is required'),
});

/**
 * Schema for creating a new API key.
 */
export const createApiKeySchema = z.object({
    name: z.string().max(100, 'Name too long').optional(),
});

/**
 * Schema for updating an API key.
 */
export const updateApiKeySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    disabled: z.boolean().optional(),
});

/**
 * Schema for completing an account (local runner).
 */
export const completeAccountSchema = z.object({
    apiKey: z.string().min(1, 'apiKey is required'),
});

/**
 * Schema for failing an account (local runner).
 */
export const failAccountSchema = z.object({
    error: z.string().min(1, 'error is required'),
});

/**
 * Schema for creating a new virtual inbox.
 */
export const createInboxSchema = z.object({
    username: z.string().min(1, 'Username must not be empty').max(50, 'Username too long').optional(),
    email: z.string().email('Invalid email format').optional(),
});

/**
 * Schema for inbox/email quick actions.
 */
export const quickActionSchema = z.object({
    action: z.enum(['star', 'archive', 'delete', 'mark_read'], {
        message: 'Unsupported action. Use: star, archive, delete, mark_read'
    }),
});

// ── Path parameter validation schemas ──

export const pathUserIdSchema = z.object({
  userId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid userId format'),
});

export const pathInboxIdSchema = z.object({
  inboxId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid inboxId format'),
});

export const pathEmailIdSchema = z.object({
  emailId: z.string().regex(/^[a-zA-Z0-9._:@+-]+$/i, 'Invalid emailId format'),
});

export const pathAccountIdSchema = z.object({
  accountId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid accountId format'),
});

export const pathKeyIdSchema = z.object({
  keyId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid keyId format'),
});
