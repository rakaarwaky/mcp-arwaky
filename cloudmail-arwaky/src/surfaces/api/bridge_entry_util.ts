// surfaces/api/agent_entry_util.ts
// Helper — get orchestrator from env (replaces 3-line boilerplate in every handler)

import { getLifecycleManager } from '../../agent/lifecycle_state_manager';
import type { AgentEnv } from '../../agent/di_container_registry';
import type { AgentOrchestrator } from '../../agent/request_flow_facade';

export function getAgent(env: AgentEnv): AgentOrchestrator {
  const manager = getLifecycleManager();
  manager.initialize(env);
  return manager.getOrchestrator()!;
}
