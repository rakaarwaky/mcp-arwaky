// taxonomy/credential_vo.ts
// Credential types — passwords, tokens, codes

export type Password = string & { readonly __brand: 'Password' };
export type AuthToken = string & { readonly __brand: 'AuthToken' };
export type CookieName = string & { readonly __brand: 'CookieName' };
export type EncryptionSecret = string & { readonly __brand: 'EncryptionSecret' };

export function asPassword(s: string): Password { return s as Password; }
export function asAuthToken(s: string): AuthToken { return s as AuthToken; }
export function asCookieName(s: string): CookieName { return s as CookieName; }
export function asEncryptionSecret(s: string): EncryptionSecret { return s as EncryptionSecret; }

export const MASK_KEY_VISIBLE_CHARS = 8; // Primitive, used in validation (length check)
export const API_KEY_RANDOM_BYTES = 32; // Primitive, used in crypto random bytes

/**
 * Masks a sensitive string (API key, token, etc.) for display.
 * 
 * @param secret The secret string to mask
 * @returns Masked string (e.g. "****wxyz")
 */
export function maskSecret(secret: string): string {
  if (!secret) return '';
  const visible = secret.slice(-MASK_KEY_VISIBLE_CHARS);
  return '****' + visible;
}
