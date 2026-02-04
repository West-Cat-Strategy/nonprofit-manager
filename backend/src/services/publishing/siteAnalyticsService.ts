/**
 * Site Analytics Service
 * Handles analytics recording and reporting for published sites
 */

import { Pool } from 'pg';
import type {
  SiteAnalyticsSummary,
  SiteAnalyticsRecord,
  AnalyticsEventType,
} from '../../types/publishing';
import { SiteManagementService } from './siteManagementService';

export class SiteAnalyticsService {
  private siteManagement: SiteManagementService;

  constructor(private pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
  }

  /**
   * Record an analytics event
   */
  async recordAnalyticsEvent(
    siteId: string,
    eventType: AnalyticsEventType,
    data: {
      pagePath: string;
      visitorId?: string;
      sessionId?: string;
      userAgent?: string;
      referrer?: string;
      country?: string;
      city?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
      eventData?: Record<string, unknown>;
    }
  ): Promise<SiteAnalyticsRecord> {
    const result = await this.pool.query(
      `INSERT INTO site_analytics (
        site_id, page_path, visitor_id, session_id, user_agent, referrer,
        country, city, device_type, browser, os, event_type, event_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        siteId,
        data.pagePath,
        data.visitorId || null,
        data.sessionId || null,
        data.userAgent || null,
        data.referrer || null,
        data.country || null,
        data.city || null,
        data.deviceType || null,
        data.browser || null,
        data.os || null,
        eventType,
        data.eventData ? JSON.stringify(data.eventData) : null,
      ]
    );

    return this.siteManagement.mapRowToAnalytics(result.rows[0]);
  }

  /**
   * Get analytics summary for a site
   */
  async getAnalyticsSummary(
    siteId: string,
    userId: string,
    periodDays: number = 30
  ): Promise<SiteAnalyticsSummary> {
    // Verify site ownership
    const site = await this.siteManagement.getSite(siteId, userId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodEnd = new Date();

    // Get total pageviews
    const pageviewsResult = await this.pool.query(
      `SELECT COUNT(*) FROM site_analytics
       WHERE site_id = $1 AND event_type = 'pageview' AND created_at >= $2`,
      [siteId, periodStart]
    );
    const totalPageviews = parseInt(pageviewsResult.rows[0].count, 10);

    // Get unique visitors
    const visitorsResult = await this.pool.query(
      `SELECT COUNT(DISTINCT visitor_id) FROM site_analytics
       WHERE site_id = $1 AND created_at >= $2 AND visitor_id IS NOT NULL`,
      [siteId, periodStart]
    );
    const uniqueVisitors = parseInt(visitorsResult.rows[0].count, 10);

    // Get top pages
    const topPagesResult = await this.pool.query(
      `SELECT page_path, COUNT(*) as views
       FROM site_analytics
       WHERE site_id = $1 AND event_type = 'pageview' AND created_at >= $2
       GROUP BY page_path
       ORDER BY views DESC
       LIMIT 10`,
      [siteId, periodStart]
    );
    const topPages = topPagesResult.rows.map((row) => ({
      path: row.page_path,
      views: parseInt(row.views, 10),
    }));

    // Get traffic by device
    const deviceResult = await this.pool.query(
      `SELECT COALESCE(device_type, 'unknown') as device, COUNT(*) as count
       FROM site_analytics
       WHERE site_id = $1 AND created_at >= $2
       GROUP BY device_type
       ORDER BY count DESC`,
      [siteId, periodStart]
    );
    const trafficByDevice = deviceResult.rows.map((row) => ({
      device: row.device,
      count: parseInt(row.count, 10),
    }));

    // Get traffic by country
    const countryResult = await this.pool.query(
      `SELECT COALESCE(country, 'unknown') as country, COUNT(*) as count
       FROM site_analytics
       WHERE site_id = $1 AND created_at >= $2
       GROUP BY country
       ORDER BY count DESC
       LIMIT 10`,
      [siteId, periodStart]
    );
    const trafficByCountry = countryResult.rows.map((row) => ({
      country: row.country,
      count: parseInt(row.count, 10),
    }));

    // Get recent events
    const recentEventsResult = await this.pool.query(
      `SELECT * FROM site_analytics
       WHERE site_id = $1 AND created_at >= $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [siteId, periodStart]
    );
    const recentEvents = recentEventsResult.rows.map((row) => this.siteManagement.mapRowToAnalytics(row));

    return {
      totalPageviews,
      uniqueVisitors,
      topPages,
      trafficByDevice,
      trafficByCountry,
      recentEvents,
      periodStart,
      periodEnd,
    };
  }
}
