/**
 * Event Analytics Service
 * Handles event-related metrics and attendance trends
 */
import { Pool } from 'pg';
import type { EventMetrics } from '../../types/analytics';
export declare class EventAnalyticsService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get event metrics for an account or contact
     */
    getEventMetrics(entityType: 'account' | 'contact', entityId: string): Promise<EventMetrics>;
    /**
     * Get event attendance trends by month for the last N months
     */
    getEventAttendanceTrends(months?: number): Promise<Array<{
        month: string;
        total_events: number;
        total_registrations: number;
        total_attendance: number;
        capacity_utilization: number;
        attendance_rate: number;
    }>>;
}
//# sourceMappingURL=eventAnalytics.d.ts.map