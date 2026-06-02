// taxonomy/log_level_vo.ts
// Log levels for structured logging — strictly 3-word naming

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export function asLogLevel(s: string): LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  if (validLevels.includes(s as LogLevel)) return s as LogLevel;
  return 'info';
}

export const LOG_LEVEL_DOMAIN = 'log_level';
