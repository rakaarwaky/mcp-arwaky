// infrastructure/chrome_devtools_util.ts
// Low-level HTTP and WebSocket helpers for Chrome DevTools Protocol

import http from 'http';
import WebSocket from 'ws';
import type { RemoteDebuggingPort, CdpTargetId, CdpMethod, ErrorMessage } from '../taxonomy';
import { asCdpTargetId, asErrorMessage } from '../taxonomy';
import { InfrastructureError } from '../taxonomy/platform_failure_error.js';

export interface CdpTab {
  id: CdpTargetId;
  url: string;
  webSocketDebuggerUrl: string;
}

export async function pollDevToolsReady(port: RemoteDebuggingPort, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await httpGet(`http://127.0.0.1:${port}/json`);
      return;
    } catch {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  throw new InfrastructureError(`DevTools did not become ready on port ${port} within ${timeoutMs}ms`);
}

export async function fetchTabs(port: RemoteDebuggingPort): Promise<CdpTab[]> {
  const body = await httpGet(`http://127.0.0.1:${port}/json`);
  const rawTabs = JSON.parse(body) as any[];
  return rawTabs.map(t => ({
    id: asCdpTargetId(String(t.id)),
    url: String(t.url || ''),
    webSocketDebuggerUrl: String(t.webSocketDebuggerUrl)
  })).filter(t => t.webSocketDebuggerUrl);
}

export function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

export function waitForEvent(ws: WebSocket | null, eventName: CdpMethod, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${eventName}`)), timeoutMs);
    if (!ws) { clearTimeout(timer); reject(new Error('No WS')); return; }
    const handler = (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.method === eventName) {
          clearTimeout(timer);
          ws.off('message', handler);
          resolve();
        }
      } catch { /* ignore */ }
    };
    ws.on('message', handler);
  });
}
