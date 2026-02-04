"use strict";
/**
 * Simple In-Memory Cache with TTL
 * Used for caching analytics query results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardCache = exports.analyticsCache = exports.CacheKeys = exports.Cache = void 0;
exports.createCacheKey = createCacheKey;
exports.invalidateAnalyticsCache = invalidateAnalyticsCache;
exports.invalidateDashboardCache = invalidateDashboardCache;
const constants_1 = require("../config/constants");
class Cache {
    /**
     * Create a new cache instance
     * @param defaultTTL - Default time-to-live in seconds (default: 300 = 5 minutes)
     */
    constructor(defaultTTL = constants_1.CACHE.DEFAULT_TTL) {
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
        this.cache = new Map();
        this.defaultTTL = defaultTTL * 1000; // Convert to milliseconds
        this.maxEntries = constants_1.CACHE.MAX_ENTRIES;
        // Clean up expired entries every minute
        setInterval(() => this.cleanup(), constants_1.CACHE.CLEANUP_INTERVAL_MS);
    }
    /**
     * Get a value from the cache
     * @param key - Cache key
     * @returns The cached value or undefined if not found or expired
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return undefined;
        }
        // Check if entry has expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.misses++;
            return undefined;
        }
        entry.lastAccessed = Date.now();
        this.hits++;
        return entry.value;
    }
    /**
     * Set a value in the cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Time-to-live in seconds (optional, uses default if not provided)
     */
    set(key, value, ttl) {
        const ttlMs = ttl ? ttl * 1000 : this.defaultTTL;
        const expiresAt = Date.now() + ttlMs;
        const lastAccessed = Date.now();
        if (this.cache.size >= this.maxEntries) {
            this.evictLRU();
        }
        this.cache.set(key, { value, expiresAt, lastAccessed });
    }
    /**
     * Check if a key exists in the cache and is not expired
     * @param key - Cache key
     * @returns true if the key exists and is not expired
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        entry.lastAccessed = Date.now();
        return true;
    }
    /**
     * Delete a value from the cache
     * @param key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
    }
    /**
     * Clear all values from the cache
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
    }
    /**
     * Get cache statistics
     * @returns Object with cache size and other stats
     */
    stats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
    detailedStats() {
        const total = this.hits + this.misses;
        const hitRate = total === 0 ? 0 : (this.hits / total) * 100;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: `${hitRate.toFixed(2)}%`,
            evictions: this.evictions,
        };
    }
    /**
     * Remove expired entries from the cache
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
    evictLRU(count = 100) {
        if (this.cache.size === 0)
            return;
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        const toEvict = entries.slice(0, Math.min(count, entries.length));
        for (const [key] of toEvict) {
            this.cache.delete(key);
            this.evictions++;
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
    async getOrSet(key, fetchFn, ttl) {
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const value = await fetchFn();
        this.set(key, value, ttl);
        return value;
    }
}
exports.Cache = Cache;
/**
 * Create cache key from parts
 * @param parts - Parts to join into a cache key
 * @returns Cache key string
 */
function createCacheKey(...parts) {
    return parts.filter((p) => p !== undefined).join(':');
}
/**
 * Cache key helpers for scoped resources
 */
class CacheKeys {
    static scope(prefix, ...parts) {
        return `${prefix}:${parts.join(':')}`;
    }
    static account(accountId, ...parts) {
        return this.scope(`account:${accountId}`, ...parts);
    }
    static contact(contactId, ...parts) {
        return this.scope(`contact:${contactId}`, ...parts);
    }
    static analytics(...parts) {
        return this.scope('analytics', ...parts);
    }
}
exports.CacheKeys = CacheKeys;
/**
 * Global analytics cache instance
 * 5 minute TTL for analytics queries
 */
exports.analyticsCache = new Cache(constants_1.CACHE.ANALYTICS_TTL);
/**
 * Global dashboard cache instance
 * 1 minute TTL for dashboard data (more frequent updates)
 */
exports.dashboardCache = new Cache(constants_1.CACHE.DASHBOARD_TTL);
/**
 * Invalidate analytics cache for a specific user
 * Call this when user makes changes that affect analytics
 * @param userId - User ID
 */
function invalidateAnalyticsCache(userId) {
    const stats = exports.analyticsCache.stats();
    // Delete all keys that contain the user ID
    for (const key of stats.keys) {
        if (key.includes(userId)) {
            exports.analyticsCache.delete(key);
        }
    }
}
/**
 * Invalidate dashboard cache for a specific user
 * @param userId - User ID
 */
function invalidateDashboardCache(userId) {
    const stats = exports.dashboardCache.stats();
    // Delete all keys that contain the user ID
    for (const key of stats.keys) {
        if (key.includes(userId)) {
            exports.dashboardCache.delete(key);
        }
    }
}
exports.default = Cache;
//# sourceMappingURL=cache.js.map