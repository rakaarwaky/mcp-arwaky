/// <reference types="@cloudflare/workers-types" />
import { handleApiRequest } from '../surfaces/api/api_route_registry';
import { createContainer } from './di_container_registry';
import type { AgentEnv } from './di_container_registry';
import { createEmailAddress, asPassword, asLogMessage, asUserId } from '../taxonomy';
import type { EmailId, Subject, Snippet, BodyText, Timestamp, RawMime, ContentType, HeadersJson, UserId } from '../taxonomy';
import type { EmailIngestInput } from '../contract/email_ingest_io';
import { CryptoPasswordAdapter } from '../infrastructure/crypto_password_adapter';
import { structuredLogger } from '../infrastructure/structured_logger_util';
import { handleInboundEmail } from './email_inbound_processor';

// ============================================================================
// MIGRATION STATE
// ============================================================================

let migrationPromise: Promise<void> | null = null;

async function ensureMigration(env: AgentEnv): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const db = env.DB;
      if (!db) return;

      try {
        // 1. Ensure columns exist - SQLite doesn't support IF NOT EXISTS in ALTER TABLE
        // We use try-catch for each to handle cases where they already exist
        try { await db.prepare("ALTER TABLE emails ADD COLUMN deleted_at TEXT").run(); } catch (e) {}
        try { await db.prepare("ALTER TABLE accounts ADD COLUMN api_key TEXT").run(); } catch (e) {}
        try { await db.prepare("ALTER TABLE accounts ADD COLUMN api_key_id TEXT").run(); } catch (e) {}

        // Bootstrap admin is now handled by a separate idempotent function
        await ensureAdminUser(env);
      } catch (err) {
        structuredLogger.error(asLogMessage('Migration error'), { error: String(err) });
      }
    })();
  }
  await migrationPromise;
}

