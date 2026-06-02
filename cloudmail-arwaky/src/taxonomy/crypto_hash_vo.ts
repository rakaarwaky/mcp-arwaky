/**
 * @module taxonomy/crypto_hash_vo
 * @description Value Object for cryptographic hashes.
 * Uses TypeScript branding to ensure raw secrets are not accidentally 
 * treated as hashes or vice-versa.
 */

export type CryptoHash = string & { readonly __brand: 'CryptoHash' };
export function asCryptoHash(s: string): CryptoHash { return s as CryptoHash; }

export const CRYPTO_HASH_DOMAIN = 'crypto_hash';
