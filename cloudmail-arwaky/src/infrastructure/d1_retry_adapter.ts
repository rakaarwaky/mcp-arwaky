// infrastructure/d1_retry_adapter.ts
// Wraps D1Database to add transient-failure retry on execute/first/all.
// AEC-aligned: adapter layer, no business logic.

import { withRetry } from './resilience_retry_adapter.js';
import { InfrastructureError } from '../taxonomy/platform_failure_error.js';
import { SqlQuery, asSqlQuery, asRetryCount, asTimeoutMs, asRetryFactor } from '../taxonomy';

function isRetryableD1Error(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  
  // NEVER retry on syntax or constraint errors (non-retryable)
  if (msg.includes('d1_error') || msg.includes('syntax error') || msg.includes('constraint failed')) {
    return false;
  }

  return msg.includes('database is locked')
    || msg.includes('busy')
    || msg.includes('timeout')
    || msg.includes('network')
    || msg.includes('internal')
    || msg.includes('connection');
}

function wrapStatement(stmt: D1PreparedStatement): D1PreparedStatement {
  const originalRun = stmt.run.bind(stmt);
  const originalFirst = stmt.first.bind(stmt);
  const originalAll = stmt.all.bind(stmt);
  const originalRaw = stmt.raw.bind(stmt);

  return {
    ...stmt,
    bind(...values: unknown[]) {
      const bound = stmt.bind(...values);
      return wrapStatement(bound);
    },
    async run<T = unknown>(): Promise<D1Result<T>> {
      return withRetry(() => stmt.run<T>(), {
        maxRetries: asRetryCount(3),
        initialDelayMs: asTimeoutMs(50),
        maxDelayMs: asTimeoutMs(500),
        factor: asRetryFactor(2),
        retryOn: isRetryableD1Error,
      });
    },
    async first<T = unknown>(colName?: string): Promise<T | null> {
      return withRetry(() => stmt.first<T>(colName!), {
        maxRetries: asRetryCount(3),
        initialDelayMs: asTimeoutMs(50),
        maxDelayMs: asTimeoutMs(500),
        factor: asRetryFactor(2),
        retryOn: isRetryableD1Error,
      });
    },
    async all<T = unknown>(): Promise<D1Result<T>> {
      return withRetry(() => stmt.all<T>(), {
        maxRetries: asRetryCount(3),
        initialDelayMs: asTimeoutMs(50),
        maxDelayMs: asTimeoutMs(500),
        factor: asRetryFactor(2),
        retryOn: isRetryableD1Error,
      });
    },
    async raw<T = unknown>(): Promise<T[]> {
      return withRetry(() => stmt.raw<T>(), {
        maxRetries: asRetryCount(3),
        initialDelayMs: asTimeoutMs(50),
        maxDelayMs: asTimeoutMs(500),
        factor: asRetryFactor(2),
        retryOn: isRetryableD1Error,
      });
    },
  } as D1PreparedStatement;
}

export function wrapD1WithRetry(db: D1Database): D1Database {
  const originalPrepare = db.prepare?.bind(db);
  const originalBatch = db.batch?.bind(db);
  const originalExec = db.exec?.bind(db);
  const originalDump = db.dump?.bind(db);

  return {
    prepare(source: string): D1PreparedStatement {
      if (!originalPrepare) throw new InfrastructureError('D1Database.prepare is not available');
      return wrapStatement(originalPrepare(asSqlQuery(source)));
    },
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      if (!originalBatch) throw new InfrastructureError('D1Database.batch is not available');
      return withRetry(() => db.batch<T>(statements), {
        maxRetries: asRetryCount(3),
        initialDelayMs: asTimeoutMs(50),
        maxDelayMs: asTimeoutMs(500),
        factor: asRetryFactor(2),
        retryOn: isRetryableD1Error,
      });
    },
    async exec(query: string): Promise<D1ExecResult> {
      if (!originalExec) throw new InfrastructureError('D1Database.exec is not available');
      return withRetry(() => originalExec(asSqlQuery(query)), {
        maxRetries: asRetryCount(3),
        initialDelayMs: asTimeoutMs(50),
        maxDelayMs: asTimeoutMs(500),
        factor: asRetryFactor(2),
        retryOn: isRetryableD1Error,
      });
    },
    async dump(): Promise<ArrayBuffer> {
      if (!originalDump) throw new InfrastructureError('D1Database.dump is not available');
      return withRetry(() => originalDump(), {
        maxRetries: asRetryCount(3),
        initialDelayMs: asTimeoutMs(50),
        maxDelayMs: asTimeoutMs(500),
        factor: asRetryFactor(2),
        retryOn: isRetryableD1Error,
      });
    },
  } as D1Database;
}
