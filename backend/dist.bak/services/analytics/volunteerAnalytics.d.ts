/**
 * Volunteer Analytics Service
 * Handles volunteer-related metrics and hour trends
 */
import { Pool } from 'pg';
import type { VolunteerMetrics } from '../../types/analytics';
export declare class VolunteerAnalyticsService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get volunteer metrics for a contact
     */
    getVolunteerMetrics(contactId: string): Promise<VolunteerMetrics | null>;
    /**
     * Get volunteer hours trends by month for the last N months
     */
    getVolunteerHoursTrends(months?: number): Promise<Array<{
        month: string;
        hours: number;
        assignments: number;
    }>>;
}
//# sourceMappingURL=volunteerAnalytics.d.ts.map