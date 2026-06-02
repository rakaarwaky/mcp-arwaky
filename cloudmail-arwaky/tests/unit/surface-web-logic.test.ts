// tests/unit/surface-web-logic.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asEmailId, createEmailAddress, asPassword, asSettingKey, asSettingValue } from '../../src/taxonomy';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString(); }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = vi.fn() as any;

// Mock window for API client origin detection
Object.defineProperty(global, 'window', {
  value: {
    location: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000'
    }
  },
  writable: true
});

  describe('Surfaces > Web > Logic', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      localStorage.clear();
    });

  it('API Client — api() handles headers and cookies', async () => {
    const { listUsersApi } = await import('../../src/surfaces/web/lib/web_api_client');

    (global.fetch as any).mockResolvedValue({
      ok: true,
      headers: { get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null },
      json: () => Promise.resolve({ users: [] })
    });

    await listUsersApi();

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('/api/users');
    expect(options.credentials).toBe('same-origin');
    // Headers should be a Headers instance with content-type set
    expect(options.headers).toBeInstanceOf(Headers);
    expect(options.headers.get('content-type')).toBe('application/json');
    // Should NOT have authorization header
    expect(options.headers.get('authorization')).toBeNull();
  });

  it('API Client — api() throws on error', async () => {
    const { getInboxApi } = await import('../../src/surfaces/web/lib/web_api_client');
    
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null },
      json: () => Promise.resolve({ error: 'Unauthorized' })
    });

    await expect(getInboxApi()).rejects.toThrow('Unauthorized');
  });

  it('API Client — specialized calls', async () => {
    const { loginApi, emailActionApi, updateSettingsApi } = await import('../../src/surfaces/web/lib/web_api_client');
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      headers: { get: (name: string) => name.toLowerCase() === 'content-type' ? 'application/json' : null },
      json: () => Promise.resolve({ ok: true })
    });

    // Login
    await loginApi(createEmailAddress('test@mail.com'), asPassword('pwd'));
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'test@mail.com', password: 'pwd' })
    }));

    // Action
    await emailActionApi(asEmailId('e1'), 'archive');
    expect(global.fetch).toHaveBeenCalledWith('/api/me/emails/e1/action', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ action: 'archive' })
    }));

    // Settings
    await updateSettingsApi({ [asSettingKey('k')]: asSettingValue('v') });
    expect(global.fetch).toHaveBeenCalledWith('/api/worker-settings', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ k: 'v' })
    }));
  });
});
