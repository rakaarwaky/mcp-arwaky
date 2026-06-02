// taxonomy/error_code_vo.ts
// Error vocabulary — all error types import from here

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'CIRCUIT_OPEN'
  | 'INFRASTRUCTURE_ERROR'
  | 'INTERNAL_ERROR';

export type HttpStatusCode = 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503;

export const ERROR_STATUS_MAP: Record<ErrorCode, HttpStatusCode> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  CIRCUIT_OPEN: 503,
  INFRASTRUCTURE_ERROR: 503,
  INTERNAL_ERROR: 500,
};
