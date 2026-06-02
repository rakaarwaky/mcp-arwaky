// surfaces/api/api_cleanup_entry.ts
// Cleanup surface — trigger expired data cleanup

import type { AgentEnv } from '../../agent/di_container_registry';
import { asMaxAgeHours } from '../../taxonomy';
import { jsonResponse, errorResponse } from './http_response_util';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import { cleanupBodySchema } from '../../taxonomy/validation_schema_vo';

export async function handleCleanup(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const currentUser = await agent.getCurrentUser(auth.userId);
  if (!currentUser || currentUser.role !== 'admin') {
    return errorResponse('Forbidden: admin access required', 403, 'FORBIDDEN');
  }

  try {
    const body = await request.json().catch(() => ({}));
    const validation = cleanupBodySchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Invalid request: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'), 400, 'VALIDATION_ERROR');
    }
    const maxAgeHours = asMaxAgeHours(validation.data.maxAgeHours ?? 24);

    const result = await agent.runCleanup(maxAgeHours);
    return jsonResponse(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cleanup failed';
    return errorResponse(message, 500, 'CLEANUP_FAILED');
  }
}
