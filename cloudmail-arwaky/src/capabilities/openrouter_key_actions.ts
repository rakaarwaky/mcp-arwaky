// capabilities/openrouter_key_actions.ts
// Key extraction logic for OpenRouter.
// Extracted from OpenRouterAutomationActions to satisfy file-length constraints.

import type { IChromeCdpPort, IMetricsCollectorPort, ITracerPort } from '../contract';
import {
  OPENROUTER_INIT_SLEEP_MS,
  OPENROUTER_REDIRECTION_SLEEP_MS,
  OPENROUTER_MODAL_SLEEP_MS,
  ApiKeyPlain,
  asUrl,
  asSelector,
  asJavascriptExpression,
  asTimeoutMs,
  asApiKeyPlain,
  asRawText,
  asRetryCount,
  asServiceName,
  asAction,
  asSpanName,
  SleepMs
} from '../taxonomy';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';
import { withTracing } from '../infrastructure/telemetry_tracer_helper';
import { withRetry } from '../infrastructure/resilience_retry_adapter';

/**
 * Navigates to the keys page and extracts the API key.
 * If no key exists, it attempts to create one named 'cmf-auto'.
 */
export async function extractApiKey(
  cdp: IChromeCdpPort,
  metrics: IMetricsCollectorPort,
  tracer: ITracerPort,
  sleep: (ms: SleepMs) => Promise<void>
): Promise<ApiKeyPlain | null> {
  return await withTracing(tracer, asSpanName('openrouter.extract_key'), {}, async () => {
    return await withMetrics(metrics, asServiceName('automation'), asAction('extractApiKey'), async () => {
      return await withRetry(async () => {
        await cdp.navigate(asUrl('https://openrouter.ai/settings/keys'));
        await sleep(OPENROUTER_REDIRECTION_SLEEP_MS);

        // Check if a key already exists
        const pageText = await cdp.getPageText();
        const existing = pageText.match(/sk-or-v1-[a-zA-Z0-9_-]+/);
        if (existing) return asApiKeyPlain(existing[0]);

        // Try clicking "Create Key" or similar
        await cdp.evaluate(asJavascriptExpression(`
          Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.trim().toLowerCase() === 'create')?.click();
          void 0;
        `));
        await sleep(OPENROUTER_MODAL_SLEEP_MS);

        // Often a modal appears asking for key name
        const hasNameInput = await cdp.waitForSelector(
          asSelector('input[placeholder*="name"], input[name="name"]'),
          asTimeoutMs(2000)
        );
        if (hasNameInput) {
          await cdp.insertText(
            asSelector('input[placeholder*="name"], input[name="name"]'),
            asRawText('cmf-auto-' + Date.now())
          );
          await cdp.evaluate(asJavascriptExpression(`
            Array.from(document.querySelectorAll('button'))
              .find(b => b.textContent.trim().toLowerCase() === 'create')?.click();
            void 0;
          `));
          await sleep(OPENROUTER_INIT_SLEEP_MS);
        }

        // Re-scan page for key using robust selectors
        const keyResult = await cdp.evaluate(asJavascriptExpression(`
          (() => {
            let el = document.querySelector('code, .Key_key__*, [data-testid^="key"]');
            let text = el ? el.textContent.trim() : '';
            if (!text) {
              let m = document.body.textContent.match(/sk-or-v1-[a-zA-Z0-9_-]+/);
              text = m ? m[0] : '';
            }
            return text;
          })()
        `)) as string;

        return keyResult ? asApiKeyPlain(keyResult) : null;
      }, { maxRetries: asRetryCount(2), initialDelayMs: asTimeoutMs(2000) });
    });
  });
}
