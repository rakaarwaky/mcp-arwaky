import type { AgentEnv } from './di_container_registry';
import { agentLogger } from './logging_singleton_adapter';

let migrationPromise: Promise<void> | null = null;

export async function ensureMigration(env: AgentEnv): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        const db = env.DB;
        if (db) {
          await db.prepare("ALTER TABLE emails ADD COLUMN IF NOT EXISTS deleted_at TEXT").run();
          await db.prepare("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS api_key TEXT").run();
          agentLogger.info('[migration] ensured columns exist');
        }
      } catch (err) {
        agentLogger.error('[migration] error:', { error: String(err) });
      }
    })();
  }
  await migrationPromise;
}