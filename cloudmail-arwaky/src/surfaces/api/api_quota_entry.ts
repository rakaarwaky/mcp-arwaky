// surfaces/api/api_quota_entry.ts
// Quota surface — resource limits and usage for authenticated user

import type { AgentEnv } from '../../agent/di_container_registry';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';
import type { AuthResult } from './auth_guard_util';
import { ok, err } from './api_inbox_util';
import type { QuotaLimits, QuotaUsage, FlagState, Count } from '../../taxonomy';
import { asFlagState, asCount } from '../../taxonomy';

export async function handleGetQuota(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  try {
    const [limits, usage] = await Promise.all([
      agent.getQuotaLimits(null, auth.userId),
      agent.getQuotaUsage(null, auth.userId)
    ]);

    const quotaInfo: QuotaInfo = {
      limits,
      usage,
      // Derived fields for convenience
      allowed: asFlagState(limits.maxInboxes > usage.currentInboxes && limits.requestsPerMinute > usage.requestsLastMinute),
      remainingInboxes: asCount(limits.maxInboxes - usage.currentInboxes)
    };

    return ok(quotaInfo, auth);
  } catch (error: any) {
    return err(error.message, 500, 'QUOTA_FETCH_FAILED', auth);
  }
}

interface QuotaInfo {
  limits: QuotaLimits;
  usage: QuotaUsage;
  allowed: FlagState;
  remainingInboxes: Count;
}
