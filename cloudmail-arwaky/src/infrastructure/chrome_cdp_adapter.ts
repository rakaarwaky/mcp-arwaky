// infrastructure/chrome_cdp_adapter.ts
// Chrome CDP adapter — launches native Chrome, drives via DevTools Protocol.
// WARNING: Local Node.js ONLY. Will NOT run inside Cloudflare Worker.

import { spawn, type ChildProcess } from 'child_process';
import WebSocket from 'ws';
import { pollDevToolsReady, fetchTabs, waitForEvent } from './chrome_devtools_util';

import type { IChromeCdpPort, ChromeCdpConnectOptions } from '../contract/chrome_cdp_port';
import { asServiceName } from '../taxonomy';
import type {
  Selector,
  TimeoutMs,
  ElementFound,
  RawText,
  Url,
  RemoteDebuggingPort
} from '../taxonomy';
import {
  asSelector,
  asTimeoutMs,
  asElementFound,
  asRawText,
  asUrl,
  asRemoteDebuggingPort,
  asErrorMessage,
  asCdpTargetId,
  asCdpMethod,
  asCdpDomain,
  asJavascriptExpression
} from '../taxonomy';
import type {
  CdpTargetId,
  CdpMethod,
  CdpDomain,
  ErrorMessage,
  JavascriptExpression,
  AttributeKey
} from '../taxonomy';
import { InfrastructureError } from '../taxonomy/platform_failure_error.js';

import { ResilienceBreakerAdapter } from './resilience_breaker_adapter.js';

import type { CdpTab } from './chrome_devtools_util';

interface CdpResponse {

  result?: {
    value?: unknown;
    exceptionDetails?: {
      exception?: {
        description?: ErrorMessage;
      };
    };
  };
  error?: {
    message: ErrorMessage;
  };
}

export class ChromeCdpAdapter implements IChromeCdpPort {
  private proc: ChildProcess | null = null;
  private ws: WebSocket | null = null;
  private msgId = 0;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private debuggingPort: RemoteDebuggingPort = asRemoteDebuggingPort(9222);
  private circuitBreaker: ResilienceBreakerAdapter;

  constructor() {
    this.circuitBreaker = new ResilienceBreakerAdapter(asServiceName('Chrome CDP'), {
      failureThreshold: 2,
      resetTimeoutMs: asTimeoutMs(30000)
    });
  }

  async connect(options: ChromeCdpConnectOptions): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      this.debuggingPort = options.remoteDebuggingPort;

      const args = [
        `--remote-debugging-port=${options.remoteDebuggingPort}`,
        '--remote-allow-origins=*',
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        `--user-data-dir=${options.userDataDir}`,
        ...(options.headless
          ? ['--headless=new', '--disable-gpu', '--no-sandbox']
          : ['--ozone-platform=wayland']),
      ];

      this.proc = spawn(options.chromePath, args, {
        detached: false,
        stdio: 'ignore',
      });

      // Wait for DevTools HTTP endpoint
      await pollDevToolsReady(options.remoteDebuggingPort, 15000);

      // Fetch tabs and connect to first
      const tabs = await fetchTabs(options.remoteDebuggingPort);
      if (!tabs.length) {
        throw new InfrastructureError('No CDP tabs available');
      }

      const target = tabs.find(t => t.url !== 'about:blank') ?? tabs[0]!;
      await this.connectWs(target.webSocketDebuggerUrl);


