/**
 * Site Cache Service
 * Handles caching for published sites to improve performance
 * Uses Redis as the primary cache backend with in-memory fallback
 */

import crypto from 'crypto';
import { getRedisClient, isRedisAvailable } from '../config/redis';
import { logger } from '../config/logger';

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
const MAX_CACHE_SIZE = 1000; // Maximum cache entries (for in-memory fallback)
const CACHE_KEY_PREFIX = 'site_cache:';
const TAG_KEY_PREFIX = 'site_cache_tag:';
const STATS_KEY = 'site_cache:stats';

// In-memory fallback when Redis is unavailable
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
  private fallbackCache: Map<string, CacheEntry<unknown>>;
  private tagIndex: Map<string, Set<string>>; // tag -> cache keys (fallback only)

  constructor() {
    this.fallbackCache = memoryCache;
    this.tagIndex = new Map();
  }

  /**
   * Check if Redis is available for caching
   */
  private useRedis(): boolean {
    return isRedisAvailable();
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
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (this.useRedis()) {
      return this.redisGet<T>(key);
    }
    return this.memoryGet<T>(key);
  }

  private async redisGet<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const client = getRedisClient();
      if (!client) return null;

      const raw = await client.get(`${CACHE_KEY_PREFIX}${key}`);
      if (!raw) {
        cacheStats.misses++;
        return null;
      }

      const entry = JSON.parse(raw) as CacheEntry<T>;
      const now = Date.now();

      if (now > entry.expiresAt) {
        const staleLimit = entry.expiresAt + STALE_WHILE_REVALIDATE * 1000;
        if (now > staleLimit) {
          await client.del(`${CACHE_KEY_PREFIX}${key}`);
          cacheStats.misses++;
          return null;
        }
        cacheStats.staleHits++;
        return entry;
      }

      cacheStats.hits++;
      return entry;
    } catch (error) {
      logger.error('Redis cache get error, falling back to memory', { key, error });
      return this.memoryGet<T>(key);
    }
  }

  private memoryGet<T>(key: string): CacheEntry<T> | null {
    const entry = this.fallbackCache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      cacheStats.misses++;
      return null;
    }

    const now = Date.now();

    if (now > entry.expiresAt) {
      const staleLimit = entry.expiresAt + STALE_WHILE_REVALIDATE * 1000;
      if (now > staleLimit) {
        this.memoryDelete(key);
        cacheStats.misses++;
        return null;
      }
      cacheStats.staleHits++;
      return { ...entry, data: entry.data };
    }

    cacheStats.hits++;
    return entry;
  }

  /**
   * Set item in cache
   */
  async set<T>(
    key: string,
    data: T,
    version: string,
    options: CacheOptions = {}
  ): Promise<CacheEntry<T>> {
    const { ttlSeconds = DEFAULT_TTL, tags = [] } = options;

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      etag: this.generateETag(data),
      version,
    };

    if (this.useRedis()) {
      try {
        const client = getRedisClient();
        if (client) {
          const totalTtl = ttlSeconds + STALE_WHILE_REVALIDATE;
          await client.setEx(
            `${CACHE_KEY_PREFIX}${key}`,
            totalTtl,
            JSON.stringify(entry)
          );

          // Update tag index in Redis
          for (const tag of tags) {
            await client.sAdd(`${TAG_KEY_PREFIX}${tag}`, key);
          }

          cacheStats.size++;
          return entry;
        }
      } catch (error) {
        logger.error('Redis cache set error, falling back to memory', { key, error });
      }
    }

    // In-memory fallback
    if (this.fallbackCache.size >= MAX_CACHE_SIZE) {
      this.evictLRU();
    }

    this.fallbackCache.set(key, entry as CacheEntry<unknown>);
    cacheStats.size = this.fallbackCache.size;

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
  async delete(key: string): Promise<boolean> {
    if (this.useRedis()) {
      try {
        const client = getRedisClient();
        if (client) {
          const result = await client.del(`${CACHE_KEY_PREFIX}${key}`);
          if (result > 0) cacheStats.size = Math.max(0, cacheStats.size - 1);
          return result > 0;
        }
      } catch (error) {
        logger.error('Redis cache delete error, falling back to memory', { key, error });
      }
    }

    return this.memoryDelete(key);
  }

  private memoryDelete(key: string): boolean {
    const deleted = this.fallbackCache.delete(key);
    if (deleted) {
      cacheStats.size = this.fallbackCache.size;
    }
    return deleted;
  }

  /**
   * Invalidate all entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    if (this.useRedis()) {
      try {
        const client = getRedisClient();
        if (client) {
          const keys = await client.sMembers(`${TAG_KEY_PREFIX}${tag}`);
          let count = 0;
          for (const key of keys) {
            const result = await client.del(`${CACHE_KEY_PREFIX}${key}`);
            if (result > 0) count++;
          }
          await client.del(`${TAG_KEY_PREFIX}${tag}`);
          cacheStats.size = Math.max(0, cacheStats.size - count);
          return count;
        }
      } catch (error) {
        logger.error('Redis tag invalidation error, falling back to memory', { tag, error });
      }
    }

    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return 0;
    }

    let count = 0;
    for (const key of keys) {
      if (this.memoryDelete(key)) {
        count++;
      }
    }

    this.tagIndex.delete(tag);
    return count;
  }

  /**
   * Invalidate all entries for a specific site
   */
  async invalidateSite(siteId: string): Promise<number> {
    if (this.useRedis()) {
      try {
        const client = getRedisClient();
        if (client) {
          const pattern = `${CACHE_KEY_PREFIX}site:${siteId}:*`;
          const keys = await client.keys(pattern);
          let count = 0;
          if (keys.length > 0) {
            count = await client.del(keys);
            cacheStats.size = Math.max(0, cacheStats.size - count);
          }
          return count;
        }
      } catch (error) {
        logger.error('Redis site invalidation error, falling back to memory', { siteId, error });
      }
    }

    let count = 0;
    for (const key of this.fallbackCache.keys()) {
      if (key.startsWith(`site:${siteId}:`)) {
        this.memoryDelete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    if (this.useRedis()) {
      try {
        const client = getRedisClient();
        if (client) {
          const keys = await client.keys(`${CACHE_KEY_PREFIX}*`);
          const tagKeys = await client.keys(`${TAG_KEY_PREFIX}*`);
          const allKeys = [...keys, ...tagKeys];
          if (allKeys.length > 0) {
            await client.del(allKeys);
          }
        }
      } catch (error) {
        logger.error('Redis cache clear error', { error });
      }
    }

    this.fallbackCache.clear();
    this.tagIndex.clear();
    cacheStats.size = 0;
  }

  /**
   * Evict least recently used entry (in-memory fallback only)
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.fallbackCache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryDelete(oldestKey);
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
      size: this.fallbackCache.size,
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
      await this.set(key, page.content, version, {
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
