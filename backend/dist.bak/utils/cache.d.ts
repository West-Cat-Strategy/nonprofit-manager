/**
 * Simple In-Memory Cache with TTL
 * Used for caching analytics query results
 */
export declare class Cache<T = any> {
    private cache;
    private defaultTTL;
    private maxEntries;
    private hits;
    private misses;
    private evictions;
    /**
     * Create a new cache instance
     * @param defaultTTL - Default time-to-live in seconds (default: 300 = 5 minutes)
     */
    constructor(defaultTTL?: number);
    /**
     * Get a value from the cache
     * @param key - Cache key
     * @returns The cached value or undefined if not found or expired
     */
    get(key: string): T | undefined;
    /**
     * Set a value in the cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Time-to-live in seconds (optional, uses default if not provided)
     */
    set(key: string, value: T, ttl?: number): void;
    /**
     * Check if a key exists in the cache and is not expired
     * @param key - Cache key
     * @returns true if the key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Delete a value from the cache
     * @param key - Cache key
     */
    delete(key: string): void;
    /**
     * Clear all values from the cache
     */
    clear(): void;
    /**
     * Get cache statistics
     * @returns Object with cache size and other stats
     */
    stats(): {
        size: number;
        keys: string[];
    };
    detailedStats(): {
        size: number;
        hits: number;
        misses: number;
        hitRate: string;
        evictions: number;
    };
    /**
     * Remove expired entries from the cache
     */
    private cleanup;
    private evictLRU;
    /**
     * Get or set a value in the cache
     * Useful for lazy loading - if value doesn't exist, fetch it and cache it
     * @param key - Cache key
     * @param fetchFn - Function to fetch the value if not in cache
     * @param ttl - Time-to-live in seconds (optional)
     * @returns The cached or fetched value
     */
    getOrSet(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T>;
}
/**
 * Create cache key from parts
 * @param parts - Parts to join into a cache key
 * @returns Cache key string
 */
export declare function createCacheKey(...parts: (string | number | boolean | undefined)[]): string;
/**
 * Cache key helpers for scoped resources
 */
export declare class CacheKeys {
    private static scope;
    static account(accountId: string, ...parts: (string | number)[]): string;
    static contact(contactId: string, ...parts: (string | number)[]): string;
    static analytics(...parts: (string | number)[]): string;
}
/**
 * Global analytics cache instance
 * 5 minute TTL for analytics queries
 */
export declare const analyticsCache: Cache<any>;
/**
 * Global dashboard cache instance
 * 1 minute TTL for dashboard data (more frequent updates)
 */
export declare const dashboardCache: Cache<any>;
/**
 * Invalidate analytics cache for a specific user
 * Call this when user makes changes that affect analytics
 * @param userId - User ID
 */
export declare function invalidateAnalyticsCache(userId: string): void;
/**
 * Invalidate dashboard cache for a specific user
 * @param userId - User ID
 */
export declare function invalidateDashboardCache(userId: string): void;
export default Cache;
//# sourceMappingURL=cache.d.ts.map