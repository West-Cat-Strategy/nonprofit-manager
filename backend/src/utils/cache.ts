/**
 * Simple In-Memory Cache with TTL
 * Used for caching analytics query results
 */

import { CACHE } from '../config/constants';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class Cache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private defaultTTL: number;

  /**
   * Create a new cache instance
   * @param defaultTTL - Default time-to-live in seconds (default: 300 = 5 minutes)
   */
  constructor(defaultTTL: number = CACHE.DEFAULT_TTL) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL * 1000; // Convert to milliseconds

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), CACHE.CLEANUP_INTERVAL_MS);
  }

  /**
   * Get a value from the cache
   * @param key - Cache key
   * @returns The cached value or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time-to-live in seconds (optional, uses default if not provided)
   */
  set(key: string, value: T, ttl?: number): void {
    const ttlMs = ttl ? ttl * 1000 : this.defaultTTL;
    const expiresAt = Date.now() + ttlMs;

    this.cache.set(key, {
      value,
      expiresAt,
    });
  }

  /**
   * Check if a key exists in the cache and is not expired
   * @param key - Cache key
   * @returns true if the key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a value from the cache
   * @param key - Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all values from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Object with cache size and other stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Remove expired entries from the cache
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get or set a value in the cache
   * Useful for lazy loading - if value doesn't exist, fetch it and cache it
   * @param key - Cache key
   * @param fetchFn - Function to fetch the value if not in cache
   * @param ttl - Time-to-live in seconds (optional)
   * @returns The cached or fetched value
   */
  async getOrSet(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }
}

/**
 * Create cache key from parts
 * @param parts - Parts to join into a cache key
 * @returns Cache key string
 */
export function createCacheKey(...parts: (string | number | boolean | undefined)[]): string {
  return parts.filter((p) => p !== undefined).join(':');
}

/**
 * Global analytics cache instance
 * 5 minute TTL for analytics queries
 */
export const analyticsCache = new Cache(CACHE.ANALYTICS_TTL);

/**
 * Global dashboard cache instance
 * 1 minute TTL for dashboard data (more frequent updates)
 */
export const dashboardCache = new Cache(CACHE.DASHBOARD_TTL);

/**
 * Invalidate analytics cache for a specific user
 * Call this when user makes changes that affect analytics
 * @param userId - User ID
 */
export function invalidateAnalyticsCache(userId: string): void {
  const stats = analyticsCache.stats();

  // Delete all keys that contain the user ID
  for (const key of stats.keys) {
    if (key.includes(userId)) {
      analyticsCache.delete(key);
    }
  }
}

/**
 * Invalidate dashboard cache for a specific user
 * @param userId - User ID
 */
export function invalidateDashboardCache(userId: string): void {
  const stats = dashboardCache.stats();

  // Delete all keys that contain the user ID
  for (const key of stats.keys) {
    if (key.includes(userId)) {
      dashboardCache.delete(key);
    }
  }
}

export default Cache;
