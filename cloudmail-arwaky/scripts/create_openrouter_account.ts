#!/usr/bin/env tsx
/**
 * Cloud Mail Flare — Single OpenRouter Account Creation
 *
 * Pipeline: admin login → create CMF user → Chrome CDP signup → 2FA via inbox → extract API key.
 *
 * Output: JSON { cmf_email, cmf_password, openrouter_api_key }
 *
 * Usage: npx tsx scripts/create_openrouter_account.ts
 *
 * Env vars:
 *   CMF_ADMIN_EMAIL, CMF_ADMIN_PASSWORD       (required)
 *   CMF_API_BASE_URL                            (default: https://mail.immortalunion.space)
 *   OPENROUTER_CDP_PORT                         (default: 9555)
 *   OPENROUTER_USER_DATA_DIR                    (default: /tmp/chrome-openrouter-<timestamp>)
 *   CHROME_PATH                                 (default: google-chrome)
 */

import { createLocalContainer, type LocalEnv } from '../src/agent/di_container_registry';
import { AgentOrchestrator } from '../src/agent/request_flow_facade';
import {
  asUrl, asAuthToken, asUserId, asTimeoutSeconds, asPollIntervalSeconds,
  createEmailAddress, asVerificationCode, asSearchFrom, asSubject,
  asPasswordPlain,
} from '../src/taxonomy';
import type { VerificationCode } from '../src/taxonomy';
import type { OpenRouterSignupInput, OpenRouterSignupOutput } from '../src/contract';

// ── Configuration ──

const CMF_API_BASE = process.env.CMF_API_BASE_URL || 'https://mail.immortalunion.space';
const ADMIN_EMAIL = process.env.CMF_ADMIN_EMAIL || 'raka.admin@immortalunion.space';
const ADMIN_PASSWORD = process.env.CMF_ADMIN_PASSWORD || 'RakaArwaky1005!';
const CDP_PORT = parseInt(process.env.OPENROUTER_CDP_PORT || '9555', 10);
const USER_DATA_DIR = process.env.OPENROUTER_USER_DATA_DIR || `/tmp/chrome-openrouter-${Date.now()}`;
const CHROME_PATH = process.env.CHROME_PATH || 'google-chrome';

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: CMF_ADMIN_EMAIL and CMF_ADMIN_PASSWORD must be set');
  process.exit(1);
}

// ── OTP Provider using CMF inbox ──

class CmfInboxOtpProvider {
  constructor(private agent: AgentOrchestrator, private userId: string) {}

  async fetchOtp(): Promise<VerificationCode> {
    console.log('⏳ Waiting for OpenRouter verification email...');
    const email = await this.agent.waitForEmail(asUserId(this.userId), {
      from: asSearchFrom('noreply@openrouter.ai'),
      subject: asSubject('verification'),
      timeout: asTimeoutSeconds(120),
      pollInterval: asPollIntervalSeconds(5),
    });
    if (!email) throw new Error('OTP email not received within 120s');
    const body = email.bodyText || email.bodyHtml || '';
    const match = body.match(/\b\d{6}\b/);
    if (!match) throw new Error('Could not find 6-digit OTP in email body');
    console.log(`✓ OTP received: ${match[0]}`);
    return asVerificationCode(match[0]);
  }
}

// ── Main ──

async function main() {
  // Step 1: Build local container (talks to deployed Worker via HTTP)
  const localEnv: LocalEnv = {
    baseUrl: asUrl(CMF_API_BASE),
    token: undefined, // will set after login
    requestId: `openrouter-${Date.now()}`,
  };

  const container = createLocalContainer(localEnv);
  const agent = new AgentOrchestrator(container);

  try {
    // ── Admin login via direct HTTP ──
    console.log('1/4 Logging in as admin...');
    const loginResp = await fetch(`${CMF_API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    if (!loginResp.ok) {
      const errBody = await loginResp.text();
      throw new Error(`Login failed [${loginResp.status}]: ${errBody}`);
    }
    const loginResult: { token: string; expiresAt: string } = await loginResp.json();
    console.log(`✓ Authenticated (token: ${loginResult.token.slice(0, 16)}...)`);

    // Inject token into container's HTTP adapter for subsequent authorized calls
    (container.database as any).setToken(loginResult.token);

    // ── Create CMF user via direct HTTP POST ──
    console.log('\n2/4 Creating CMF user...');
    const timestamp = Date.now().toString().slice(-6);
    const username = `or_${timestamp}`;
    const userEmail = `or_${timestamp}@immortalunion.space`;
    const userPassword = `ORpass${Math.random().toString(36).slice(-6)}!`;

    const createResp = await fetch(`${CMF_API_BASE}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginResult.token}`,
      },
      body: JSON.stringify({
        email: userEmail,
        password: userPassword,
        displayName: username,
      }),
    });
    if (!createResp.ok) {
      const errBody = await createResp.text();
      throw new Error(`Failed to create CMF user: ${createResp.status} ${createResp.statusText} — ${errBody}`);
    }
    const createJson = await createResp.json() as { user: { id: string } };
    const { user } = createJson;
    console.log(`✓ CMF user created: ${userEmail} (ID: ${user.id})`);

    // Store credentials for OpenRouter signup
    const credentials = { email: createEmailAddress(userEmail), password: asPasswordPlain(userPassword) };

    // ── OpenRouter signup via Chrome CDP ──
    console.log('\n3/4 Launching Chrome CDP...');
    console.log(`   URL:      https://openrouter.ai/sign-up`);
    console.log(`   Email:    ${credentials.email.full}`);
    console.log(`   Chrome:   port ${CDP_PORT}, ${CHROME_PATH}`);
    console.log(`   Profile:  ${USER_DATA_DIR}`);

    // Override automation config for this run (config is readonly; replace the sub-object via cast)
    (container.config as { automation: Record<string, unknown> }).automation = {
      ...container.config.automation,
      port: CDP_PORT,
      userDataDir: USER_DATA_DIR,
      chromePath: CHROME_PATH,
      headless: false,  // Non-headless required for Turnstile (needs real display)
    };

    const otpProvider = new CmfInboxOtpProvider(agent, user.id);

    const signupInput: OpenRouterSignupInput = {
      email: credentials.email,
      password: credentials.password,
    };

    const signupResult: OpenRouterSignupOutput = await agent.openRouterSignup(signupInput, otpProvider);

    if (!signupResult.success || !signupResult.apiKey) {
      throw new Error(`OpenRouter signup failed [${signupResult.stage}]: ${signupResult.error}`);
    }

    console.log(`\n✓ OpenRouter account created!`);
    console.log(`   Stage: ${signupResult.stage}`);
    console.log(`   API Key: ${signupResult.apiKey.slice(0, 20)}...`);

    // ── Output ──
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('OPENROUTER ACCOUNT READY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`CMF Email:          ${credentials.email.full}`);
    console.log(`CMF Password:       ${credentials.password}`);
    console.log(`OpenRouter API Key: ${signupResult.apiKey}`);
    console.log('═══════════════════════════════════════════════════════');

    // JSON for programmatic parsing
    const jsonOutput = {
      cmf_email: credentials.email.full,
      cmf_password: credentials.password,
      openrouter_api_key: signupResult.apiKey,
    };
    console.log('\nJSON:');
    console.log(JSON.stringify(jsonOutput, null, 2));

  } catch (error: any) {
    console.error('\n✗ FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
