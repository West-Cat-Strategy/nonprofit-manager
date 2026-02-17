/**
 * Cached Analytics Service
 * Wraps the analytics service with caching for improved performance
 */
import { Pool } from 'pg';
import type { AccountAnalytics, ContactAnalytics, AnalyticsSummary, AnalyticsFilters, ComparativeAnalytics, TrendAnalysis } from '../types/analytics';
export declare class CachedAnalyticsService {
    private analyticsService;
    constructor(pool: Pool);
    /**
     * Get account analytics with caching
     * Cache TTL: 5 minutes
     */
    getAccountAnalytics(accountId: string): Promise<AccountAnalytics>;
    /**
     * Get contact analytics with caching
     * Cache TTL: 5 minutes
     */
    getContactAnalytics(contactId: string): Promise<ContactAnalytics>;
    /**
     * Get analytics summary with caching
     * Cache key includes filter parameters
     * Cache TTL: 3 minutes (shorter due to frequent updates)
     */
    getAnalyticsSummary(filters?: AnalyticsFilters): Promise<AnalyticsSummary>;
    /**
     * Get comparative analytics with caching
     * Cache TTL: 10 minutes (slower changing data)
     */
    getComparativeAnalytics(periodType?: 'month' | 'quarter' | 'year'): Promise<ComparativeAnalytics>;
    /**
     * Get trend analytics with caching
     * Cache TTL: 5 minutes
     */
    getTrendAnalytics(metricType: 'donations' | 'volunteer_hours' | 'event_attendance', months?: number): Promise<TrendAnalysis>;
    /**
     * Invalidate cache for a specific user
     * Call this when user makes changes that affect analytics
     */
    invalidateUserCache(userId: string): void;
    /**
     * Invalidate specific cache entry
     */
    invalidateCache(key: string): void;
    /**
     * Clear all analytics cache
     * Use sparingly - only when major data changes occur
     */
    clearAllCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        keys: string[];
    };
}
export default CachedAnalyticsService;
//# sourceMappingURL=cachedAnalyticsService.d.ts.map