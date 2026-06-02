// surfaces/api/http_response_util.ts
// Shared HTTP JSON response helper with security headers

import type { AgentEnv } from '../../agent/di_container_registry';

export interface ErrorResponse {
  error: string;
  code?: string; // Optional error code for client handling
  details?: unknown; // Optional additional context
}

/**
 * Determine the appropriate CORS origin for a request.
 * In production, only allows origins listed in env.ALLOWED_ORIGINS.
 * In development, mirrors the request origin or falls back to '*'.
 */
export function getCorsOrigin(request: Request | undefined, env: AgentEnv | undefined): string {
  if (!request) return '';
  const isProd = env?.NODE_ENV === 'production' || process.env.NODE_ENV === 'production';
  if (!isProd) return request.headers.get('origin') ?? '*';

  const origin = request.headers.get('origin') ?? '';
  if (!env || !env.ALLOWED_ORIGINS) return '';

  const allowed = env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  // In production, never return wildcard — must be explicit origin
  if (allowed.includes('*')) {
    // If wildcard configured, only mirror origin if it's a non-empty valid origin
    return origin || '';
  }
  if (allowed.includes(origin)) return origin;
  // Return first allowed origin as fallback (strict)
  return allowed[0] ?? '';
}

/**
 * Applies rate-limit headers to an existing response.
 */
export function withRateLimitHeaders(
  response: Response,
  limit: number,
  remaining: number,
  resetAt: string
): Response {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(resetAt));
  return response;
}

export function jsonResponse<T>(data: T, status: number = 200, options?: { cspNonce?: string, isProd?: boolean }): Response {
  const isProd = options?.isProd ?? false;
  const nonce = options?.cspNonce ?? crypto.randomUUID();

  // Build CSP header
  let csp = "default-src 'self';";
  
  // Base scripts allowed in all envs
  const scriptSrc = ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"];
  const connectSrc = ["'self'", "https://static.cloudflareinsights.com"];
  const styleSrc = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];
  const fontSrc = ["'self'", "https://fonts.gstatic.com"];
  const imgSrc = ["'self'", "data:", "https:"];

  if (isProd) {
    // Production: strict CSP with nonce support if needed (added to self)
    scriptSrc.push(`'nonce-${nonce}'`);
    styleSrc.push(`'nonce-${nonce}'`);
  } else {
    // Development: more permissive for debugging
    scriptSrc.push("'unsafe-eval'");
  }

  csp += ` script-src ${scriptSrc.join(' ')};`;
  csp += ` style-src ${styleSrc.join(' ')};`;
  csp += ` img-src ${imgSrc.join(' ')};`;
  csp += ` font-src ${fontSrc.join(' ')};`;
  csp += ` connect-src ${connectSrc.join(' ')};`;
  csp += " object-src 'none'; base-uri 'self'; form-action 'self';";

  const headers: HeadersInit = {
    'content-type': 'application/json',
    // Security headers
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'x-xss-protection': '1; mode=block',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'geolocation=(), microphone=(), camera=(), payment=()',
    // CSP with nonce for inline script/style support
    'content-security-policy': csp,
    // CORS headers are applied by api_route_registry using getCorsOrigin()
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    // Pass nonce to client for inline script usage (if needed)
    'x-csp-nonce': nonce,
  };

  return new Response(JSON.stringify(data), { status, headers });
}

/**
 * Creates a standardized error response.
 * @param message - Human-readable error message
 * @param status - HTTP status code (default: 500)
 * @param code - Optional error code for client handling
 * @param details - Optional additional context (will be JSON-stringified)
 * @returns Response with consistent error shape
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): Response {
  return jsonResponse<ErrorResponse>(
    { error: message, code, details },
    status
  );
}
