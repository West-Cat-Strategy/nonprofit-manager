/**
 * Cached Analytics Service
 * Wraps the analytics service with caching for improved performance
 */

import { Pool } from 'pg';
import { AnalyticsService } from './analyticsService';
import { analyticsCache, createCacheKey, invalidateAnalyticsCache } from '../utils/cache';
import type {
  AccountAnalytics,
  ContactAnalytics,
  AnalyticsSummary,
  AnalyticsFilters,
  ComparativeAnalytics,
  TrendAnalytics,
} from '../types/analytics';

export class CachedAnalyticsService {
  private analyticsService: AnalyticsService;

  constructor(pool: Pool) {
    this.analyticsService = new AnalyticsService(pool);
  }

  /**
   * Get account analytics with caching
   * Cache TTL: 5 minutes
   */
  async getAccountAnalytics(accountId: string): Promise<AccountAnalytics> {
    const cacheKey = createCacheKey('account-analytics', accountId);

    return analyticsCache.getOrSet(
      cacheKey,
      () => this.analyticsService.getAccountAnalytics(accountId),
      300 // 5 minutes
    );
  }

  /**
   * Get contact analytics with caching
   * Cache TTL: 5 minutes
   */
  async getContactAnalytics(contactId: string): Promise<ContactAnalytics> {
    const cacheKey = createCacheKey('contact-analytics', contactId);

    return analyticsCache.getOrSet(
      cacheKey,
      () => this.analyticsService.getContactAnalytics(contactId),
      300 // 5 minutes
    );
  }

  /**
   * Get analytics summary with caching
   * Cache key includes filter parameters
   * Cache TTL: 3 minutes (shorter due to frequent updates)
   */
  async getAnalyticsSummary(filters?: AnalyticsFilters): Promise<AnalyticsSummary> {
    const cacheKey = createCacheKey(
      'analytics-summary',
      filters?.start_date,
      filters?.end_date,
      filters?.donor_type,
      filters?.payment_method
    );

    return analyticsCache.getOrSet(
      cacheKey,
      () => this.analyticsService.getAnalyticsSummary(filters),
      180 // 3 minutes
    );
  }

  /**
   * Get comparative analytics with caching
   * Cache TTL: 10 minutes (slower changing data)
   */
  async getComparativeAnalytics(
    periodType: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ComparativeAnalytics> {
    const cacheKey = createCacheKey('comparative-analytics', periodType);

    return analyticsCache.getOrSet(
      cacheKey,
      () => this.analyticsService.getComparativeAnalytics(periodType),
      600 // 10 minutes
    );
  }

  /**
   * Get trend analytics with caching
   * Cache TTL: 5 minutes
   */
  async getTrendAnalytics(
    metricType: string,
    startDate: string,
    endDate: string,
    granularity: 'day' | 'week' | 'month' = 'month'
  ): Promise<TrendAnalytics> {
    const cacheKey = createCacheKey(
      'trend-analytics',
      metricType,
      startDate,
      endDate,
      granularity
    );

    return analyticsCache.getOrSet(
      cacheKey,
      () => this.analyticsService.getTrendAnalytics(metricType, startDate, endDate, granularity),
      300 // 5 minutes
    );
  }

  /**
   * Invalidate cache for a specific user
   * Call this when user makes changes that affect analytics
   */
  invalidateUserCache(userId: string): void {
    invalidateAnalyticsCache(userId);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidateCache(key: string): void {
    analyticsCache.delete(key);
  }

  /**
   * Clear all analytics cache
   * Use sparingly - only when major data changes occur
   */
  clearAllCache(): void {
    analyticsCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return analyticsCache.stats();
  }
}

export default CachedAnalyticsService;
