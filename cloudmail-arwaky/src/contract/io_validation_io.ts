// contract/io_schemas.ts
// Runtime Zod schemas for all IO boundaries — Contract Layer Improvement Plan P1-C2
// Validates inputs at surface boundaries (API, MCP, CLI, TUI, Web)

import { z } from 'zod';

// ═══ Primitive VO Schemas ═══

export const EmailAddressSchema = z.string().email().transform(full => ({ full }));

export const UserIdSchema = z.string().uuid().brand<'UserId'>();
export const InboxIdSchema = z.string().uuid().brand<'InboxId'>();
export const EmailIdSchema = z.string().uuid().brand<'EmailId'>();
export const AccountIdSchema = z.string().uuid().brand<'AccountId'>();
export const ApiKeyIdSchema = z.string().uuid().brand<'ApiKeyId'>();
export const SessionIdSchema = z.string().uuid().brand<'SessionId'>();

export const NameSchema = z.string().min(1).max(100);
export const DisplayNameSchema = z.string().min(1).max(100).nullable();
export const PasswordSchema = z.string().min(1);
export const AuthTokenSchema = z.string().min(1);
export const UserAgentSchema = z.string().min(1);
export const ClientIpSchema = z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F:]+)$|^[a-zA-Z0-9._-]+$/, 'Invalid IP or hostname').or(z.string().min(1));

export const SettingKeySchema = z.string().min(1).max(100).regex(/^[a-zA-Z0-9.@\-_/]+$/);
export const SettingValueSchema = z.string().min(1);

export const SubjectSchema = z.string().min(1).max(500);
export const SearchFromSchema = z.string().email();
export const TimeoutSecondsSchema = z.number().int().min(1).max(3600);
export const PollIntervalSecondsSchema = z.number().int().min(1).max(300);

export const MaxAgeHoursSchema = z.number().int().min(1).max(720);
export const ReasonSchema = z.string().min(1).max(1000);

export const UrlSchema = z.string().url();
export const ServiceProviderSchema = z.enum(['openrouter', 'clerk', 'generic']);

// ═══ Auth Session IO ═══

export const AuthLoginInputSchema = z.object({
  email: z.string().email().transform(v => v.trim()),
  password: PasswordSchema,
  userAgent: UserAgentSchema.default('cli/unknown'),
  clientIp: ClientIpSchema.default('127.0.0.1'),
});

export const AuthLogoutInputSchema = z.object({
  token: AuthTokenSchema,
});

export const AuthHealthInputSchema = z.object({});

// ═══ User CRUD IO ═══

export const UserListInputSchema = z.object({});

export const UserCreateInputSchema = z.object({
  username: NameSchema,
});

export const UserGetInputSchema = z.object({
  userId: z.string().uuid(),
});

export const UserDeleteInputSchema = z.object({
  userId: z.string().uuid(),
});

export const UserUpdateInputSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email().optional(),
  displayName: z.string().min(1).max(100).optional(),
  password: z.string().min(8).optional(),
});

// ═══ Inbox Fetch IO ═══

export const InboxListInputSchema = z.object({
  userId: z.string().uuid().optional(),
  status: z.enum(['all', 'pending', 'read', 'archived', 'starred']).optional(),
});

// ═══ Email Ops IO ═══

export const EmailGetInputSchema = z.object({
  emailId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});

export const EmailWaitInputSchema = z.object({
  userId: z.string().uuid(),
  from: z.string().email().optional(),
  subject: SubjectSchema.optional(),
  timeout: z.union([z.number().int().min(1).max(3600), z.string().regex(/^\d+[smhd]?$/)]).optional(),
  pollInterval: z.union([z.number().int().min(1).max(300), z.string().regex(/^\d+[smhd]?$/)]).optional(),
});

export const EmailActionInputSchema = z.object({
  userId: z.string().uuid(),
  emailId: z.string().uuid(),
  action: z.enum(['star', 'archive', 'mark_read', 'delete']),
  actor: z.string().uuid().optional(),
});

// ═══ API Keys IO ═══

export const ApiKeyCreateInputSchema = z.object({
  name: NameSchema.optional(),
  createdBy: z.string().uuid().optional(),
});

export const ApiKeyRevokeInputSchema = z.object({
  apiKeyId: z.string().uuid(),
});

export const ApiKeyListInputSchema = z.object({});

// ═══ Worker Settings IO ═══

export const WorkerSettingsGetInputSchema = z.object({});

export const WorkerSettingsUpdateInputSchema = z.object({
  updates: z.record(SettingKeySchema, SettingValueSchema.nullable()),
});

// ═══ Dashboard Stats IO ═══

export const DashboardMetricsInputSchema = z.object({
  period: z.enum(['today', '7d', '30d', 'all']).optional(),
});

// ═══ Cleanup Task IO ═══

export const CleanupInputSchema = z.object({
  maxAgeHours: z.union([z.number().int().min(1).max(720), z.string().regex(/^\d+$/)]),
});

// ═══ Account Manage IO ═══

export const CreateAccountInputSchema = z.object({
  inboxId: z.string().uuid(),
  provider: ServiceProviderSchema,
  targetEmail: z.string().email(),
  password: z.string().optional(),
});

export const GetAccountInputSchema = z.object({
  accountId: z.string().uuid(),
});

// ═══ Utility: Validate and transform helpers ═══

export function validateEmailInput(raw: string): string {
  return z.string().email().parse(raw.trim().toLowerCase());
}

export function validateUuidInput(raw: string): string {
  return z.string().uuid().parse(raw.trim());
}

export function validateNameInput(raw: string): string {
  return NameSchema.parse(raw.trim());
}
