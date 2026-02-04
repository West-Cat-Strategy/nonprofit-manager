/**
 * Cached Analytics Service
 * Wraps the analytics service with caching for improved performance
 */

import { Pool } from 'pg';
import { AnalyticsService } from './analyticsService';
import { analyticsCache, CacheKeys, invalidateAnalyticsCache } from '../utils/cache';
import type {
  AccountAnalytics,
  ContactAnalytics,
  AnalyticsSummary,
  AnalyticsFilters,
  ComparativeAnalytics,
  TrendAnalysis,
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
    const cacheKey = CacheKeys.analytics('account', accountId);

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
    const cacheKey = CacheKeys.analytics('contact', contactId);

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
    const cacheKey = CacheKeys.analytics(
      'summary',
      filters?.start_date || 'all',
      filters?.end_date || 'all',
      filters?.account_type || 'all',
      filters?.category || 'all'
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
    const cacheKey = CacheKeys.analytics('comparative', periodType);

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
    metricType: 'donations' | 'volunteer_hours' | 'event_attendance',
    months: number = 12
  ): Promise<TrendAnalysis> {
    const cacheKey = CacheKeys.analytics('trend', metricType, months);

    return analyticsCache.getOrSet(
      cacheKey,
      () => this.analyticsService.getTrendAnalysis(metricType, months),
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
