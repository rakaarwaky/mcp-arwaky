// contract/chrome_cdp_port.ts
// Port: Chrome DevTools Protocol (CDP) automation driver
// AES: Local-only infrastructure port. NEVER used in Cloudflare Worker.

import type { Url, ChromePath, UserDataDir, RemoteDebuggingPort, Headless, Selector, RawText, JavascriptExpression, TimeoutMs, ElementFound, ReturnByValue } from '../taxonomy';

export interface ChromeCdpConnectOptions {
  chromePath: ChromePath;
  userDataDir: UserDataDir;
  remoteDebuggingPort: RemoteDebuggingPort;
  headless?: Headless;
}

export interface IChromeCdpPort {
  connect(options: ChromeCdpConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  navigate(url: Url): Promise<void>;
  insertText(selector: Selector, text: RawText): Promise<void>;
  clickElement(selector: Selector): Promise<void>;
  clickButton(textContains: RawText): Promise<void>;
  evaluate(expression: JavascriptExpression, returnByValue?: ReturnByValue): Promise<unknown>;
  waitForSelector(selector: Selector, timeoutMs?: TimeoutMs): Promise<ElementFound>;
  getPageText(): Promise<RawText>;
  getUrl(): Promise<Url>;
  sendCommand(method: string, params?: Record<string, unknown>): Promise<unknown>;
}
