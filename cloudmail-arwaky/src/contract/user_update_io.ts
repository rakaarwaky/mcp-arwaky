/**
 * @module contract/user_update_io
 * @description IO contract for user profile update operations.
 * Defines partial-update input shape and the resulting user output.
 */

import type { SanitizedUser, UserId, Name, EmailAddress, Password, ApiOperationSuccess } from '../taxonomy';

export interface UserUpdateInput { userId: UserId; updates: { email?: EmailAddress; displayName?: Name; password?: Password }; }
export interface UserUpdateOutput { user?: SanitizedUser | null; ok?: ApiOperationSuccess; message?: string; info?: string; error?: string; }