// Extracted to separate function for idempotent admin bootstrap
async function ensureAdminUser(env: AgentEnv): Promise<void> {
  const db = env.DB;
  if (!db) return;

  const adminEmail = String(env.CMF_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminName = String(env.CMF_ADMIN_DISPLAY_NAME || 'Admin');
  const adminPass = String(env.CMF_ADMIN_PASSWORD || '').trim();
  
  if (!adminEmail || !adminPass) {
    structuredLogger.info(asLogMessage('Bootstrap: CMF_ADMIN_EMAIL/CMF_ADMIN_PASSWORD not configured — skipping admin bootstrap'));
    return;
  }

  const cryptoAdapter = new CryptoPasswordAdapter();
  const password = asPassword(adminPass);
  const hash = await cryptoAdapter.hashPassword(password);
  const userId = crypto.randomUUID() as UserId;

  // Use INSERT OR IGNORE + separate UPDATE to avoid race condition
  // First, try to insert. If email already exists, ignore.
  const insertResult = await db.prepare(`
    INSERT OR IGNORE INTO users (id, email, display_name, role, is_owner, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, 'admin', 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(userId, adminEmail, adminName, hash).run();

  // If inserted (changes > 0), done.
  if (insertResult.meta?.changes && insertResult.meta.changes > 0) {
    structuredLogger.info(asLogMessage('Bootstrap: admin user created'), { adminEmail, userId });
    return;
  }

  // Otherwise, ensure existing admin has correct role and password (if changed)
  await db.prepare(`
    UPDATE users 
    SET role = 'admin', 
        password_hash = ?, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE lower(email) = lower(?) AND (role != 'admin' OR password_hash != ?)
  `).bind(hash, adminEmail, hash).run();
  
  structuredLogger.info(asLogMessage('Bootstrap: admin user ensured'), { adminEmail });
}

// ============================================================================
// EMAIL INBOUND PROCESSING
// ============================================================================

async function runCleanup(env: AgentEnv, _ctx: ExecutionContext) {
  const db = env.DB;
  if (!db) return;

  const maxAgeHours = parseInt(String(env.CLEANUP_MAX_AGE_HOURS || '24'), 10);
  const now = new Date().toISOString();

  // 1. Cleanup old emails (soft delete)
  await db.prepare(
    "UPDATE emails SET deleted_at = CURRENT_TIMESTAMP WHERE deleted_at IS NULL AND received_at <= datetime('now', '-' || ? || ' hours')"
  ).bind(maxAgeHours).run();

  // 2. Cleanup old agent users (hard delete inboxes > 24h)
  // First, find IDs to delete to handle associated data
  const oldAgents = await db.prepare(
    "SELECT id FROM users WHERE role = 'agent' AND created_at <= datetime('now', '-' || ? || ' hours')"
  ).bind(maxAgeHours).all<{ id: string }>();

  if (oldAgents.results && oldAgents.results.length > 0) {
    const ids = oldAgents.results.map(r => r.id);
    const placeholders = ids.map(() => '?').join(',');
    
    // Hard delete associated data for these agents
    await db.prepare(`DELETE FROM emails WHERE inbox_id IN (${placeholders})`).bind(...ids).run();
    await db.prepare(`DELETE FROM accounts WHERE inbox_id IN (${placeholders})`).bind(...ids).run();
    await db.prepare(`DELETE FROM users WHERE id IN (${placeholders})`).bind(...ids).run();
    
    structuredLogger.info(asLogMessage('Scheduled: cleaned up agent inboxes'), { count: ids.length });
  }

  // 3. Cleanup expired sessions
  await db.prepare(
    "DELETE FROM login_sessions WHERE expires_at <= CURRENT_TIMESTAMP"
  ).run();

  structuredLogger.info(asLogMessage('Scheduled: cleanup complete'), { maxAgeHours, now });
}

// ============================================================================
// WORKER ENTRY POINT
// ============================================================================

// @ts-ignore - The server build is generated at build time
import * as build from "../surfaces/web/web-dist/server/index.js";
import { createRequestHandler } from "react-router";

const handleRequest = createRequestHandler(build);

export default {
  async fetch(request: Request, env: AgentEnv, ctx: ExecutionContext): Promise<Response> {
    // Ensure DB schema is up-to-date (runs once)
    await ensureMigration(env);

    const url = new URL(request.url);
    let response: Response;

    // 1. Handle API Requests
    if (url.pathname.startsWith('/api/')) {
      response = await handleApiRequest(request, env, ctx);
    } 
    // 2. Handle Static Assets (images, fonts, etc.)
    else if (env.ASSETS && (url.pathname.includes('.') || request.method !== 'GET')) {
      try {
        const resp = await env.ASSETS.fetch(request.clone() as Request);
        if (resp.status !== 404) {
          response = resp;
        } else {
          response = await this.handleSsr(request, env, ctx);
        }
      } catch (err) {
        structuredLogger.error(asLogMessage('Routing: asset fetch error'), { error: String(err) });
        response = await this.handleSsr(request, env, ctx);
      }
    } 
    // 3. Handle Navigation & All other requests via SSR
    else {
      if (url.pathname === '/login') {
        return Response.redirect(url.origin + '/', 302);
      }
      response = await this.handleSsr(request, env, ctx);
    }

    // Security headers (except for websocket upgrades)
    if (response.status !== 101) {
      const isHtml = (response.headers.get('content-type') ?? '').includes('text/html');
      const isProd = env?.NODE_ENV === 'production';
      const isHttps = url.protocol === 'https:';
      const requestId = response.headers.get('x-request-id') || crypto.randomUUID();

      const newHeaders = new Headers(response.headers);
      newHeaders.set('x-content-type-options', 'nosniff');
      newHeaders.set('x-frame-options', 'DENY');
      newHeaders.set('x-xss-protection', '1; mode=block');
      newHeaders.set('referrer-policy', 'strict-origin-when-cross-origin');
      newHeaders.set('permissions-policy', 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
      newHeaders.set('x-request-id', requestId);
      
      // HSTS — always on in production or HTTPS
      if (isProd || isHttps) {
        newHeaders.set('strict-transport-security', 'max-age=63072000; includeSubDomains; preload');
      }
      
      // For HTML (SSR), we must ensure CSP allows necessary resources
      if (isHtml) {
        let csp = "default-src 'self';";
        // Base scripts allowed in all envs
        const scriptSrc = ["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"];
        const connectSrc = ["'self'", "https://static.cloudflareinsights.com"];
        const styleSrc = ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"];
        const fontSrc = ["'self'", "https://fonts.gstatic.com"];
        const imgSrc = ["'self'", "data:", "https:"];

        if (!isProd) {
          scriptSrc.push("'unsafe-eval'");
        }

        csp += ` script-src ${scriptSrc.join(' ')};`;
        csp += ` style-src ${styleSrc.join(' ')};`;
        csp += ` img-src ${imgSrc.join(' ')};`;
        csp += ` font-src ${fontSrc.join(' ')};`;
        csp += ` connect-src ${connectSrc.join(' ')};`;
        csp += " object-src 'none'; base-uri 'self'; form-action 'self';";
        
        newHeaders.set('content-security-policy', csp);
      }
      
      response = new Response(response.body, { 
        status: response.status, 
        statusText: response.statusText, 
        headers: newHeaders 
      });
    }

    return response;
  },

  /**
   * Helper to invoke the React Router SSR handler with the Cloudflare load context.
   */
  async handleSsr(request: Request, env: AgentEnv, ctx: ExecutionContext): Promise<Response> {
    try {
      return await handleRequest(request, {
        cloudflare: { 
          env, 
          ctx, 
          cf: request.cf,
          // Pass the API handler directly to avoid self-referencing fetch timeouts (Error 522)
          api: (req: Request) => handleApiRequest(req, env, ctx)
        }
      });
    } catch (err: any) {
      structuredLogger.error(asLogMessage('SSR Error'), { 
        error: err?.message || String(err), 
        stack: err?.stack,
        url: request.url 
      });
      return new Response(`Internal Server Error: ${err?.message || 'Unknown Error'}`, { status: 500 });
    }
  },

  async email(message: ForwardableEmailMessage, env: AgentEnv, ctx: ExecutionContext) {
    structuredLogger.info(asLogMessage('[EMAIL-HANDLER] inbound email'), { from: message.from, to: message.to });
    ctx.waitUntil(handleInboundEmail(message, env, ctx, this.fetch.bind(this) as any));
  },

  async scheduled(_controller: ScheduledController, env: AgentEnv, ctx: ExecutionContext) {
    ctx.waitUntil(runCleanup(env, ctx));
  }
};

