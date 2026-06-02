// contract/user_crud_io.ts
// User — list, create, get, delete, soft-delete

import type { SanitizedUser, User, UserId, Name, EmailAddress, Password, SoftDeleteResult, ErrorMessage, ApiOperationSuccess, Deleted, Reason } from '../taxonomy';

export interface UserListInput {}
export interface UserCreateInput { username: Name; }
export interface UserGetInput { userId: UserId; }
export interface UserDeleteInput { userId: UserId; }
export interface UserSoftDeleteInput { userId: UserId; }
export interface UserListOutput { users: SanitizedUser[]; ok?: ApiOperationSuccess; message?: string; error?: string; }
export interface UserCreateOutput { ok?: ApiOperationSuccess; user?: Pick<User, 'id' | 'email' | 'displayName'>; credentials?: { username: Name; email: EmailAddress; password: Password }; message?: string; error?: string; }
export interface UserGetOutput { user: SanitizedUser | null; ok?: ApiOperationSuccess; message?: string; error?: string; }
export interface UserDeleteOutput { ok?: ApiOperationSuccess; message?: string; error?: string; }
export interface UserSoftDeleteOutput { ok?: ApiOperationSuccess; message?: string; error?: string; reason?: Reason; }

export interface UserMeInput {}
export interface UserMeOutput {
  user: SanitizedUser;
}

