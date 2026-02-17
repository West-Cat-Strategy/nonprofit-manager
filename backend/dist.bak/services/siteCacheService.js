"use strict";
/**
 * Site Cache Service
 * Handles caching for published sites to improve performance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.siteCacheService = exports.CacheProfiles = exports.SiteCacheService = void 0;
exports.getCacheControlHeader = getCacheControlHeader;
const crypto_1 = __importDefault(require("crypto"));
// Default TTL values (in seconds)
const DEFAULT_TTL = 3600; // 1 hour
const STALE_WHILE_REVALIDATE = 86400; // 24 hours
const MAX_CACHE_SIZE = 1000; // Maximum cache entries
// In-memory cache (use Redis in production)
const memoryCache = new Map();
let cacheStats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    evictions: 0,
    size: 0,
    maxSize: MAX_CACHE_SIZE,
};
class SiteCacheService {
    constructor() {
        this.cache = memoryCache;
        this.tagIndex = new Map();
    }
    /**
     * Generate a cache key for a site page
     */
    generateCacheKey(siteId, pageSlug, variant) {
        const parts = ['site', siteId, 'page', pageSlug];
        if (variant) {
            parts.push('variant', variant);
        }
        return parts.join(':');
    }
    /**
     * Generate ETag for content
     */
    generateETag(content) {
        const hash = crypto_1.default
            .createHash('md5')
            .update(JSON.stringify(content))
            .digest('hex');
        return `"${hash}"`;
    }
    /**
     * Get item from cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            cacheStats.misses++;
            return null;
        }
        const now = Date.now();
        // Check if entry is expired
        if (now > entry.expiresAt) {
            // Check if we're within stale-while-revalidate window
            const staleLimit = entry.expiresAt + STALE_WHILE_REVALIDATE * 1000;
            if (now > staleLimit) {
                // Fully expired, remove from cache
                this.delete(key);
                cacheStats.misses++;
                return null;
            }
            // Return stale entry (caller should trigger background refresh)
            cacheStats.staleHits++;
            return { ...entry, data: entry.data };
        }
        cacheStats.hits++;
        return entry;
    }
    /**
     * Set item in cache
     */
    set(key, data, version, options = {}) {
        const { ttlSeconds = DEFAULT_TTL, tags = [] } = options;
        // Evict if at capacity
        if (this.cache.size >= MAX_CACHE_SIZE) {
            this.evictLRU();
        }
        const now = Date.now();
        const entry = {
            data,
            createdAt: now,
            expiresAt: now + ttlSeconds * 1000,
            etag: this.generateETag(data),
            version,
        };
        this.cache.set(key, entry);
        cacheStats.size = this.cache.size;
        // Update tag index
        for (const tag of tags) {
            if (!this.tagIndex.has(tag)) {
                this.tagIndex.set(tag, new Set());
            }
            this.tagIndex.get(tag).add(key);
        }
        return entry;
    }
    /**
     * Delete item from cache
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            cacheStats.size = this.cache.size;
        }
        return deleted;
    }
    /**
     * Invalidate all entries with a specific tag
     */
    invalidateByTag(tag) {
        const keys = this.tagIndex.get(tag);
        if (!keys) {
            return 0;
        }
        let count = 0;
        for (const key of keys) {
            if (this.delete(key)) {
                count++;
            }
        }
        this.tagIndex.delete(tag);
        return count;
    }
    /**
     * Invalidate all entries for a specific site
     */
    invalidateSite(siteId) {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(`site:${siteId}:`)) {
                this.delete(key);
                count++;
            }
        }
        return count;
    }
    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        this.tagIndex.clear();
        cacheStats.size = 0;
    }
    /**
     * Evict least recently used entry
     */
    evictLRU() {
        let oldestKey = null;
        let oldestTime = Infinity;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.createdAt < oldestTime) {
                oldestTime = entry.createdAt;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            this.delete(oldestKey);
            cacheStats.evictions++;
        }
    }
    /**
     * Generate HTTP cache headers
     */
    generateCacheHeaders(entry, options = {}) {
        const { ttlSeconds = DEFAULT_TTL, staleWhileRevalidate = STALE_WHILE_REVALIDATE } = options;
        const cacheControl = [
            'public',
            `max-age=${ttlSeconds}`,
            `stale-while-revalidate=${staleWhileRevalidate}`,
        ].join(', ');
        const now = new Date();
        const lastModified = entry ? new Date(entry.createdAt).toUTCString() : now.toUTCString();
        return {
            'Cache-Control': cacheControl,
            'ETag': entry?.etag || this.generateETag(now.getTime()),
            'Last-Modified': lastModified,
            'Vary': 'Accept-Encoding, Accept',
            'X-Cache-Status': entry ? 'HIT' : 'MISS',
        };
    }
    /**
     * Check if request matches cached ETag
     */
    isNotModified(entry, requestETag) {
        if (!entry || !requestETag) {
            return false;
        }
        // Handle weak ETags
        const normalizedRequest = requestETag.replace(/^W\//, '');
        const normalizedEntry = entry.etag.replace(/^W\//, '');
        return normalizedRequest === normalizedEntry;
    }
    /**
     * Get cache statistics
     */
    getStats() {
        return { ...cacheStats };
    }
    /**
     * Reset cache statistics
     */
    resetStats() {
        cacheStats = {
            hits: 0,
            misses: 0,
            staleHits: 0,
            evictions: 0,
            size: this.cache.size,
            maxSize: MAX_CACHE_SIZE,
        };
    }
    /**
     * Warm cache for a site (preload all pages)
     */
    async warmCache(siteId, pages, version) {
        for (const page of pages) {
            const key = this.generateCacheKey(siteId, page.slug);
            this.set(key, page.content, version, {
                tags: [`site:${siteId}`],
            });
        }
    }
}
exports.SiteCacheService = SiteCacheService;
// CDN Cache Control helpers
exports.CacheProfiles = {
    // Static assets (images, fonts, etc.) - long cache
    STATIC: {
        ttlSeconds: 31536000, // 1 year
        staleWhileRevalidate: 0,
        immutable: true,
    },
    // HTML pages - short cache with revalidation
    PAGE: {
        ttlSeconds: 300, // 5 minutes
        staleWhileRevalidate: 86400, // 24 hours
    },
    // API responses - minimal cache
    API: {
        ttlSeconds: 60, // 1 minute
        staleWhileRevalidate: 300, // 5 minutes
    },
    // Dynamic content - no cache
    DYNAMIC: {
        ttlSeconds: 0,
        staleWhileRevalidate: 0,
        noStore: true,
    },
};
/**
 * Generate Cache-Control header for a cache profile
 */
function getCacheControlHeader(profile) {
    const config = exports.CacheProfiles[profile];
    const directives = [];
    if ('noStore' in config && config.noStore) {
        return 'no-store, no-cache, must-revalidate';
    }
    if ('immutable' in config && config.immutable) {
        directives.push('immutable');
    }
    directives.push('public');
    directives.push(`max-age=${config.ttlSeconds}`);
    if (config.staleWhileRevalidate > 0) {
        directives.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
    }
    return directives.join(', ');
}
exports.siteCacheService = new SiteCacheService();
exports.default = exports.siteCacheService;
//# sourceMappingURL=siteCacheService.js.map