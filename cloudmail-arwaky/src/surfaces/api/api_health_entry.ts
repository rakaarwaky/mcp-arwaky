// surfaces/api/api_health_entry.ts
// Health surface — system health check entry point

import type { AgentEnv } from '../../agent/di_container_registry';
import { getLifecycleManager } from '../../agent/lifecycle_state_manager';
import { jsonResponse } from './http_response_util';
import { getAgent } from './bridge_entry_util';

export async function handleHealth(
  _request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const manager = getLifecycleManager();
  manager.initialize(env);
  const lifecycleHealth = manager.getHealth();

  try {
    const agent = getAgent(env);
    const dbStart = Date.now();
    const dbHealth = await agent.healthCheck();
    const dbTimingMs = Date.now() - dbStart;

    const dependencies = {
      database: (dbHealth.status as unknown as string) === 'healthy' ? 'healthy' : 'unhealthy',
      d1Binding: env.DB ? 'present' : 'missing',
      emailRouting: env.ALLOWED_ORIGINS ? 'configured' : 'not-configured',
    };

    const memory = {
      // Cloudflare Workers don't expose heap metrics, but we can report request count
      requestsSinceBoot: (lifecycleHealth.state as unknown as { requestCount?: number }).requestCount ?? 0,
    };

    const response = jsonResponse({
      ok: true,
      lifecycle: lifecycleHealth,
      database: { ...dbHealth, timingMs: dbTimingMs },
      dependencies,
      memory,
      timestamp: new Date().toISOString(),
    });
    response.headers.set('Cache-Control', 'public, max-age=30');
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Health check failed';
    return jsonResponse({
      ok: false,
      lifecycle: lifecycleHealth,
      database: { error: message },
      dependencies: { database: 'unhealthy', d1Binding: env.DB ? 'present' : 'missing' },
      timestamp: new Date().toISOString(),
    }, 503);
  }
}
