/**
 * Site Cache Service
 * Handles caching for published sites to improve performance
 */
export interface CacheEntry<T> {
    data: T;
    createdAt: number;
    expiresAt: number;
    etag: string;
    version: string;
}
export interface CacheOptions {
    ttlSeconds?: number;
    staleWhileRevalidate?: number;
    tags?: string[];
}
export interface CacheHeaders {
    'Cache-Control': string;
    'ETag': string;
    'Last-Modified': string;
    'Vary': string;
    'X-Cache-Status'?: 'HIT' | 'MISS' | 'STALE' | 'BYPASS';
}
export interface CacheStats {
    hits: number;
    misses: number;
    staleHits: number;
    evictions: number;
    size: number;
    maxSize: number;
}
export declare class SiteCacheService {
    private cache;
    private tagIndex;
    constructor();
    /**
     * Generate a cache key for a site page
     */
    generateCacheKey(siteId: string, pageSlug: string, variant?: string): string;
    /**
     * Generate ETag for content
     */
    generateETag(content: unknown): string;
    /**
     * Get item from cache
     */
    get<T>(key: string): CacheEntry<T> | null;
    /**
     * Set item in cache
     */
    set<T>(key: string, data: T, version: string, options?: CacheOptions): CacheEntry<T>;
    /**
     * Delete item from cache
     */
    delete(key: string): boolean;
    /**
     * Invalidate all entries with a specific tag
     */
    invalidateByTag(tag: string): number;
    /**
     * Invalidate all entries for a specific site
     */
    invalidateSite(siteId: string): number;
    /**
     * Clear entire cache
     */
    clear(): void;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Generate HTTP cache headers
     */
    generateCacheHeaders(entry: CacheEntry<unknown> | null, options?: CacheOptions): CacheHeaders;
    /**
     * Check if request matches cached ETag
     */
    isNotModified(entry: CacheEntry<unknown> | null, requestETag?: string): boolean;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Reset cache statistics
     */
    resetStats(): void;
    /**
     * Warm cache for a site (preload all pages)
     */
    warmCache(siteId: string, pages: Array<{
        slug: string;
        content: unknown;
    }>, version: string): Promise<void>;
}
export declare const CacheProfiles: {
    STATIC: {
        ttlSeconds: number;
        staleWhileRevalidate: number;
        immutable: boolean;
    };
    PAGE: {
        ttlSeconds: number;
        staleWhileRevalidate: number;
    };
    API: {
        ttlSeconds: number;
        staleWhileRevalidate: number;
    };
    DYNAMIC: {
        ttlSeconds: number;
        staleWhileRevalidate: number;
        noStore: boolean;
    };
};
/**
 * Generate Cache-Control header for a cache profile
 */
export declare function getCacheControlHeader(profile: keyof typeof CacheProfiles): string;
export declare const siteCacheService: SiteCacheService;
export default siteCacheService;
//# sourceMappingURL=siteCacheService.d.ts.map