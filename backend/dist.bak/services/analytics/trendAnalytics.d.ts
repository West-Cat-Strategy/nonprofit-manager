/**
 * Trend Analytics Service
 * Handles trend analysis, anomaly detection, and comparative analytics
 */
import { Pool } from 'pg';
import type { ComparativeAnalytics, TrendAnalysis, AnomalyDetectionResult } from '../../types/analytics';
export declare class TrendAnalyticsService {
    private pool;
    private donationAnalytics;
    private volunteerAnalytics;
    private eventAnalytics;
    constructor(pool: Pool);
    /**
     * Calculate simple moving average
     */
    private calculateMovingAverage;
    /**
     * Calculate statistical summary for anomaly detection
     */
    private calculateStatistics;
    /**
     * Detect trend direction and strength using linear regression
     */
    private detectTrend;
    /**
     * Analyze trends with moving averages
     */
    getTrendAnalysis(metricType: 'donations' | 'volunteer_hours' | 'event_attendance', months?: number): Promise<TrendAnalysis>;
    /**
     * Detect anomalies in metric data using statistical methods
     */
    detectAnomalies(metricType: 'donations' | 'volunteer_hours' | 'event_attendance', months?: number, sensitivityStdDev?: number): Promise<AnomalyDetectionResult>;
    /**
     * Get comparative analytics (YoY, MoM, QoQ)
     */
    getComparativeAnalytics(periodType?: 'month' | 'quarter' | 'year'): Promise<ComparativeAnalytics>;
}
//# sourceMappingURL=trendAnalytics.d.ts.map