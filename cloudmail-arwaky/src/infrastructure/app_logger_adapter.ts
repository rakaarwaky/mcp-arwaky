// infrastructure/app_logger_adapter.ts
// Implements IAppLoggerPort — local console-based structured logging adapter

import type { IAppLoggerPort } from '../contract';
import { type LogLevel, type LogMessage, type LogContext, asLogLevel } from '../taxonomy';

export class AppLoggerAdapter implements IAppLoggerPort {
  private baseLevel: number;

  constructor() {
    const levelStr = (process.env.LOG_LEVEL || 'info').toLowerCase();
    this.baseLevel = this.levelToNumber(asLogLevel(levelStr));
  }

  private levelToNumber(level: LogLevel): number {
    switch (level) {
      case 'debug': return 0;
      case 'info': return 1;
      case 'warn': return 2;
      case 'error': return 3;
      default: return 1;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelToNumber(level) >= this.baseLevel;
  }

  private format(level: LogLevel, message: LogMessage, metadata?: Record<string, unknown>, error?: unknown, context?: LogContext): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message,
      metadata,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error
    };
    return JSON.stringify(entry);
  }

  debug(message: LogMessage, metadata?: Record<string, unknown>, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, metadata, undefined, context));
    }
  }

  info(message: LogMessage, metadata?: Record<string, unknown>, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.format('info', message, metadata, undefined, context));
    }
  }

  warn(message: LogMessage, metadata?: Record<string, unknown>, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, metadata, undefined, context));
    }
  }

  error(message: LogMessage, error?: unknown, metadata?: Record<string, unknown>, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, metadata, error, context));
    }
  }
}
