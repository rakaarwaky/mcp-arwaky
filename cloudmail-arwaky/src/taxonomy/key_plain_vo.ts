// taxonomy/api_key_plain_vo.ts
// Plaintext API key — secret before hashing. Never stored or logged.

export type ApiKeyPlain = string & { readonly __brand: 'ApiKeyPlain' };

export function asApiKeyPlain(s: string): ApiKeyPlain {
  if (!s || s.trim().length === 0) {
    throw new Error('API key plaintext cannot be empty');
  }
  // Basic format validation (sk- or sk-or- prefix)
  if (!s.startsWith('sk-') && !s.startsWith('sk-or-')) {
    throw new Error('API key must start with sk- or sk-or-');
  }
  return s as ApiKeyPlain;
}

export function isApiKeyPlain(s: string): s is ApiKeyPlain {
  return typeof s === 'string' && s.length > 0 && (s.startsWith('sk-') || s.startsWith('sk-or-'));
}
