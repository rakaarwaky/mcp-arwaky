// taxonomy/account_policy_vo.ts
// Branded types for account management policies

/** Account expiry duration in hours (must be >= 1) */
export type ExpiryHours = number & { readonly __brand: 'ExpiryHours' };

export function asExpiryHours(n: number): ExpiryHours {
    return Math.max(1, Math.floor(n)) as ExpiryHours;
}

/** Default account expiry duration */
export const DEFAULT_ACCOUNT_EXPIRY_HOURS = asExpiryHours(24);
