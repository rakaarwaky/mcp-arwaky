// taxonomy/operation_status_vo.ts
// Standardized Boolean flags and operational results

// ── Boolean brands ───────────────────────────────────────────────────────────
export type ApiOperationSuccess = boolean & { readonly __brand: 'ApiOperationSuccess' };
export type Deleted = boolean & { readonly __brand: 'Deleted' };
export type Stored = boolean & { readonly __brand: 'Stored' };
export type TimedOut = boolean & { readonly __brand: 'TimedOut' };
export type Connected = boolean & { readonly __brand: 'Connected' };
export type ActionUpdated = boolean & { readonly __brand: 'ActionUpdated' };
export type Allowed = boolean & { readonly __brand: 'Allowed' };
export const ALLOWED: Allowed = true as Allowed;
export const NOT_ALLOWED: Allowed = false as Allowed;

export function asAllowed(v: boolean): Allowed {
  return v as Allowed;
}

export function asHeadless(v: boolean): Headless {
  return v as Headless;
}

export function asElementFound(v: boolean): ElementFound {
  return v as ElementFound;
}

export type Active = boolean & { readonly __brand: 'Active' };
export type Valid = boolean & { readonly __brand: 'Valid' };
export type Headless = boolean & { readonly __brand: 'Headless' };
export type Enabled = boolean & { readonly __brand: 'Enabled' };
export type ElementFound = boolean & { readonly __brand: 'ElementFound' };
export type ReturnByValue = boolean & { readonly __brand: 'ReturnByValue' };
export type DeleteResult = boolean & { readonly __brand: 'DeleteResult' };
export type PasswordMatch = boolean & { readonly __brand: 'PasswordMatch' };

// ── Constant values ──────────────────────────────────────────────────────────
export const SUCCESS: ApiOperationSuccess = true as ApiOperationSuccess;
export const FAILURE: ApiOperationSuccess = false as ApiOperationSuccess;

export const DELETED: Deleted = true as Deleted;
export const NOT_DELETED: Deleted = false as Deleted;

export const STORED: Stored = true as Stored;
export const NOT_STORED: Stored = false as Stored;

export const TIMED_OUT: TimedOut = true as TimedOut;
export const NOT_TIMED_OUT: TimedOut = false as TimedOut;

export const CONNECTED: Connected = true as Connected;
export const DISCONNECTED: Connected = false as Connected;

export const ACTIVE: Active = true as Active;
export const INACTIVE: Active = false as Active;

export const ENABLED: Enabled = true as Enabled;
export const DISABLED: Enabled = false as Enabled;

export const VALID: Valid = true as Valid;
export const INVALID: Valid = false as Valid;

export const MATCH: PasswordMatch = true as PasswordMatch;
export const NO_MATCH: PasswordMatch = false as PasswordMatch;

export const ACTION_UPDATED: ActionUpdated = true as ActionUpdated;
export const ACTION_NOT_UPDATED: ActionUpdated = false as ActionUpdated;

export const DELETE_SUCCESS: DeleteResult = true as DeleteResult;
export const DELETE_FAILURE: DeleteResult = false as DeleteResult;

// ── Soft-delete result ───────────────────────────────────────────────────────
export type SoftDeleteReason = 'not_found' | 'protected_owner' | 'already_deleted';
export interface SoftDeleteSuccess { deleted: true; }
export interface SoftDeleteFailure { deleted: false; reason: SoftDeleteReason; }
export type SoftDeleteResult = SoftDeleteSuccess | SoftDeleteFailure;

export const OPERATION_STATUS_DOMAIN = 'operation_status';
