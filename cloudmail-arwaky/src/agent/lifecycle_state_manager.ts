// agent/lifecycle_state_manager.ts
// Brain stem — manages how the agent lives
// Init, alive, shutdown. That's it. No routing. No surface logic.

import { createContainer, type AgentEnv, type AgentContainer } from './di_container_registry';
import { AgentOrchestrator } from './request_flow_facade';
import type { ErrorMessage, Timestamp, FlagState, UptimeMs, RequestCount, UserId } from '../taxonomy';
import { asFlagState, asLogMessage, asUptimeMs } from '../taxonomy';
import { structuredLogger } from '../infrastructure/structured_logger_util';

export interface LifecycleState {
  initialized: FlagState;
  startTime: Timestamp;
  requestCount: RequestCount;
  lastError: ErrorMessage | null;
}

export class AgentLifecycleManager {
  private container: AgentContainer | null = null;
  private orchestrator: AgentOrchestrator | null = null;
  private state: LifecycleState = {
    initialized: false as FlagState,
    startTime: '' as Timestamp,
    requestCount: 0 as RequestCount,
    lastError: null
  };

  // ── Heartbeat: initialize the agent ──
  initialize(env: AgentEnv): void {
    if (this.state.initialized) return;

    this.container = createContainer(env);
    this.orchestrator = new AgentOrchestrator(this.container);
    this.state.initialized = asFlagState(true);
    this.state.startTime = new Date().toISOString() as Timestamp;

    // Seed admin user from config (fire-and-forget)
    this.seedAdminUser().catch((err) => {
      structuredLogger.error(asLogMessage('Lifecycle: admin seed error'), { error: String(err) });
    });
  }

  // ── Seed admin user from config.yaml / .env (ONCE only, idempotent) ──
  private async seedAdminUser(): Promise<void> {
    // Admin seeding moved to ensureMigration in mail_flare_worker.ts
    // This method is kept for backward compatibility but does nothing.
    return;
  }

  // ── Is the agent alive? ──
  isAlive(): FlagState {
    return this.state.initialized;
  }

  // ── Get health status ──
  getHealth(): { ok: FlagState; state: LifecycleState; uptimeMs: UptimeMs } {
    const uptimeMs = this.state.initialized
      ? asUptimeMs(Date.now() - new Date(this.state.startTime).getTime())
      : asUptimeMs(0);
    return {
      ok: (this.state.initialized && this.state.lastError === null) as FlagState,
      state: { ...this.state },
      uptimeMs
    };
  }

  // ── Get orchestrator (the nerve system) ──
  getOrchestrator(): AgentOrchestrator | null {
    return this.orchestrator;
  }

  // ── Get container (the heart) ──
  getContainer(): AgentContainer | null {
    return this.container;
  }

  // ── Increment request counter ──
  countRequest(): void {
    this.state.requestCount = (this.state.requestCount + 1) as RequestCount;
  }

  // ── Record error ──
  recordError(message: ErrorMessage): void {
    this.state.lastError = message;
  }
}

// ── Singleton ──
let _instance: AgentLifecycleManager | null = null;

export function getLifecycleManager(): AgentLifecycleManager {
  if (!_instance) {
    _instance = new AgentLifecycleManager();
  }
  return _instance;
}
