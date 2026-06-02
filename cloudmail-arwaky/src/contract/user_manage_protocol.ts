// contract/user_manage_protocol.ts
// Protocol for user management operations (split from IUserLoginProtocol)

import type { User, UserId, Name, EmailAddress, Password, DeleteResult, SoftDeleteResult, Timestamp } from '../taxonomy';

export interface IUserManageProtocol {
  listUsers(): Promise<User[]>;
  createUser(username: Name): Promise<{ user: User; credentials: { username: Name; email: EmailAddress; password: Password } }>;
  getUser(userId: UserId): Promise<User | null>;
  deleteUser(userId: UserId): Promise<DeleteResult>;
  softDeleteUser(userId: UserId): Promise<SoftDeleteResult>;
  updateUser(userId: UserId, updates: { email?: EmailAddress; displayName?: Name; password?: Password }): Promise<User | null>;
}
