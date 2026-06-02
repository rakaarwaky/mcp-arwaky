// taxonomy/password_plain_vo.ts
// Plaintext password — pre-hash secret. Never stored or logged.

export type PasswordPlain = string & { readonly __brand: 'PasswordPlain' };

export function asPasswordPlain(s: string): PasswordPlain {
  if (!s || s.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  return s as PasswordPlain;
}

export function isPasswordPlain(s: string): s is PasswordPlain {
  return typeof s === 'string' && s.length >= 8;
}
