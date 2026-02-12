/**
 * Site Cache Service Tests
 */

import {
  CacheProfiles,
  getCacheControlHeader,
  SiteCacheService,
  siteCacheService,
} from '@services';

describe('SiteCacheService', () => {
  let service: SiteCacheService;

  beforeEach(() => {
    service = new SiteCacheService();
    service.clear();
    service.resetStats();
  });

  describe('generateCacheKey', () => {
    it('should generate cache key for site and page', () => {
      const key = service.generateCacheKey('site-123', 'home');
      expect(key).toBe('site:site-123:page:home');
    });

    it('should include variant when provided', () => {
      const key = service.generateCacheKey('site-123', 'home', 'mobile');
      expect(key).toBe('site:site-123:page:home:variant:mobile');
    });
  });

  describe('generateETag', () => {
    it('should generate ETag for content', () => {
      const etag = service.generateETag({ test: 'data' });
      expect(etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should generate consistent ETag for same content', () => {
      const content = { test: 'data' };
      const etag1 = service.generateETag(content);
      const etag2 = service.generateETag(content);
      expect(etag1).toBe(etag2);
    });

    it('should generate different ETags for different content', () => {
      const etag1 = service.generateETag({ test: 'data1' });
      const etag2 = service.generateETag({ test: 'data2' });
      expect(etag1).not.toBe(etag2);
    });
  });

  describe('get and set', () => {
    it('should store and retrieve data', () => {
      const key = 'test-key';
      const data = { content: 'test content' };

      service.set(key, data, 'v1');
      const result = service.get(key);

      expect(result).not.toBeNull();
      expect(result?.data).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const result = service.get('non-existent');
      expect(result).toBeNull();
    });

    it('should include version in cache entry', () => {
      const key = 'test-key';
      service.set(key, { test: 'data' }, 'v2.0');
      const result = service.get(key);

      expect(result?.version).toBe('v2.0');
    });

    it('should generate ETag for cache entry', () => {
      const key = 'test-key';
      service.set(key, { test: 'data' }, 'v1');
      const result = service.get(key);

      expect(result?.etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('should set expiration time', () => {
      const key = 'test-key';
      service.set(key, { test: 'data' }, 'v1', { ttlSeconds: 3600 });
      const result = service.get(key);

      expect(result?.expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe('delete', () => {
    it('should delete existing entry', () => {
      const key = 'test-key';
      service.set(key, { test: 'data' }, 'v1');

      const deleted = service.delete(key);
      expect(deleted).toBe(true);
      expect(service.get(key)).toBeNull();
    });

    it('should return false for non-existent key', () => {
      const deleted = service.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('invalidateByTag', () => {
    it('should invalidate entries with specific tag', () => {
      service.set('key1', { data: 1 }, 'v1', { tags: ['site:123'] });
      service.set('key2', { data: 2 }, 'v1', { tags: ['site:123'] });
      service.set('key3', { data: 3 }, 'v1', { tags: ['site:456'] });

      const count = service.invalidateByTag('site:123');

      expect(count).toBe(2);
      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
      expect(service.get('key3')).not.toBeNull();
    });

    it('should return 0 for non-existent tag', () => {
      const count = service.invalidateByTag('non-existent-tag');
      expect(count).toBe(0);
    });
  });

  describe('invalidateSite', () => {
    it('should invalidate all entries for a site', () => {
      const siteId = 'site-123';
      service.set(service.generateCacheKey(siteId, 'home'), { page: 'home' }, 'v1');
      service.set(service.generateCacheKey(siteId, 'about'), { page: 'about' }, 'v1');
      service.set(service.generateCacheKey('site-456', 'home'), { page: 'other' }, 'v1');

      const count = service.invalidateSite(siteId);

      expect(count).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', () => {
      service.set('key1', { data: 1 }, 'v1');
      service.set('key2', { data: 2 }, 'v1');

      service.clear();

      expect(service.get('key1')).toBeNull();
      expect(service.get('key2')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should track cache hits', () => {
      service.set('key', { data: 'test' }, 'v1');
      service.get('key');
      service.get('key');

      const stats = service.getStats();
      expect(stats.hits).toBe(2);
    });

    it('should track cache misses', () => {
      service.get('non-existent-1');
      service.get('non-existent-2');

      const stats = service.getStats();
      expect(stats.misses).toBe(2);
    });

    it('should track cache size', () => {
      service.set('key1', { data: 1 }, 'v1');
      service.set('key2', { data: 2 }, 'v1');

      const stats = service.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('resetStats', () => {
    it('should reset statistics', () => {
      service.set('key', { data: 'test' }, 'v1');
      service.get('key');
      service.get('non-existent');

      service.resetStats();

      const stats = service.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('generateCacheHeaders', () => {
    it('should generate cache headers for cache entry', () => {
      service.set('key', { data: 'test' }, 'v1');
      const entry = service.get('key');

      const headers = service.generateCacheHeaders(entry);

      expect(headers['Cache-Control']).toContain('public');
      expect(headers['Cache-Control']).toContain('max-age=');
      expect(headers['ETag']).toBeDefined();
      expect(headers['Last-Modified']).toBeDefined();
      expect(headers['Vary']).toBe('Accept-Encoding, Accept');
      expect(headers['X-Cache-Status']).toBe('HIT');
    });

    it('should return MISS status for null entry', () => {
      const headers = service.generateCacheHeaders(null);
      expect(headers['X-Cache-Status']).toBe('MISS');
    });

    it('should include stale-while-revalidate', () => {
      const headers = service.generateCacheHeaders(null, { staleWhileRevalidate: 86400 });
      expect(headers['Cache-Control']).toContain('stale-while-revalidate=86400');
    });
  });

  describe('isNotModified', () => {
    it('should return true when ETag matches', () => {
      service.set('key', { data: 'test' }, 'v1');
      const entry = service.get('key');

      expect(service.isNotModified(entry, entry?.etag)).toBe(true);
    });

    it('should return false when ETag does not match', () => {
      service.set('key', { data: 'test' }, 'v1');
      const entry = service.get('key');

      expect(service.isNotModified(entry, '"different-etag"')).toBe(false);
    });

    it('should return false for null entry', () => {
      expect(service.isNotModified(null, '"some-etag"')).toBe(false);
    });

    it('should return false for undefined ETag', () => {
      service.set('key', { data: 'test' }, 'v1');
      const entry = service.get('key');

      expect(service.isNotModified(entry, undefined)).toBe(false);
    });

    it('should handle weak ETags', () => {
      service.set('key', { data: 'test' }, 'v1');
      const entry = service.get('key');
      const weakEtag = `W/${entry?.etag}`;

      expect(service.isNotModified(entry, weakEtag)).toBe(true);
    });
  });

  describe('warmCache', () => {
    it('should preload multiple pages', async () => {
      const siteId = 'site-123';
      const pages = [
        { slug: 'home', content: { title: 'Home' } },
        { slug: 'about', content: { title: 'About' } },
        { slug: 'contact', content: { title: 'Contact' } },
      ];

      await service.warmCache(siteId, pages, 'v1');

      expect(service.get(service.generateCacheKey(siteId, 'home'))).not.toBeNull();
      expect(service.get(service.generateCacheKey(siteId, 'about'))).not.toBeNull();
      expect(service.get(service.generateCacheKey(siteId, 'contact'))).not.toBeNull();
    });
  });
});

describe('getCacheControlHeader', () => {
  it('should return correct header for STATIC profile', () => {
    const header = getCacheControlHeader('STATIC');
    expect(header).toContain('immutable');
    expect(header).toContain('max-age=31536000');
  });

  it('should return correct header for PAGE profile', () => {
    const header = getCacheControlHeader('PAGE');
    expect(header).toContain('max-age=300');
    expect(header).toContain('stale-while-revalidate=86400');
  });

  it('should return correct header for API profile', () => {
    const header = getCacheControlHeader('API');
    expect(header).toContain('max-age=60');
    expect(header).toContain('stale-while-revalidate=300');
  });

  it('should return correct header for DYNAMIC profile', () => {
    const header = getCacheControlHeader('DYNAMIC');
    expect(header).toContain('no-store');
    expect(header).toContain('no-cache');
  });
});

describe('CacheProfiles', () => {
  it('should have STATIC profile with long TTL', () => {
    expect(CacheProfiles.STATIC.ttlSeconds).toBe(31536000);
  });

  it('should have PAGE profile with short TTL', () => {
    expect(CacheProfiles.PAGE.ttlSeconds).toBe(300);
  });

  it('should have API profile with minimal TTL', () => {
    expect(CacheProfiles.API.ttlSeconds).toBe(60);
  });

  it('should have DYNAMIC profile with no cache', () => {
    expect(CacheProfiles.DYNAMIC.ttlSeconds).toBe(0);
    expect(CacheProfiles.DYNAMIC.noStore).toBe(true);
  });
});

describe('singleton export', () => {
  it('should export a singleton instance', () => {
    expect(siteCacheService).toBeInstanceOf(SiteCacheService);
  });
});
