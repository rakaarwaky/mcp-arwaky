// infrastructure/config_loader.ts
// Configuration loader — reads config.yaml, overrides with env vars
// Usage in Worker: env vars only (no filesystem)
// Usage in Node: reads config.yaml first, then env overrides
//
// Pattern: config.yaml → .env → process.env
// @ts-ignore: Optional Node logic
import * as fs from 'fs';
// @ts-ignore: Optional Node logic
import * as path from 'path';
import {
  Domain, Url, TimeoutSeconds, PollIntervalSeconds, SessionMaxAge, MaxAgeHours,
  CookieName, EmailAddress, Password, DisplayName,
  MaxInboxes, MaxEmailsPerInbox, RequestsPerMinute,
  asDomain, asUrl, asTimeoutSeconds, asPollIntervalSeconds, asSessionMaxAge, asMaxAgeHours,
  asCookieName, asPassword, asDisplayName,
  asMaxInboxes, asMaxEmailsPerInbox, asRequestsPerMinute,
  asFeatureFlag, asFaultId, asChromePath, asUserDataDir, asRemoteDebuggingPort,
  AppConfig
} from '../taxonomy';
import { createEmailAddress } from '../taxonomy';

type DeepMutable<T> = T extends { readonly __brand: any }
  ? T
  : T extends object
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

const DEFAULT_PORT: number = (() => {
  if (typeof process !== 'undefined' && process.env && process.env.PORT) {
    const p = parseInt(process.env.PORT, 10);
    if (Number.isFinite(p) && p > 0 && p < 65536) return p;
  }
  return 8787;
})();

// ── Defaults ──

const DEFAULTS: AppConfig = {
  api: { baseUrl: asUrl(`http://localhost:${DEFAULT_PORT}`), timeoutMs: asTimeoutSeconds(30000) },
  email: { defaultDomain: asDomain(''), cleanupMaxAgeHours: asMaxAgeHours(24), pollIntervalSeconds: asPollIntervalSeconds(5), pollTimeoutSeconds: asTimeoutSeconds(60) },
  session: { maxAgeSeconds: asSessionMaxAge(604800), cookieName: asCookieName('mailflare_session') },
  account: { expiryHours: asMaxAgeHours(24) },
  rateLimit: { defaultLimit: asRequestsPerMinute(100), windowSeconds: asTimeoutSeconds(60) },
  quota: { maxInboxesPerKey: asMaxInboxes(10), maxEmailsPerInbox: asMaxEmailsPerInbox(1000), maxRequestsPerMinute: asRequestsPerMinute(100) },
  admin: { email: createEmailAddress('admin@localhost.local'), password: asPassword(''), displayName: asDisplayName('') },
  automation: {
    chromePath: asChromePath('/usr/bin/google-chrome-stable'),
    userDataDir: asUserDataDir('/tmp/cmf-chrome-profile'),
    port: asRemoteDebuggingPort(9222),
    headless: false,
  },
  featureFlags: {},
  resilience: {
    faultInjection: {},
  },
};

// ── YAML Parser (minimal, no external deps) ──

function parseYamlSimple(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let currentSection: string | null = null;
  let currentSub: Record<string, unknown> | null = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Top-level key: value
    const topMatch = trimmed.match(/^(\w+):\s*(.*)/);
    if (topMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
      currentSection = topMatch[1]!;
      currentSub = {};
      result[currentSection] = currentSub;
      const val = topMatch[2]!.trim();
      if (val && !val.startsWith('#')) {
        currentSub._value = parseValue(val);
      }
      continue;
    }

    // Nested key: value
    if (currentSub && trimmed) {
      const nestedMatch = trimmed.match(/^(\w+):\s*(.*)/);
      if (nestedMatch) {
        const key = nestedMatch[1]!;
        const val = nestedMatch[2]!.trim();
        currentSub[key] = val ? parseValue(val) : {};
      }
    }
  }

  return result;
}

function parseValue(val: string): unknown {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === '' || val.startsWith('#')) return '';
  const num = Number(val);
  if (!isNaN(num) && val !== '') return num;
  return val;
}

function parseEnvSimple(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1]!.trim();
      let val = match[2]!.trim();
      // Remove quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      result[key] = val;
    }
  }
  return result;
}

