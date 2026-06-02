// capabilities/openrouter_form_actions.ts
// Low-level form interaction logic for OpenRouter signup.
// Extracted from OpenRouterAutomationActions to satisfy file-length constraints.

import type { IChromeCdpPort, IMetricsCollectorPort, ITracerPort } from '../contract';
import {
  OPENROUTER_INIT_SLEEP_MS,
  OPENROUTER_FORM_SLEEP_MS,
  DEFAULT_SELECTOR_TIMEOUT_MS,
  SUCCESS,
  FAILURE,
  asRawText,
  asSelector,
  asJavascriptExpression,
  asTimeoutMs,
  asSleepMs,
  asSpanName,
  asAction,
  asServiceName,
  EmailAddress,
  PasswordPlain,
  SleepMs
} from '../taxonomy';
import { withMetrics } from '../infrastructure/metrics_instrument_helper';
import { withTracing } from '../infrastructure/telemetry_tracer_helper';

/**
 * Fills the email and password fields in the signup form using multiple heuristic selectors.
 */
export async function fillSignUpForm(
  cdp: IChromeCdpPort,
  metrics: IMetricsCollectorPort,
  tracer: ITracerPort,
  email: EmailAddress,
  password: PasswordPlain,
  sleep: (ms: SleepMs) => Promise<void>
): Promise<void> {
  return await withTracing(tracer, asSpanName('openrouter.fill_form'), {}, async () => {
    return await withMetrics(metrics, asServiceName('automation'), asAction('fillSignUpForm'), async () => {
      // Attempt specific selectors from SKILL.md first
      const emailSel = '#emailAddress-field, input[name="emailAddress"], input[type="email"]';
      const passSel = '#password-field, input[name="password"], input[type="password"]';
      const legalSel = 'input[name="legalAccepted"]';

      await cdp.waitForSelector(asSelector(emailSel), DEFAULT_SELECTOR_TIMEOUT_MS);
      console.log('[DEBUG] Email selector matched, inserting:', email.full);
      await cdp.insertText(asSelector(emailSel), asRawText(email.full));
      
      await cdp.waitForSelector(asSelector(passSel), DEFAULT_SELECTOR_TIMEOUT_MS);
      console.log('[DEBUG] Password selector matched, inserting:', '***');
      await cdp.insertText(asSelector(passSel), asRawText(password as unknown as string));

      // Accept terms if present
      const hasLegal = await cdp.evaluate(asJavascriptExpression(`!!document.querySelector('${legalSel}')`)) as boolean;
      if (hasLegal) {
        await cdp.evaluate(asJavascriptExpression(`document.querySelector('${legalSel}').click(); void 0`));
      }

      await sleep(OPENROUTER_FORM_SLEEP_MS);

      // ── DIAGNOSTIC: dump form state before clicking ──
      const formState = await cdp.evaluate(asJavascriptExpression(`
        (() => {
          const emailVal = document.querySelector('input[type="email"], input[name="emailAddress"]')?.value || '';
          const passVal = document.querySelector('input[type="password"]')?.value || '';
          const legalChecked = document.querySelector('input[name="legalAccepted"]')?.checked || false;
          const btn = document.querySelector('button, [role="button"], input[type="submit"]');
          const btnDisabled = btn ? (btn.hasAttribute ? btn.hasAttribute('disabled') : btn.disabled) : 'unknown';
          const btnText = btn ? (btn.textContent?.trim() || '') : '';
          return { email: emailVal, pass: passVal, legalChecked, btnDisabled, btnText };
        })()
      `)) as Record<string, unknown>;
      console.log('[DIAG-form] Email:', formState.email, '| PassLen:', (formState.pass as string)?.length, '| Legal:', formState.legalChecked, '| BtnDisabled:', formState.btnDisabled, '| Btn:', formState.btnText);
      const webdriver = await cdp.evaluate(asJavascriptExpression('navigator.webdriver')) as boolean | undefined;
      const ua = await cdp.evaluate(asJavascriptExpression('navigator.userAgent')) as string | undefined;
      console.log('[DIAG-stealth] webdriver:', webdriver, '| UA:', ua?.slice(0, 80));
      
      // Wait for the Continue button to become enabled (debounce after validation)
      const btnEnabled = await cdp.waitForSelector(asSelector('button:not([disabled]), [role="button"]:not([disabled]), input[type="submit"]:not([disabled])'), asTimeoutMs(5000));
      if (!btnEnabled) {
        const pageText = (await cdp.getPageText()).slice(0, 500);
        throw new Error('Submit button never enabled. Page text: ' + pageText);
      }
      
      // Wait for Cloudflare Turnstile token
      const TURNSTILE_TIMEOUT_MS = 15000;
      const turnstileStart = Date.now();
      let turnstileInputPresent = false;
      let token = '';

      while (Date.now() - turnstileStart < TURNSTILE_TIMEOUT_MS) {
        const inputExists = await cdp.evaluate(asJavascriptExpression(`!!document.querySelector('input[name="cf-turnstile-response"]')`)) as boolean;
        if (inputExists) {
          turnstileInputPresent = true;
          token = await cdp.evaluate(asJavascriptExpression(`document.querySelector('input[name="cf-turnstile-response"]')?.value?.trim() || ''`)) as string;
          if (token.length > 0) {
            console.log('[DIAG] Turnstile token received:', token.slice(0, 20) + '...');
            break;
          }
        }
        await sleep(asSleepMs(200));
      }

      if (turnstileInputPresent && !token) {
        throw new Error(`Turnstile input present but token stayed empty after ${TURNSTILE_TIMEOUT_MS}ms — challenge likely unsolved`);
      }
      if (!turnstileInputPresent) {
        console.log('[DIAG] No Turnstile input detected — proceeding without Turnstile');
      }

      // ── Trusted click via CDP Input.dispatchMouseEvent ──
      const buttonInfo = await cdp.evaluate(asJavascriptExpression(`
        (() => {
          const emailInput = document.querySelector('input[name="emailAddress"], input[type="email"], input[placeholder*="email"]');
          if (!emailInput) return { found: false, reason: 'no_email_input' };
          const emailRect = emailInput.getBoundingClientRect();
          const form = emailInput.closest('form');
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
          const candidates = all.map(el => {
            const r = el.getBoundingClientRect();
            const visible = isVisible(el);
            const inForm = form && form.contains(el);
            const cx = r.left + r.width/2, cy = r.top + r.height/2;
            const dist = visible ? Math.hypot(cx - (emailRect.left + emailRect.width/2), cy - (emailRect.top + emailRect.height/2)) : Infinity;
            const text = getText(el);
            const priority = inForm ? 0 : 1;
            const keywordScore = /continue|sign up|register|create|next|submit|go/i.test(text) ? 0 : 1;
            return { el, visible, inForm, dist, text, priority, keywordScore, r, cx, cy };
          }).filter(c => c.visible);
          if (candidates.length === 0) {
            return { found: false, reason: 'no_visible_button' };
          }
          candidates.sort((a, b) => { if (a.priority !== b.priority) return a.priority - b.priority; if (a.keywordScore !== b.keywordScore) return a.keywordScore - b.keywordScore; return a.dist - b.dist; });
          const target = candidates[0].el;
          const btnForm = target.closest('form');
          return {
            found: true,
            x: candidates[0].cx,
            y: candidates[0].cy,
            tag: target.tagName,
            text: getText(target),
            form_id: btnForm?.id || '',
            btnHtml: target.outerHTML.slice(0,300)
          };
        })()`)) as Record<string, unknown>;

      if (!buttonInfo.found) {
        throw new Error(`Submit failed — ${buttonInfo.reason || 'Button not found'}`);
      }

      const btnX = buttonInfo.x as number;
      const btnY = buttonInfo.y as number;
      const btnText = buttonInfo.text as string;
      const btnTag = buttonInfo.tag as string;

      await cdp.evaluate(asJavascriptExpression(`
        (() => {
          const el = document.elementFromPoint(${btnX}, ${btnY});
          if (el) el.scrollIntoView({block: 'center', inline: 'center'});
        })()
      `));
      await sleep(asSleepMs(300));

      await cdp.sendCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x: btnX, y: btnY, button: 'left', clickCount: 1 });
      await cdp.sendCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x: btnX, y: btnY, button: 'left', clickCount: 1 });

      console.log(`✓ Trusted-clicked "${btnText}" (${btnTag}) at (${Math.round(btnX)},${Math.round(btnY)})`);

      await sleep(asSleepMs(1000));
      const postFormClickUrl = await cdp.getUrl();
      
      if (postFormClickUrl.includes('/sign-up')) {
        // Fallback or Turnstile handling
        const hasTurnstilePost = await cdp.evaluate(asJavascriptExpression(`!!document.querySelector('input[name="cf-turnstile-response"]')`)) as boolean;
        if (hasTurnstilePost) {
          console.log('[DIAG] Turnstile present after click — waiting...');
          await sleep(asSleepMs(20000));
        } else {
          console.log('[DIAG] Still on /sign-up — trying form.submit() fallback');
          await cdp.evaluate(asJavascriptExpression(`document.querySelector('form')?.submit(); void 0;`));
          await sleep(asSleepMs(4000));
        }
      }

      await sleep(OPENROUTER_INIT_SLEEP_MS);
    });
  });
}
