"use strict";
/**
 * Donation Analytics Service
 * Handles donation-related metrics and trends
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonationAnalyticsService = void 0;
const logger_1 = require("../../config/logger");
const redis_1 = require("../../config/redis");
class DonationAnalyticsService {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Get donation metrics for an account or contact
     */
    async getDonationMetrics(entityType, entityId) {
        try {
            const idColumn = entityType === 'account' ? 'account_id' : 'contact_id';
            // Get aggregate donation stats
            const statsQuery = `
        SELECT
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(*) as total_count,
          COALESCE(AVG(amount), 0) as average_amount,
          MIN(donation_date) as first_donation_date,
          MAX(donation_date) as last_donation_date,
          COALESCE(MAX(amount), 0) as largest_donation,
          COUNT(*) FILTER (WHERE is_recurring = true) as recurring_donations,
          COALESCE(SUM(amount) FILTER (WHERE is_recurring = true), 0) as recurring_amount
        FROM donations
        WHERE ${idColumn} = $1 AND payment_status = 'completed'
      `;
            const statsResult = await this.pool.query(statsQuery, [entityId]);
            const stats = statsResult.rows[0];
            // Get breakdown by payment method
            const methodQuery = `
        SELECT
          payment_method,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as amount
        FROM donations
        WHERE ${idColumn} = $1 AND payment_status = 'completed'
        GROUP BY payment_method
      `;
            const methodResult = await this.pool.query(methodQuery, [entityId]);
            const byPaymentMethod = {};
            for (const row of methodResult.rows) {
                byPaymentMethod[row.payment_method] = {
                    count: parseInt(row.count),
                    amount: parseFloat(row.amount),
                };
            }
            // Get breakdown by year
            const yearQuery = `
        SELECT
          EXTRACT(YEAR FROM donation_date) as year,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as amount
        FROM donations
        WHERE ${idColumn} = $1 AND payment_status = 'completed'
        GROUP BY EXTRACT(YEAR FROM donation_date)
        ORDER BY year DESC
        LIMIT 5
      `;
            const yearResult = await this.pool.query(yearQuery, [entityId]);
            const byYear = {};
            for (const row of yearResult.rows) {
                byYear[row.year] = {
                    count: parseInt(row.count),
                    amount: parseFloat(row.amount),
                };
            }
            return {
                total_amount: parseFloat(stats.total_amount),
                total_count: parseInt(stats.total_count),
                average_amount: parseFloat(stats.average_amount),
                first_donation_date: stats.first_donation_date,
                last_donation_date: stats.last_donation_date,
                recurring_donations: parseInt(stats.recurring_donations),
                recurring_amount: parseFloat(stats.recurring_amount),
                largest_donation: parseFloat(stats.largest_donation),
                by_payment_method: byPaymentMethod,
                by_year: byYear,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting donation metrics', { error, entityType, entityId });
            throw new Error('Failed to retrieve donation metrics');
        }
    }
    /**
     * Get donation trends by month for the last N months
     */
    async getDonationTrends(months = 12) {
        try {
            // Try to get from cache
            const cacheKey = `analytics:donation-trends:${months}`;
            const cached = await (0, redis_1.getCached)(cacheKey);
            if (cached) {
                logger_1.logger.debug('Donation trends cache hit', { cacheKey });
                return cached;
            }
            const query = `
        SELECT
          TO_CHAR(donation_date, 'YYYY-MM') as month,
          COALESCE(SUM(amount), 0) as amount,
          COUNT(*) as count
        FROM donations
        WHERE payment_status = 'completed'
          AND donation_date >= NOW() - INTERVAL '${months} months'
        GROUP BY TO_CHAR(donation_date, 'YYYY-MM')
        ORDER BY month ASC
      `;
            const result = await this.pool.query(query);
            // Fill in missing months with zeros
            const trends = [];
            const now = new Date();
            for (let i = months - 1; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthStr = date.toISOString().substring(0, 7); // YYYY-MM format
                const existing = result.rows.find((row) => row.month === monthStr);
                trends.push({
                    month: monthStr,
                    amount: existing ? parseFloat(existing.amount) : 0,
                    count: existing ? parseInt(existing.count) : 0,
                });
            }
            // Cache for 10 minutes (600 seconds)
            await (0, redis_1.setCached)(cacheKey, trends, 600);
            return trends;
        }
        catch (error) {
            logger_1.logger.error('Error getting donation trends', { error });
            throw new Error('Failed to retrieve donation trends');
        }
    }
}
exports.DonationAnalyticsService = DonationAnalyticsService;
//# sourceMappingURL=donationAnalytics.js.map