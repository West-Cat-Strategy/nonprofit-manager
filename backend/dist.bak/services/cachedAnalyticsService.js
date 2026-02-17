"use strict";
/**
 * Cached Analytics Service
 * Wraps the analytics service with caching for improved performance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedAnalyticsService = void 0;
const analyticsService_1 = require("./analyticsService");
const cache_1 = require("../utils/cache");
class CachedAnalyticsService {
    constructor(pool) {
        this.analyticsService = new analyticsService_1.AnalyticsService(pool);
    }
    /**
     * Get account analytics with caching
     * Cache TTL: 5 minutes
     */
    async getAccountAnalytics(accountId) {
        const cacheKey = cache_1.CacheKeys.analytics('account', accountId);
        return cache_1.analyticsCache.getOrSet(cacheKey, () => this.analyticsService.getAccountAnalytics(accountId), 300 // 5 minutes
        );
    }
    /**
     * Get contact analytics with caching
     * Cache TTL: 5 minutes
     */
    async getContactAnalytics(contactId) {
        const cacheKey = cache_1.CacheKeys.analytics('contact', contactId);
        return cache_1.analyticsCache.getOrSet(cacheKey, () => this.analyticsService.getContactAnalytics(contactId), 300 // 5 minutes
        );
    }
    /**
     * Get analytics summary with caching
     * Cache key includes filter parameters
     * Cache TTL: 3 minutes (shorter due to frequent updates)
     */
    async getAnalyticsSummary(filters) {
        const cacheKey = cache_1.CacheKeys.analytics('summary', filters?.start_date || 'all', filters?.end_date || 'all', filters?.account_type || 'all', filters?.category || 'all');
        return cache_1.analyticsCache.getOrSet(cacheKey, () => this.analyticsService.getAnalyticsSummary(filters), 180 // 3 minutes
        );
    }
    /**
     * Get comparative analytics with caching
     * Cache TTL: 10 minutes (slower changing data)
     */
    async getComparativeAnalytics(periodType = 'month') {
        const cacheKey = cache_1.CacheKeys.analytics('comparative', periodType);
        return cache_1.analyticsCache.getOrSet(cacheKey, () => this.analyticsService.getComparativeAnalytics(periodType), 600 // 10 minutes
        );
    }
    /**
     * Get trend analytics with caching
     * Cache TTL: 5 minutes
     */
    async getTrendAnalytics(metricType, months = 12) {
        const cacheKey = cache_1.CacheKeys.analytics('trend', metricType, months);
        return cache_1.analyticsCache.getOrSet(cacheKey, () => this.analyticsService.getTrendAnalysis(metricType, months), 300 // 5 minutes
        );
    }
    /**
     * Invalidate cache for a specific user
     * Call this when user makes changes that affect analytics
     */
    invalidateUserCache(userId) {
        (0, cache_1.invalidateAnalyticsCache)(userId);
    }
    /**
     * Invalidate specific cache entry
     */
    invalidateCache(key) {
        cache_1.analyticsCache.delete(key);
    }
    /**
     * Clear all analytics cache
     * Use sparingly - only when major data changes occur
     */
    clearAllCache() {
        cache_1.analyticsCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return cache_1.analyticsCache.stats();
    }
}
exports.CachedAnalyticsService = CachedAnalyticsService;
exports.default = CachedAnalyticsService;
//# sourceMappingURL=cachedAnalyticsService.js.map