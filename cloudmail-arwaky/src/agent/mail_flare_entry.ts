import type { AgentEnv } from './di_container_registry';
import { handleApiRequest } from '../surfaces/api/api_route_registry';
import { ensureMigration } from './mail_flare_migration';
import { handleInboundEmail } from './mail_flare_handler';
import { runCleanup } from './mail_flare_cleanup';
import { agentLogger } from './logging_singleton_adapter';

export default {
  async fetch(request: Request, env: AgentEnv, ctx: ExecutionContext): Promise<Response> {
    await ensureMigration(env);

    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, ctx);
    }

    if (env.ASSETS) {
      try {
        const resp = await env.ASSETS.fetch(request.clone() as Request);
        if (resp.status !== 404) return resp;

        const isNavigation = request.method === 'GET' && !url.pathname.includes('.');

        if (isNavigation) {
          agentLogger.info(`[routing] SPA fallback for: ${url.pathname} -> /index.html`);
          const indexUrl = new URL('/', request.url).toString();
          return await env.ASSETS.fetch(new Request(indexUrl, {
            method: 'GET',
            headers: request.headers
          }));
        }

        return resp;
      } catch (err) {
        agentLogger.error(`[routing] Asset fetch error: ${err}`);
      }
    }

    return new Response('Not found', { status: 404 });
  },

  async email(message: ForwardableEmailMessage, env: AgentEnv, ctx: ExecutionContext) {
    agentLogger.info(`[EMAIL-HANDLER] CALLED! from=${message.from} to=${message.to}`);
    ctx.waitUntil(handleInboundEmail(message, env, ctx, this.fetch.bind(this) as any));
  },

  async scheduled(_controller: ScheduledController, env: AgentEnv, ctx: ExecutionContext) {
    ctx.waitUntil(runCleanup(env));
  }
};