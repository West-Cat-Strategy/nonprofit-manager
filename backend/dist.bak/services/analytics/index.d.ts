/**
 * Analytics Services Index
 * Barrel exports and facade for analytics functionality
 */
import { Pool } from 'pg';
import type { AccountAnalytics, ContactAnalytics, AnalyticsSummary, AnalyticsFilters, DonationMetrics, EventMetrics, VolunteerMetrics, TaskMetrics, ComparativeAnalytics, TrendAnalysis, AnomalyDetectionResult } from '../../types/analytics';
export { DonationAnalyticsService } from './donationAnalytics';
export { EventAnalyticsService } from './eventAnalytics';
export { VolunteerAnalyticsService } from './volunteerAnalytics';
export { TaskAnalyticsService } from './taskAnalytics';
export { TrendAnalyticsService } from './trendAnalytics';
export { calculateEngagementScore, getEngagementLevel } from './engagement';
/**
 * Analytics Service Facade
 * Provides a unified interface for all analytics functionality
 * This is the main class used by controllers
 */
export declare class AnalyticsService {
    private pool;
    private donationAnalytics;
    private eventAnalytics;
    private volunteerAnalytics;
    private taskAnalytics;
    private trendAnalytics;
    constructor(pool: Pool);
    getDonationMetrics(entityType: 'account' | 'contact', entityId: string): Promise<DonationMetrics>;
    getDonationTrends(months?: number): Promise<{
        month: string;
        amount: number;
        count: number;
    }[]>;
    getEventMetrics(entityType: 'account' | 'contact', entityId: string): Promise<EventMetrics>;
    getEventAttendanceTrends(months?: number): Promise<{
        month: string;
        total_events: number;
        total_registrations: number;
        total_attendance: number;
        capacity_utilization: number;
        attendance_rate: number;
    }[]>;
    getVolunteerMetrics(contactId: string): Promise<VolunteerMetrics | null>;
    getVolunteerHoursTrends(months?: number): Promise<{
        month: string;
        hours: number;
        assignments: number;
    }[]>;
    getTaskMetrics(entityType: 'account' | 'contact', entityId: string): Promise<TaskMetrics>;
    getTrendAnalysis(metricType: 'donations' | 'volunteer_hours' | 'event_attendance', months?: number): Promise<TrendAnalysis>;
    detectAnomalies(metricType: 'donations' | 'volunteer_hours' | 'event_attendance', months?: number, sensitivityStdDev?: number): Promise<AnomalyDetectionResult>;
    getComparativeAnalytics(periodType?: 'month' | 'quarter' | 'year'): Promise<ComparativeAnalytics>;
    /**
     * Get full analytics for an account
     */
    getAccountAnalytics(accountId: string): Promise<AccountAnalytics>;
    /**
     * Get full analytics for a contact
     */
    getContactAnalytics(contactId: string): Promise<ContactAnalytics>;
    /**
     * Get organization-wide analytics summary
     */
    getAnalyticsSummary(filters?: AnalyticsFilters): Promise<AnalyticsSummary>;
}
export declare const analyticsService: AnalyticsService;
export default analyticsService;
//# sourceMappingURL=index.d.ts.map