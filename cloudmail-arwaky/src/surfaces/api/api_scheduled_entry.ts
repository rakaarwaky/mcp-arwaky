// surfaces/api/api_scheduled_entry.ts
// Cloudflare Workers scheduled handler — cleanup on cron trigger

import type { AgentEnv } from '../../agent/di_container_registry';
import { asMaxAgeHours } from '../../taxonomy';
import { getAgent } from './bridge_entry_util';
import { logger } from './api_logger_util';

export async function handleScheduled(
  _event: ScheduledEvent,
  env: AgentEnv & { CLEANUP_MAX_AGE_HOURS?: string },
  _ctx: ExecutionContext
): Promise<void> {
  const agent = getAgent(env);
  const maxAgeHours = parseInt(env.CLEANUP_MAX_AGE_HOURS ?? '24', 10);
  const result = await agent.runCleanup(asMaxAgeHours(maxAgeHours));

  logger.info('cleanup complete', {
    aspect: 'scheduled',
    expiredEmails: result.expiredEmails,
    expiredSessions: result.expiredSessions,
    ranAt: result.ranAt
  });
}
