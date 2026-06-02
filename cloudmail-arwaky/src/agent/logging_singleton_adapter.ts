// Minimal agent logger singleton — satisfies imports from agent modules
// Uses console output; production would wire to IAppLoggerPort via DI
export const agentLogger = {
  info: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.log('[AGENT INFO]', ...args);
  },
  warn: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.warn('[AGENT WARN]', ...args);
  },
  error: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.error('[AGENT ERROR]', ...args);
  },
  debug: (...args: unknown[]): void => {
    // eslint-disable-next-line no-console
    console.debug('[AGENT DEBUG]', ...args);
  },
};

export default agentLogger;
