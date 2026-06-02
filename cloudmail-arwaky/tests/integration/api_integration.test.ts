// tests/integration/api_integration.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleApiRequest } from '../../src/surfaces/api/api_route_registry';
import { getAgent } from '../../src/surfaces/api/bridge_entry_util';
import { requireAuth } from '../../src/surfaces/api/auth_guard_util';
import { logger } from '../../src/surfaces/api/api_logger_util';
import { recordRequestMetrics } from '../../src/surfaces/api/api_metrics_entry';

// Mock Dependencies
vi.mock('../../src/surfaces/api/bridge_entry_util', () => ({
  getAgent: vi.fn(),
}));

vi.mock('../../src/surfaces/api/auth_guard_util', () => ({
  requireAuth: vi.fn(),
  isResponse: (obj: any) => obj instanceof Response,
}));

vi.mock('../../src/surfaces/api/api_logger_util', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../src/surfaces/api/api_metrics_entry', () => ({
  recordRequestMetrics: vi.fn(),
  handleGetMetrics: vi.fn().mockResolvedValue(new Response('metrics')),
}));

describe('API Integration Tests', () => {
  let mockAgent: any;
  let mockEnv: any;
  let mockCtx: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAgent = {
      getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1', role: 'admin' }),
      healthCheck: vi.fn().mockResolvedValue({ ok: true }),
      login: vi.fn().mockResolvedValue({ token: 't1', session: { expiresAt: '...' } }),
    };

    mockEnv = { 
      DB: {}, 
      KV: {},
      ENVIRONMENT: 'test'
    };
    
    mockCtx = {
      waitUntil: vi.fn(),
    };

    (getAgent as any).mockReturnValue(mockAgent);
  });

  it('routes public endpoint: GET /api/health', async () => {
    const req = new Request('http://localhost/api/health');
    const res = await handleApiRequest(req, mockEnv, mockCtx);
    
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.ok).toBe(true);
    expect(recordRequestMetrics).toHaveBeenCalledWith('GET', '/api/health', 200, expect.any(Number));
  });

  it('routes public endpoint: POST /api/auth/login', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'u1@test.com', password: 'pass' })
    });
    const res = await handleApiRequest(req, mockEnv, mockCtx);
    
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.token).toBe('t1');
  });

  it('enforces authentication for protected routes', async () => {
    (requireAuth as any).mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
    
    const req = new Request('http://localhost/api/users');
    const res = await handleApiRequest(req, mockEnv, mockCtx);
    
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown routes', async () => {
    const req = new Request('http://localhost/api/unknown');
    const res = await handleApiRequest(req, mockEnv, mockCtx);
    
    expect(res.status).toBe(404);
    expect(res.headers.get('x-request-id')).toBeDefined();
  });

  it('injects CORS and request-id in all responses', async () => {
    const req = new Request('http://localhost/api/health');
    const res = await handleApiRequest(req, mockEnv, mockCtx);
    
    expect(res.headers.get('access-control-allow-origin')).toBeDefined();
    expect(res.headers.get('x-request-id')).toBeDefined();
  });

  it('handles server errors gracefully', async () => {
    mockAgent.healthCheck.mockRejectedValue(new Error('DB Down'));
    
    const req = new Request('http://localhost/api/health');
    const res = await handleApiRequest(req, mockEnv, mockCtx);
    
    // api_health_entry handles its own errors with jsonResponse(..., 503) usually
    // but if it throws, handleApiRequest catches it and returns 500
    expect(res.status).toBeGreaterThanOrEqual(500);
  });
});
