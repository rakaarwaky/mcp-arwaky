// contract/cache_client_port.ts
// Contract for key-value caching services

/**
 * Interface for distributed or local caching.
 */
import type { CacheKey, TtlSeconds } from '../taxonomy';

export interface ICachePort {
  /**
   * Retrieves a value from cache.
   */
  get<T>(key: CacheKey): Promise<T | undefined>;

  /**
   * Stores a value in cache with optional TTL.
   */
  set<T>(key: CacheKey, value: T, ttlSeconds?: TtlSeconds): Promise<void>;

  /**
   * Removes an item from cache.
   */
  delete(key: CacheKey): Promise<void>;

  /**
   * Clears all items.
   */
  clear(): Promise<void>;
}
