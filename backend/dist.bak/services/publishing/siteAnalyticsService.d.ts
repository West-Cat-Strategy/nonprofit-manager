/**
 * Site Analytics Service
 * Handles analytics recording and reporting for published sites
 */
import { Pool } from 'pg';
import type { SiteAnalyticsSummary, SiteAnalyticsRecord, AnalyticsEventType } from '../../types/publishing';
export declare class SiteAnalyticsService {
    private pool;
    private siteManagement;
    constructor(pool: Pool);
    /**
     * Record an analytics event
     */
    recordAnalyticsEvent(siteId: string, eventType: AnalyticsEventType, data: {
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
    }): Promise<SiteAnalyticsRecord>;
    /**
     * Get analytics summary for a site
     */
    getAnalyticsSummary(siteId: string, userId: string, periodDays?: number): Promise<SiteAnalyticsSummary>;
}
//# sourceMappingURL=siteAnalyticsService.d.ts.map