/**
 * Site Analytics Service
 * Handles analytics recording and reporting for published sites
 */

import { Pool } from 'pg';
import type {
  SiteAnalyticsSummary,
  SiteAnalyticsRecord,
  AnalyticsEventType,
  WebsiteConversionFunnel,
  WebsiteConversionMetrics,
} from '@app-types/publishing';
import { SiteManagementService } from './siteManagementService';
import { conversionEventService, ConversionEventService } from './conversionEventService';

export class SiteAnalyticsService {
  private siteManagement: SiteManagementService;
  private conversionEvents: ConversionEventService;

  constructor(private pool: Pool) {
    this.siteManagement = new SiteManagementService(pool);
    this.conversionEvents = new ConversionEventService(pool);
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

    await this.conversionEvents.recordAnalyticsEvent(siteId, eventType, data);

    return this.siteManagement.mapRowToAnalytics(result.rows[0]);
  }

  /**
   * Get analytics summary for a site
   */
  async getAnalyticsSummary(
    siteId: string,
    userId: string,
    periodDays: number = 30,
    organizationId?: string
  ): Promise<SiteAnalyticsSummary> {
    // Verify site ownership
    const site = await this.siteManagement.getSite(siteId, userId, organizationId);
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

  async getConversionMetrics(
    siteId: string,
    userId: string,
    periodDays: number = 30,
    organizationId?: string
  ): Promise<WebsiteConversionMetrics> {
    const site = await this.siteManagement.getSite(siteId, userId, organizationId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodEnd = new Date();

    const totalsResult = await this.pool.query<{
      total_pageviews: string;
      unique_visitors: string;
      form_submissions: string;
      event_registrations: string;
      donations: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'pageview')::text AS total_pageviews,
         COUNT(DISTINCT visitor_id)::text AS unique_visitors,
         COUNT(*) FILTER (WHERE event_type = 'form_submit')::text AS form_submissions,
         COUNT(*) FILTER (WHERE event_type = 'event_register')::text AS event_registrations,
         COUNT(*) FILTER (WHERE event_type = 'donation')::text AS donations
       FROM site_analytics
       WHERE site_id = $1
         AND created_at >= $2`,
      [siteId, periodStart]
    );

    const recentConversionsResult = await this.pool.query(
      `SELECT *
       FROM site_analytics
       WHERE site_id = $1
         AND created_at >= $2
         AND event_type IN ('form_submit', 'event_register', 'donation')
       ORDER BY created_at DESC
       LIMIT 20`,
      [siteId, periodStart]
    );

    const totals = totalsResult.rows[0];
    const formSubmissions = Number.parseInt(totals?.form_submissions ?? '0', 10);
    const eventRegistrations = Number.parseInt(totals?.event_registrations ?? '0', 10);
    const donations = Number.parseInt(totals?.donations ?? '0', 10);

    return {
      totalPageviews: Number.parseInt(totals?.total_pageviews ?? '0', 10),
      uniqueVisitors: Number.parseInt(totals?.unique_visitors ?? '0', 10),
      formSubmissions,
      eventRegistrations,
      donations,
      totalConversions: formSubmissions + eventRegistrations + donations,
      periodStart,
      periodEnd,
      recentConversions: recentConversionsResult.rows.map((row) =>
        this.siteManagement.mapRowToAnalytics(row)
      ),
    };
  }

  async getConversionFunnel(
    siteId: string,
    userId: string,
    windowDays: number = 30,
    organizationId?: string
  ): Promise<WebsiteConversionFunnel> {
    const site = await this.siteManagement.getSite(siteId, userId, organizationId);
    if (!site) {
      throw new Error('Site not found or access denied');
    }

    return this.conversionEvents.getFunnel(siteId, windowDays);
  }
}
