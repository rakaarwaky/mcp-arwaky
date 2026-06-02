// taxonomy/http_context_vo.ts
// Value objects describing HTTP request/response specific features

export type ClientIp = string & { readonly __brand: 'ClientIp' };
export type UserAgent = string & { readonly __brand: 'UserAgent' };
export type HeadersJson = string & { readonly __brand: 'HeadersJson' };
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export function asClientIp(s: string): ClientIp { return s as ClientIp; }
export function asUserAgent(s: string): UserAgent { return s as UserAgent; }
export function asHeadersJson(s: string): HeadersJson { return s as HeadersJson; }
export function asHttpMethod(s: string): HttpMethod {
  const m = s.toUpperCase();
  if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(m)) {
    return m as HttpMethod;
  }
  throw new Error(`Invalid HTTP method: ${s}`);
}

export const HTTP_CONTEXT_DOMAIN = 'http_context';
