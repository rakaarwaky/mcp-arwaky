// infrastructure/structured_logger_util.ts
// Structured JSON logger for all domains
// Outputs JSON for Cloudflare Logs / log aggregators

import { LogLevel, LogMessage, CorrelationId, UserId, ServiceName, LogContext } from '../taxonomy';

export interface LogEntryContext extends Record<string, unknown> {
  requestId?: CorrelationId;
  userId?: UserId;
  component?: ServiceName;
  context?: LogContext;
}

function writeLog(level: LogLevel, message: LogMessage, entryContext?: LogEntryContext) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(entryContext || {}),
  };
  console.log(JSON.stringify(entry));
}

export const structuredLogger = {
  info(message: LogMessage, context?: LogEntryContext) {
    writeLog('info', message, context);
  },
  warn(message: LogMessage, context?: LogEntryContext) {
    writeLog('warn', message, context);
  },
  error(message: LogMessage, context?: LogEntryContext) {
    writeLog('error', message, context);
  },
  debug(message: LogMessage, context?: LogEntryContext) {
    writeLog('debug', message, context);
  },
};
