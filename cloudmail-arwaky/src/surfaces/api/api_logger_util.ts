// surfaces/api/logger.ts
// Structured JSON Logger utility for Cloudflare Workers
// AEC-aligned: Separates logging concerns from routing/business logic

export interface LogContext extends Record<string, any> {
  requestId?: string;
  userId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
}

/**
 * Structured Logger
 * Outputs JSON strings for easy consumption by log aggregators (Logflare, Datadog, etc.)
 */
export const logger = {
  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, context?: LogContext) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context || {}),
    };
    // Use console.log for all levels to ensure they show up in Cloudflare Logs
    // Note: Console.error/warn/info all pipe to the same stream in Workers usually,
    // but we use JSON structure to distinguish levels.
    console.log(JSON.stringify(entry));
  },

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  },

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  },

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  },

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
};
