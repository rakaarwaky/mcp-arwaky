// infrastructure/resilience_retry_adapter.ts
// Utility to retry a function with exponential backoff and jitter.

import { AppLoggerAdapter } from './app_logger_adapter.js';
import { asLogMessage, asRetryCount, asTimeoutMs, asRetryFactor } from '../taxonomy';
import type { RetryCount, TimeoutMs, RetryFactor } from '../taxonomy';

export interface RetryOptions {
  maxRetries: RetryCount;
  initialDelayMs: TimeoutMs;
  maxDelayMs: TimeoutMs;
  factor: RetryFactor;
  retryOn?: (error: any) => boolean;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: asRetryCount(3),
  initialDelayMs: asTimeoutMs(1000),
  maxDelayMs: asTimeoutMs(10000),
  factor: asRetryFactor(2),
};

/**
 * Utility to retry a function with exponential backoff and jitter.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  logger?: AppLoggerAdapter
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === opts.maxRetries) break;
      
      if (opts.retryOn && !opts.retryOn(error)) {
        throw error;
      }

      const jitter = Math.random() * 200; // Add some jitter
      const sleepTime = delay + jitter;
      
      if (logger) {
        logger.warn(asLogMessage(`Operation failed (attempt ${attempt + 1}/${opts.maxRetries + 1}). Retrying in ${Math.round(sleepTime)}ms...`), { error });
      }

      await new Promise(resolve => setTimeout(resolve, sleepTime));
      
      delay = asTimeoutMs(Math.min(delay * opts.factor, opts.maxDelayMs));
    }
  }

  throw lastError;
}
