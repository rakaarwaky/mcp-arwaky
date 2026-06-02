import { describe, it, expect, vi } from 'vitest';
import { extractToken } from '../../src/surfaces/api/request_token_util';
import { 
  jsonResponse 
} from '../../src/surfaces/api/http_response_util';

describe('Surfaces: Utilities', () => {
  describe('Token Extraction', () => {
    it('should extract from Authorization header', () => {
      const req = new Request('https://test.com', {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      expect(extractToken(req)).toBe('test-token');
    });

    it('should extract from Cookie', () => {
      const req = new Request('https://test.com', {
        headers: { 'Cookie': 'session=cookie-token' }
      });
      expect(extractToken(req)).toBe('cookie-token');
    });
  });

  describe('Response Formatting', () => {
    it('should create JSON response', async () => {
      const res = jsonResponse({ ok: true });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });
  });
});
