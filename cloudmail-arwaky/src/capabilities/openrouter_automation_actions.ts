// capabilities/openrouter_automation_actions.ts
// Implements IOpenRouterAutoProtocol — drives Chrome CDP for OpenRouter signup + key extraction.
// LOCAL NODE.JS ONLY. Never invoked inside Cloudflare Worker.

import type {
  IOpenRouterAutoProtocol,
  OpenRouterSignupInput,
  OpenRouterSignupOutput,
} from '../contract/openrouter_auto_protocol';
import { ResilienceBreakerAdapter as CircuitBreaker } from '../infrastructure/resilience_breaker_adapter';
import type { IChromeCdpPort, IMetricsCollectorPort, IFeatureFlagPort, ITracerPort } from '../contract';
import {
  OPENROUTER_INIT_SLEEP_MS,
  OPENROUTER_OTP_WAIT_MS,
  OPENROUTER_REDIRECTION_SLEEP_MS,
  SleepMs,
  SUCCESS,
  FAILURE,
  asUrl,
  asRawText,
  asSelector,
  asJavascriptExpression,
  asRecordValue,
  asSpanName,
  asAttributeKey,
  asServiceName,
  asAction,
  asVerificationCode, 
  asErrorMessage
} from '../taxonomy';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';
import { withTracing } from '../infrastructure/telemetry_tracer_helper';
import type { VerificationCode } from '../taxonomy';
import { fillSignUpForm } from './openrouter_form_actions';
import { extractApiKey } from './openrouter_key_actions';

export interface OtpProvider {
  /** Called when OTP field detected. Must return 6-digit code. */
  fetchOtp(): Promise<VerificationCode>;
}

/**
 * Orchestrates browser automation for OpenRouter.ai registration and key capture.
 *
 * NOTE: This capability is designed for local environment execution using CDP
 * and is not compatible with Cloudflare Workers.
 */
export class OpenRouterAutomationActions implements IOpenRouterAutoProtocol {
  private cb: CircuitBreaker;

  constructor(
    private cdp: IChromeCdpPort,
    private metrics: IMetricsCollectorPort,
    private featureFlags: IFeatureFlagPort,
    private tracer: ITracerPort,
    private otpProvider?: OtpProvider
  ) {
    this.cb = new CircuitBreaker(asServiceName('OpenRouter Automation'));
  }

  /**
   * Performs a complete signup flow on OpenRouter.ai.
   *
   * @param input Signup credentials (email, password)
   * @param otpProvider Optional OTP provider override
   * @returns Result of the signup operation including extracted API key
   */
  async runFullSignup(
    input: OpenRouterSignupInput,
    otpProvider?: OtpProvider
  ): Promise<OpenRouterSignupOutput> {
    return await withTracing(this.tracer, asSpanName('openrouter.signup'), { [asAttributeKey('email')]: input.email.full }, async () => {
      return await this.cb.execute(async () => {
        return await withMetrics(this.metrics, asServiceName('automation'), asAction('runFullSignup'), async () => {
          const otp = otpProvider ?? this.otpProvider;
          const out: OpenRouterSignupOutput = { success: FAILURE, stage: 'init' };

          try {
            out.stage = 'init';
            await this.cdp.navigate(asUrl('https://openrouter.ai/sign-up'));
            await this.sleep(OPENROUTER_INIT_SLEEP_MS);

            out.stage = 'form_fill';
            await fillSignUpForm(this.cdp, this.metrics, this.tracer, input.email, input.password, this.sleep.bind(this));

            // Wait for OTP field or redirect to dashboard
            const otpFieldExists = await this.cdp.waitForSelector(
              asSelector('input[aria-label="Enter verification code"], input[name="code"], input[placeholder*="code"]'),
              OPENROUTER_OTP_WAIT_MS
            );

            if (!otpFieldExists) {
              // Might already be on dashboard (email previously verified)
              const url = await this.cdp.getUrl();
              if (url.includes('/settings') || url.includes('/chat')) {
                out.stage = 'key_extract';
                const key = await extractApiKey(this.cdp, this.metrics, this.tracer, this.sleep.bind(this));
                out.success = SUCCESS;
                out.apiKey = key ?? undefined;
                out.stage = 'complete';
                return out;
              }
              // Diagnostic: dump URL and page snippet before throwing
              const pageText = await this.cdp.getPageText();
              const snippet = pageText.slice(0, 500);
              throw new Error(`OTP field did not appear and not redirected to app. Current URL: ${url}. Page snippet: ${snippet}`);
            }

            if (!otp) {
              throw new Error('OTP provider required but not provided');
            }

            out.stage = 'otp_wait';
            const code = await otp.fetchOtp();

            out.stage = 'otp_submit';
            await this.cdp.insertText(
              asSelector('input[aria-label="Enter verification code"], input[name="code"], input[placeholder*="code"]'),
              asRawText(code as unknown as string)
            );
            
            const otpClickResult = await this.cdp.evaluate(asJavascriptExpression(`
              (() => {
                const selectors = 'button, [role="button"], input[type="submit"], a[href="#"]';
                const all = Array.from(document.querySelectorAll(selectors));
                function getText(el) { return (el.tagName === 'INPUT' ? el.value : el.textContent)?.trim() || ''; }
                function isVisible(el) {
                  if (el.hasAttribute('disabled') || el.disabled) return false;
                  const s = window.getComputedStyle(el);
                  if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
                  if (el.hasAttribute('hidden')) return false;
                  const r = el.getBoundingClientRect();
                  if ((r.width === 0 && r.height === 0) || r.right < 0 || r.bottom < 0 || r.left > window.innerWidth || r.top > window.innerHeight) return false;
                  return true;
                }
                const candidates = all.map(el => ({
                  el,
                  text: getText(el),
                  disabled: el.disabled || el.hasAttribute('disabled'),
                  visible: isVisible(el)
                })).filter(c => c.visible && !c.disabled);
                if (candidates.length === 0) return { clicked: false, reason: 'no_match' };
                const target = candidates.find(c => /continue|verify|submit|activate|done|next/i.test(c.text)) || candidates[0];
                target.el.click();
                return { clicked: true, button: {text: target.text, tag: target.el.tagName} };
              })()
            `)) as {clicked: boolean, button?: {text: string, tag: string}};

            if (!otpClickResult.clicked) {
              throw new Error(`OTP submission failed — no submit button found`);
            }

            console.log(`✓ Clicked OTP button "${otpClickResult.button?.text}"`);
            
            await this.sleep(OPENROUTER_REDIRECTION_SLEEP_MS);

            out.stage = 'key_extract';
            const key = await extractApiKey(this.cdp, this.metrics, this.tracer, this.sleep.bind(this));
            out.success = SUCCESS;
            out.apiKey = key ?? undefined;
            out.stage = 'complete';
            return out;
          } catch (error) {
            out.success = FAILURE;
            out.error = asErrorMessage(error instanceof Error ? error.message : String(error));
            return out;
          }
        });
      });
    });
  }

  /**
   * Utility for async sleeping.
   *
   * @param ms Milliseconds to sleep (branded SleepMs)
   */
  private sleep(ms: SleepMs): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
