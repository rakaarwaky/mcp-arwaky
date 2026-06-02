// contract/app_logger_port.ts
// Port for structured logging — strictly 3-word naming

import type { LogLevel, LogMessage, LogContext } from '../taxonomy';

export interface IAppLoggerPort {
  debug(message: LogMessage, metadata?: Record<string, unknown>, context?: LogContext): void;
  info(message: LogMessage, metadata?: Record<string, unknown>, context?: LogContext): void;
  warn(message: LogMessage, metadata?: Record<string, unknown>, context?: LogContext): void;
  error(message: LogMessage, error?: unknown, metadata?: Record<string, unknown>, context?: LogContext): void;
}
