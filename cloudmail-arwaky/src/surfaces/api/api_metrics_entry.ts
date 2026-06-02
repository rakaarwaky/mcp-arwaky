// surfaces/api/api_metrics_entry.ts
// Metrics collection for the API surface

import type { AgentEnv } from '../../agent/di_container_registry';
import { getAgent } from './bridge_entry_util';
import { requireAuth, isResponse } from './auth_guard_util';

// Simple in-memory metrics store (per-isolate)
// In a real multi-region deployment, you'd aggregate these or use a central store.
const metrics = {
  requestCounts: new Map<string, number>(), // key: "method:path:status"
  durations: new Map<string, number[]>(),    // key: "method:path"
};

/**
 * Records a request's metrics.
 */
export function recordRequestMetrics(method: string, path: string, status: number, durationMs: number) {
  const key = `${method}:${path}:${status}`;
  metrics.requestCounts.set(key, (metrics.requestCounts.get(key) || 0) + 1);

  const durKey = `${method}:${path}`;
  const durs = metrics.durations.get(durKey) || [];
  durs.push(durationMs);
  // Keep only last 100 durations to prevent memory leak
  if (durs.length > 100) durs.shift();
  metrics.durations.set(durKey, durs);
}

/**
 * Exposes metrics in Prometheus format.
 */
export async function handleGetMetrics(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);
  // Security: only admin can view metrics
  const auth = await requireAuth(request, agent);
  if (isResponse(auth)) return auth;

  const user = await agent.getCurrentUser(auth.userId);
  if (!user || user.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }

  let output = '# HELP api_http_requests_total Total number of HTTP requests\n';
  output += '# TYPE api_http_requests_total counter\n';
  for (const [key, count] of metrics.requestCounts.entries()) {
    const [method, path, status] = key.split(':');
    output += `api_http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}\n`;
  }

  output += '\n# HELP api_http_request_duration_ms_avg Average HTTP request duration in milliseconds\n';
  output += '# TYPE api_http_request_duration_ms_avg gauge\n';
  for (const [key, durs] of metrics.durations.entries()) {
    const [method, path] = key.split(':');
    if (durs.length === 0) continue;
    const avg = durs.reduce((s, d) => s + d, 0) / durs.length;
    output += `api_http_request_duration_ms_avg{method="${method}",path="${path}"} ${avg.toFixed(2)}\n`;
  }

  return new Response(output, {
    headers: {
      'content-type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  });
}