// ── Config Loader ──

let cachedConfig: AppConfig | null = null;

export function loadConfig(projectRoot?: string): AppConfig {
  if (cachedConfig) return cachedConfig;

  const config = structuredClone(DEFAULTS) as DeepMutable<AppConfig>;
  const envOverrides: Record<string, string> = {};

  // Layer 1: Read config.yaml and .env (Node only)
  const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
  if (isNode && fs && fs.readFileSync) {
    try {
      const root = projectRoot ?? process.cwd();
      
      // Load config.yaml
      const yamlPath = path.join(root, 'config.yaml');
      if (fs.existsSync(yamlPath)) {
        const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
        const yaml = parseYamlSimple(yamlContent);
        mergeYaml(config, yaml);
      }

      // Load .env if exists
      const envPath = path.join(root, '.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const envVars = parseEnvSimple(envContent);
        Object.assign(envOverrides, envVars);
      }
    } catch { /* ignore errors */ }
  }

  // Layer 2: Override with environment variables
  mergeEnv(config, { ...process.env, ...envOverrides });

  cachedConfig = config as unknown as AppConfig;
  return cachedConfig;
}

function mergeYaml(config: DeepMutable<AppConfig>, yaml: Record<string, unknown>): void {
  const api = yaml.api as Record<string, unknown> | undefined;
  const email = yaml.email as Record<string, unknown> | undefined;
  const session = yaml.session as Record<string, unknown> | undefined;
  const account = yaml.account as Record<string, unknown> | undefined;
  const rateLimit = yaml.rate_limit as Record<string, unknown> | undefined;
  const quota = yaml.quota as Record<string, unknown> | undefined;
  const admin = yaml.admin as Record<string, unknown> | undefined;

  if (api) {
    if (api.base_url) config.api.baseUrl = asUrl(String(api.base_url));
    if (api.timeout_ms) config.api.timeoutMs = asTimeoutSeconds(Number(api.timeout_ms));
  }
  if (email) {
    if (email.default_domain) config.email.defaultDomain = asDomain(String(email.default_domain));
    if (email.cleanup_max_age_hours) config.email.cleanupMaxAgeHours = asMaxAgeHours(Number(email.cleanup_max_age_hours));
    if (email.poll_interval_seconds) config.email.pollIntervalSeconds = asPollIntervalSeconds(Number(email.poll_interval_seconds));
    if (email.poll_timeout_seconds) config.email.pollTimeoutSeconds = asTimeoutSeconds(Number(email.poll_timeout_seconds));
  }
  if (session) {
    if (session.max_age_seconds) config.session.maxAgeSeconds = asSessionMaxAge(Number(session.max_age_seconds));
    if (session.cookie_name) config.session.cookieName = asCookieName(String(session.cookie_name));
  }
  if (account) {
    if (account.expiry_hours) config.account.expiryHours = asMaxAgeHours(Number(account.expiry_hours));
  }
  if (rateLimit) {
    if (rateLimit.default_limit) config.rateLimit.defaultLimit = asRequestsPerMinute(Number(rateLimit.default_limit));
    if (rateLimit.window_seconds) config.rateLimit.windowSeconds = asTimeoutSeconds(Number(rateLimit.window_seconds));
  }
  if (quota) {
    if (quota.max_inboxes_per_key) config.quota.maxInboxesPerKey = asMaxInboxes(Number(quota.max_inboxes_per_key));
    if (quota.max_emails_per_inbox) config.quota.maxEmailsPerInbox = asMaxEmailsPerInbox(Number(quota.max_emails_per_inbox));
    if (quota.max_requests_per_minute) config.quota.maxRequestsPerMinute = asRequestsPerMinute(Number(quota.max_requests_per_minute));
  }
  if (admin) {
    if (admin.email) config.admin.email = createEmailAddress(String(admin.email));
    if (admin.password) config.admin.password = asPassword(String(admin.password));
    if (admin.display_name) config.admin.displayName = asDisplayName(String(admin.display_name));
  }
  if (yaml.feature_flags && typeof yaml.feature_flags === 'object') {
    Object.entries(yaml.feature_flags as Record<string, unknown>).forEach(([k, v]) => {
      config.featureFlags[asFeatureFlag(k)] = !!v;
    });
  }
  if (yaml.resilience && typeof yaml.resilience === 'object') {
    const res = yaml.resilience as Record<string, unknown>;
    if (res.fault_injection && typeof res.fault_injection === 'object') {
      const fi = res.fault_injection as Record<string, Record<string, unknown>>;
      Object.entries(fi).forEach(([k, v]) => {
        config.resilience.faultInjection[asFaultId(k)] = {
          enabled: !!v.enabled,
          probability: Number(v.probability) || 0,
          delayMs: v.delay_ms ? Number(v.delay_ms) : undefined,
          delayProbability: v.delay_probability ? Number(v.delay_probability) : undefined,
        };
      });
    }
  }
}

