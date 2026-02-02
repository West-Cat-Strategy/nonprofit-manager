/**
 * Site Cache Service
 * Handles caching for published sites to improve performance
 */

import crypto from 'crypto';

// Cache entry structure
export interface CacheEntry<T> {
  data: T;
  createdAt: number;
  expiresAt: number;
  etag: string;
  version: string;
}

// Cache options
export interface CacheOptions {
  ttlSeconds?: number;
  staleWhileRevalidate?: number;
  tags?: string[];
}

// Cache headers
export interface CacheHeaders {
  'Cache-Control': string;
  'ETag': string;
  'Last-Modified': string;
  'Vary': string;
  'X-Cache-Status'?: 'HIT' | 'MISS' | 'STALE' | 'BYPASS';
}

// Cache statistics
export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  evictions: number;
  size: number;
  maxSize: number;
}

// Default TTL values (in seconds)
const DEFAULT_TTL = 3600; // 1 hour
const STALE_WHILE_REVALIDATE = 86400; // 24 hours
const MAX_CACHE_SIZE = 1000; // Maximum cache entries

// In-memory cache (use Redis in production)
const memoryCache = new Map<string, CacheEntry<unknown>>();
let cacheStats: CacheStats = {
  hits: 0,
  misses: 0,
  staleHits: 0,
  evictions: 0,
  size: 0,
  maxSize: MAX_CACHE_SIZE,
};

export class SiteCacheService {
  private cache: Map<string, CacheEntry<unknown>>;
  private tagIndex: Map<string, Set<string>>; // tag -> cache keys

  constructor() {
    this.cache = memoryCache;
    this.tagIndex = new Map();
  }

  /**
   * Generate a cache key for a site page
   */
  generateCacheKey(siteId: string, pageSlug: string, variant?: string): string {
    const parts = ['site', siteId, 'page', pageSlug];
    if (variant) {
      parts.push('variant', variant);
    }
    return parts.join(':');
  }

  /**
   * Generate ETag for content
   */
  generateETag(content: unknown): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(content))
      .digest('hex');
    return `"${hash}"`;
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

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
  set<T>(
    key: string,
    data: T,
    version: string,
    options: CacheOptions = {}
  ): CacheEntry<T> {
    const { ttlSeconds = DEFAULT_TTL, tags = [] } = options;

    // Evict if at capacity
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      etag: this.generateETag(data),
      version,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
    cacheStats.size = this.cache.size;

    // Update tag index
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }

    return entry;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      cacheStats.size = this.cache.size;
    }
    return deleted;
  }

  /**
   * Invalidate all entries with a specific tag
   */
  invalidateByTag(tag: string): number {
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
  invalidateSite(siteId: string): number {
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
  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
    cacheStats.size = 0;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
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
  generateCacheHeaders(
    entry: CacheEntry<unknown> | null,
    options: CacheOptions = {}
  ): CacheHeaders {
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
  isNotModified(entry: CacheEntry<unknown> | null, requestETag?: string): boolean {
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
  getStats(): CacheStats {
    return { ...cacheStats };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
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
  async warmCache(
    siteId: string,
    pages: Array<{ slug: string; content: unknown }>,
    version: string
  ): Promise<void> {
    for (const page of pages) {
      const key = this.generateCacheKey(siteId, page.slug);
      this.set(key, page.content, version, {
        tags: [`site:${siteId}`],
      });
    }
  }
}

// CDN Cache Control helpers
export const CacheProfiles = {
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
export function getCacheControlHeader(
  profile: keyof typeof CacheProfiles
): string {
  const config = CacheProfiles[profile];
  const directives: string[] = [];

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

export const siteCacheService = new SiteCacheService();
export default siteCacheService;
