// taxonomy/account_verification_vo.ts
// Value objects for account verification and API key extraction (PRD Phase 2)

import type { Url } from './web_url_vo';

/**
 * Verification link extracted from a confirmation email.
 * Used during OpenRouter account registration flow.
 * Branded to distinguish from generic URLs.
 */
export type VerificationLink = Url & { readonly __brand: 'VerificationLink' };

/**
 * API key extracted from a confirmation email.
 * Branded to ensure it's treated as sensitive credential.
 */
export type ExtractedApiKey = string & { readonly __brand: 'ExtractedApiKey' };

/**
 * Verification code (numeric or alphanumeric) from email.
 * Used for 2FA or email verification flows.
 */
export type VerificationCode = string & { readonly __brand: 'VerificationCode' };

/**
 * Validates and creates a VerificationLink.
 * Ensures the string is a well-formed URL.
 *
 * @param s - URL string to validate
 * @returns Branded VerificationLink
 * @throws Error if URL is invalid
 */
export function asVerificationLink(s: string): VerificationLink {
  try {
    const url = new URL(s);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Invalid verification link protocol: ${url.protocol}`);
    }
    return s as VerificationLink;
  } catch (e: any) {
    throw new Error(`Invalid verification link: ${s}${e.message ? ` (${e.message})` : ''}`);
  }
}

/**
 * Validates and creates an ExtractedApiKey.
 * Ensures the key is non-empty.
 *
 * @param s - Raw API key string
 * @returns Branded ExtractedApiKey
 * @throws Error if key is empty
 */
export function asExtractedApiKey(s: string): ExtractedApiKey {
  if (!s || s.trim().length === 0) {
    throw new Error('Extracted API key cannot be empty');
  }
  return s as ExtractedApiKey;
}

/**
 * Validates and creates a VerificationCode.
 * Ensures the code is non-empty.
 *
 * @param s - Verification code string
 * @returns Branded VerificationCode
 * @throws Error if code is empty
 */
export function asVerificationCode(s: string): VerificationCode {
  if (!s || s.trim().length === 0) {
    throw new Error('Verification code cannot be empty');
  }
  return s as VerificationCode;
}


