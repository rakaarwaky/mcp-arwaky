/**
 * @module contract/sess_valid_io
 * @description IO contract for session token validation.
 * Defines input (auth token) and output (validity + resolved identity).
 */

import type { AuthToken, UserId, EmailAddress, Valid } from '../taxonomy';

export interface ValidateSessionInput { token: AuthToken; }
export interface ValidateSessionOutput { valid: Valid; userId?: UserId; email?: EmailAddress; }
