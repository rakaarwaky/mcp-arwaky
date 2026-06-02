import type { AgentEnv } from './di_container_registry';
import { agentLogger } from './logging_singleton_adapter';

export async function runCleanup(env: AgentEnv): Promise<void> {
  const db = env.DB;
  if (!db) return;

  const maxAgeHours = parseInt(String(env.CLEANUP_MAX_AGE_HOURS || '24'), 10);
  const now = new Date().toISOString();

  await db.prepare(
    "UPDATE emails SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL AND received_at <= datetime('now', '-' || ? || ' hours')"
  ).bind(maxAgeHours).run();

  await db.prepare(
    "DELETE FROM login_sessions WHERE expires_at <= CURRENT_TIMESTAMP"
  ).run();

  agentLogger.info('[scheduled] cleanup complete', { maxAgeHours, now });
}