// taxonomy/resilience_breaker_vo.ts
// Value objects and types for Circuit Breaker resilience pattern

import type { ServiceName } from './text_content_vo';
import type { TimeoutMs } from './time_duration_vo';
import { asTimeoutMs } from './time_duration_vo';

export enum CircuitState {
  CLOSED,
  OPEN,
  HALF_OPEN
}

export interface ResilienceBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: TimeoutMs;
  minSuccessesForClose: number;
}

export const DEFAULT_RESILIENCE_OPTIONS: ResilienceBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: asTimeoutMs(30000),
  minSuccessesForClose: 2,
};
