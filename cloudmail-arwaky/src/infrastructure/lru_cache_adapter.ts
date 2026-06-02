// infrastructure/lru_cache_adapter.ts
// Performance caching — LRU Implementation of ICachePort

import type { ICachePort } from '../contract/cache_client_port';
import type { CacheKey, TtlSeconds, TimestampEpochMs } from '../taxonomy';
import { asTimestampEpochMs } from '../taxonomy';

/**
 * Simple In-Memory LRU Cache implementation.
 * Used for high-frequency, low-volatility data to reduce database load.
 */
export class LruCacheAdapter implements ICachePort {
  private cache: Map<CacheKey, { value: unknown; expiresAt: TimestampEpochMs }>;
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxEntries: number = 100, defaultTtlMs: number = 60000) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.defaultTtlMs = defaultTtlMs;
    // Start background cleanup every 60 seconds (only in Node/Worker environment)
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.purgeExpired(), 60000);
    }
  }

  /**
   * Clean up expired entries from cache.
   */
  private purgeExpired(): void {
    const now = Date.now();
    let deletedCount = 0;
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0 && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
      console.debug(`[LRU] Purged ${deletedCount} expired entries`);
    }
  }

  /**
   * Optional: call this to stop background cleanup (e.g., during shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async get<T>(key: CacheKey): Promise<T | undefined> {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh entry on access (LRU behavior)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value as T;
  }

  async set<T>(key: CacheKey, value: T, ttlSeconds?: TtlSeconds): Promise<void> {
    // Evict expired entries first to make room
    this.purgeExpired();
    
    if (this.cache.size >= this.maxEntries) {
      // Evict up to 10% of entries or at least 1
      const toEvict = Math.max(1, Math.floor(this.maxEntries * 0.1));
      const keys = Array.from(this.cache.keys());
      for (let i = 0; i < toEvict && i < keys.length; i++) {
        this.cache.delete(keys[i]!);
      }
    }

    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
    const expiresAt = asTimestampEpochMs(Date.now() + ttlMs);
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: CacheKey): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}
