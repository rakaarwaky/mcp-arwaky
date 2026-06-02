// surfaces/api/api_auth_entry.ts
// Auth surface — login, logout, API key authentication

import type { AgentEnv } from '../../agent/di_container_registry';
import { jsonResponse, errorResponse } from './http_response_util';
import { getAgent } from './bridge_entry_util';
import { loginBodySchema, apiKeyAuthBodySchema } from '../../taxonomy/validation_schema_vo';
import { createEmailAddress, asPassword, asUserAgent, asClientIp, asAuthToken, asApiKeyPlain } from '../../taxonomy';

export async function handleLogin(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return errorResponse('Expected JSON body', 400, 'INVALID_CONTENT_TYPE');
  }

  const body = await request.json();
  const validation = loginBodySchema.safeParse(body);
  if (!validation.success) {
    return errorResponse('Invalid request: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'), 400, 'VALIDATION_ERROR');
  }
  const { email, password } = validation.data;

  const userAgent = asUserAgent(request.headers.get('user-agent') || 'Unknown');
  const clientIp = asClientIp(extractClientIp(request));

  try {
    const result = await agent.login(createEmailAddress(email), asPassword(password), { userAgent, clientIp });
    const response = jsonResponse({
      token: result.token,
      expiresAt: result.session.expiresAt
    });
    // Set httpOnly cookie for web clients
    const maxAge = Math.floor((new Date(result.session.expiresAt).getTime() - Date.now()) / 1000);
    const isProd = env?.NODE_ENV === 'production';
    const isHttps = request.url.startsWith('https:');
    const secure = (isProd || isHttps) ? 'Secure; ' : '';
    const sameSite = isProd ? 'Strict' : 'Lax';
    response.headers.set('Set-Cookie', `mailflare_session=${result.token}; HttpOnly; ${secure}SameSite=${sameSite}; Max-Age=${maxAge}; Path=/`);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    const status = message.includes('rate limit') ? 429 : 401;
    return errorResponse(message, status, 'AUTH_FAILED');
  }
}

export async function handleLogout(
  request: Request,
  _env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(_env);

  const cookieHeader = request.headers.get('cookie') ?? '';
  const tokenMatch = cookieHeader.match(/mailflare_session=([^;]+)/);
  const token = tokenMatch?.[1] ? asAuthToken(tokenMatch[1]) : undefined;

  if (token) {
    try {
      await agent.logout(token);
    } catch {
      // Ignore logout errors
    }
  }

  const response = jsonResponse({ ok: true });
  const secure = _env?.NODE_ENV === 'production' ? 'Secure; ' : '';
  response.headers.set('Set-Cookie', `mailflare_session=; HttpOnly; ${secure}SameSite=Strict; Max-Age=0; Path=/`);
  return response;
}

export async function handleApiKeyAuth(
  request: Request,
  env: AgentEnv,
  _ctx: ExecutionContext
): Promise<Response> {
  const agent = getAgent(env);

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return errorResponse('Expected JSON body', 400, 'INVALID_CONTENT_TYPE');
  }

  const body = await request.json();
  const validation = apiKeyAuthBodySchema.safeParse(body);
  if (!validation.success) {
    return errorResponse('Invalid request: ' + (validation.error.issues[0]?.message ?? 'Unknown validation error'), 400, 'VALIDATION_ERROR');
  }
  const { apiKey } = validation.data;

  const userAgent = asUserAgent(request.headers.get('user-agent') || 'Unknown');
  try {
    const result = await agent.authenticateWithApiKey(asApiKeyPlain(apiKey), userAgent, asClientIp(extractClientIp(request)));
    return jsonResponse({
      token: result.token,
      apiKeyId: result.apiKeyId,
      expiresAt: undefined // API key sessions use auth token
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return errorResponse(message, 401, 'AUTH_FAILED');
  }
}

function extractClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? '';
  return '';
}