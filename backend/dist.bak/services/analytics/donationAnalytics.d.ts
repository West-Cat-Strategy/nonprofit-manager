/**
 * Donation Analytics Service
 * Handles donation-related metrics and trends
 */
import { Pool } from 'pg';
import type { DonationMetrics } from '../../types/analytics';
export declare class DonationAnalyticsService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get donation metrics for an account or contact
     */
    getDonationMetrics(entityType: 'account' | 'contact', entityId: string): Promise<DonationMetrics>;
    /**
     * Get donation trends by month for the last N months
     */
    getDonationTrends(months?: number): Promise<Array<{
        month: string;
        amount: number;
        count: number;
    }>>;
}
//# sourceMappingURL=donationAnalytics.d.ts.map