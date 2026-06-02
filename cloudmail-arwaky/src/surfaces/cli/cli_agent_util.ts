// surfaces/cli/cli_agent_util.ts
// Agent factory — creates orchestrator from env/config

import { createLocalContainer, type LocalEnv } from '../../agent/di_container_registry';
import { AgentOrchestrator } from '../../agent/request_flow_facade';
import { asUrl, asAuthToken, asRetryCount, asTimeoutMs } from '../../taxonomy';
import type { AuthToken } from '../../taxonomy';

import { loadConfig } from './cli_config_loader';

import { withRetry } from '../../infrastructure/resilience_retry_adapter';
import { output } from './cli_main_entry';

let orchestrator: AgentOrchestrator | null = null;
export let currentToken: AuthToken | null = null;

export function setToken(token: AuthToken | null) { currentToken = token; }

export function getAgent(): AgentOrchestrator {
  if (!orchestrator) {
    const config = loadConfig(output.profile);
    const baseUrl = config.api?.baseUrl || '';
    const token = config.api?.token;
    
    const requestId = `cli-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const localEnv: LocalEnv = {
      baseUrl: asUrl(baseUrl),
      token: token ? asAuthToken(token) : undefined,
      requestId,
    };
    const container = createLocalContainer(localEnv);
    const realOrchestrator = new AgentOrchestrator(container);
    
    // Wrap orchestrator in a Proxy to automatically retry all calls
    orchestrator = new Proxy(realOrchestrator, {
      get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'function') {
          return (...args: any[]) => withRetry(
            () => val.apply(target, args),
            { maxRetries: asRetryCount(output.retries), initialDelayMs: asTimeoutMs(output.retryDelay) }
          );
        }
        return val;
      }
    });

    currentToken = token ? asAuthToken(token) : null;
  }
  return orchestrator;
}