function mergeEnv(config: DeepMutable<AppConfig>, envOverrides?: Record<string, string | undefined>): void {
  const env = envOverrides ?? (typeof process !== 'undefined' ? process.env : {} as Record<string, string | undefined>);

  // API
  if (env.CMF_API_BASE_URL) config.api.baseUrl = asUrl(env.CMF_API_BASE_URL);
  if (env.CLOUD_MAIL_FLARE_URL) config.api.baseUrl = asUrl(env.CLOUD_MAIL_FLARE_URL);

  // Email
  if (env.MAILFLARE_USER_DOMAIN) config.email.defaultDomain = asDomain(env.MAILFLARE_USER_DOMAIN);
  if (env.CLEANUP_MAX_AGE_HOURS) config.email.cleanupMaxAgeHours = asMaxAgeHours(parseInt(env.CLEANUP_MAX_AGE_HOURS, 10));

  // Session
  if (env.CMF_SESSION_MAX_AGE) config.session.maxAgeSeconds = asSessionMaxAge(parseInt(env.CMF_SESSION_MAX_AGE, 10));

  // Rate limit
  if (env.CMF_RATE_LIMIT_DEFAULT) config.rateLimit.defaultLimit = asRequestsPerMinute(parseInt(env.CMF_RATE_LIMIT_DEFAULT, 10));
  if (env.CMF_RATE_LIMIT_WINDOW) config.rateLimit.windowSeconds = asTimeoutSeconds(parseInt(env.CMF_RATE_LIMIT_WINDOW, 10));

  // Quota
  if (env.CMF_QUOTA_MAX_INBOXES) config.quota.maxInboxesPerKey = asMaxInboxes(parseInt(env.CMF_QUOTA_MAX_INBOXES, 10));
  if (env.CMF_QUOTA_MAX_EMAILS) config.quota.maxEmailsPerInbox = asMaxEmailsPerInbox(parseInt(env.CMF_QUOTA_MAX_EMAILS, 10));
  if (env.CMF_QUOTA_MAX_RPM) config.quota.maxRequestsPerMinute = asRequestsPerMinute(parseInt(env.CMF_QUOTA_MAX_RPM, 10));

  // Admin
  if (env.CMF_ADMIN_EMAIL) config.admin.email = createEmailAddress(env.CMF_ADMIN_EMAIL);
  if (env.CMF_ADMIN_PASSWORD) config.admin.password = asPassword(env.CMF_ADMIN_PASSWORD);
  if (env.CMF_ADMIN_DISPLAY_NAME) config.admin.displayName = asDisplayName(env.CMF_ADMIN_DISPLAY_NAME);

  // Automation
  if (env.CHROME_PATH) config.automation.chromePath = asChromePath(env.CHROME_PATH);
  if (env.CHROME_USER_DATA_DIR) config.automation.userDataDir = asUserDataDir(env.CHROME_USER_DATA_DIR);
  if (env.CHROME_DEBUG_PORT) config.automation.port = asRemoteDebuggingPort(parseInt(env.CHROME_DEBUG_PORT, 10));
  if (env.CHROME_HEADLESS) config.automation.headless = env.CHROME_HEADLESS === 'true';
}

// ── For Worker runtime (env only, no fs) ──

export function loadConfigFromEnv(env: Record<string, string | undefined>): AppConfig {
  const config = structuredClone(DEFAULTS) as DeepMutable<AppConfig>;
  mergeEnv(config, env);
  return config as AppConfig;
}

// ── Export singleton ──

export function getConfig(): AppConfig {
  return loadConfig();
}