      // Enable required CDP domains BEFORE any navigation/action
      // Page & Network are critical; others are best-effort
      await this.ensureDomain(asCdpDomain('Page'));
      await this.ensureDomain(asCdpDomain('Network'));
      await this.ensureDomain(asCdpDomain('Runtime'));
      await this.ensureDomain(asCdpDomain('Input'));
      await this.ensureDomain(asCdpDomain('DOM'));
    });
  }

  private async ensureDomain(domain: CdpDomain): Promise<void> {
    try {
      await this.send(`${domain}.enable` as CdpMethod);
    } catch {
      // Domain may not exist in this Chrome version — ignore
    }
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.proc && !this.proc.killed) {
      this.proc.kill('SIGTERM');
      // Force kill after grace period
      setTimeout(() => this.proc?.kill('SIGKILL'), 3000);
    }
    this.pending.clear();
  }

  async navigate(url: Url): Promise<void> {
    // Start listening BEFORE sending navigate to avoid missing the event
    const loadPromise = waitForEvent(this.ws, 'Page.loadEventFired' as CdpMethod, 30000);
    await this.send('Page.navigate' as CdpMethod, { url });

    try {
      await loadPromise;
    } catch (e) {
      // Fallback: poll document.readyState (works even if Page events not received)
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        try {
          const state = await this.evaluate('document.readyState' as JavascriptExpression) as string;
          if (state === 'complete') return;
        } catch { /* ignore */ }
        await this.sleep(500);
      }
      throw new Error(`Navigation to ${url} timed out: Page.loadEventFired not received and readyState never became complete`);
    }
  }

  async insertText(selector: Selector, text: RawText): Promise<void> {
    // Focus the target element first
    await this.evaluate(`document.querySelector(${JSON.stringify(selector)})?.focus(); void 0;` as JavascriptExpression);
    await this.sleep(150);

    // Inject value directly via JavaScript (bypasses unreliable Input.insertText)
    const expr = `(function() {
      const el = document.querySelector('${selector}');
      if (!el) return 'element-not-found';
      el.value = ${JSON.stringify(text)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return el.value;
    })()`;
    const result = await this.evaluate(expr as JavascriptExpression);
    console.log('INSERT_TEXT_RESULT', result);
    await this.sleep(150);
  }

  async clickElement(selector: Selector): Promise<void> {
    const expr = `document.querySelector(${JSON.stringify(selector)})?.click(); void 0;` as JavascriptExpression;
    await this.evaluate(expr);
    await this.sleep(500);
  }

  async clickButton(textContains: RawText): Promise<void> {
    const expr = `
      (() => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent?.toLowerCase().includes(${JSON.stringify(textContains.toLowerCase())}));
        btn?.click();
      })();
    ` as JavascriptExpression;
    await this.evaluate(expr);
    await this.sleep(800);
  }

  async evaluate(expression: JavascriptExpression, returnByValue = true): Promise<unknown> {
    const resp = await this.send('Runtime.evaluate' as CdpMethod, {
      expression,
      returnByValue,
      awaitPromise: true,
    }) as CdpResponse;
    if (resp?.result?.exceptionDetails) {
      throw new InfrastructureError(`Evaluate error: ${resp.result.exceptionDetails.exception?.description || 'unknown'}`);
    }
    return resp?.result?.value ?? null;
  }

  async waitForSelector(selector: Selector, timeoutMs: TimeoutMs = asTimeoutMs(10000)): Promise<ElementFound> {
    const start = Date.now();
    while (Date.now() - start < (timeoutMs as number)) {
      const found = await this.evaluate(`!!document.querySelector(${JSON.stringify(selector)})` as JavascriptExpression) as boolean;
      if (found) return asElementFound(true);
      await this.sleep(300);
    }
    return asElementFound(false);
  }

  async getPageText(): Promise<RawText> {
    return asRawText(String(await this.evaluate('document.body?.innerText || ""' as JavascriptExpression)));
  }

  async getUrl(): Promise<Url> {
    return asUrl(String(await this.evaluate('window.location.href' as JavascriptExpression)));
  }

  async sendCommand(method: string, params?: Record<string, unknown>): Promise<unknown> {
    return this.send(method as CdpMethod, params);
  }

  // ─── Internal helpers ───

  private async connectWs(url: string): Promise<void> {
    this.ws = new WebSocket(url);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('CDP WS Connection Timeout')), 10000);

      this.ws!.on('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.ws!.on('message', (data: string) => {
        try {
          const msg = JSON.parse(data);
          if (msg.id && this.pending.has(msg.id)) {
            const { resolve: res, reject: rej } = this.pending.get(msg.id)!;
            this.pending.delete(msg.id);
            if (msg.error) {
              rej(new InfrastructureError(msg.error.message));
            } else {
              res(msg);
            }
          }
        } catch { /* ignore parse errors for non-JSON or other messages */ }
      });

      this.ws!.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.ws!.on('close', () => {
        this.ws = null;
      });
    });
  }

  private async send(method: CdpMethod, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.ws) throw new InfrastructureError('CDP not connected');

    const id = ++this.msgId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify({ id, method, params }));
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}

