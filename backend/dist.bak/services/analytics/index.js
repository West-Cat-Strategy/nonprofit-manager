"use strict";
/**
 * Analytics Services Index
 * Barrel exports and facade for analytics functionality
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = exports.getEngagementLevel = exports.calculateEngagementScore = exports.TrendAnalyticsService = exports.TaskAnalyticsService = exports.VolunteerAnalyticsService = exports.EventAnalyticsService = exports.DonationAnalyticsService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = require("../../config/logger");
const redis_1 = require("../../config/redis");
// Export individual service classes
var donationAnalytics_1 = require("./donationAnalytics");
Object.defineProperty(exports, "DonationAnalyticsService", { enumerable: true, get: function () { return donationAnalytics_1.DonationAnalyticsService; } });
var eventAnalytics_1 = require("./eventAnalytics");
Object.defineProperty(exports, "EventAnalyticsService", { enumerable: true, get: function () { return eventAnalytics_1.EventAnalyticsService; } });
var volunteerAnalytics_1 = require("./volunteerAnalytics");
Object.defineProperty(exports, "VolunteerAnalyticsService", { enumerable: true, get: function () { return volunteerAnalytics_1.VolunteerAnalyticsService; } });
var taskAnalytics_1 = require("./taskAnalytics");
Object.defineProperty(exports, "TaskAnalyticsService", { enumerable: true, get: function () { return taskAnalytics_1.TaskAnalyticsService; } });
var trendAnalytics_1 = require("./trendAnalytics");
Object.defineProperty(exports, "TrendAnalyticsService", { enumerable: true, get: function () { return trendAnalytics_1.TrendAnalyticsService; } });
var engagement_1 = require("./engagement");
Object.defineProperty(exports, "calculateEngagementScore", { enumerable: true, get: function () { return engagement_1.calculateEngagementScore; } });
Object.defineProperty(exports, "getEngagementLevel", { enumerable: true, get: function () { return engagement_1.getEngagementLevel; } });
// Import service classes for facade
const donationAnalytics_2 = require("./donationAnalytics");
const eventAnalytics_2 = require("./eventAnalytics");
const volunteerAnalytics_2 = require("./volunteerAnalytics");
const taskAnalytics_2 = require("./taskAnalytics");
const trendAnalytics_2 = require("./trendAnalytics");
const engagement_2 = require("./engagement");
/**
 * Analytics Service Facade
 * Provides a unified interface for all analytics functionality
 * This is the main class used by controllers
 */
class AnalyticsService {
    constructor(pool) {
        this.pool = pool;
        this.donationAnalytics = new donationAnalytics_2.DonationAnalyticsService(pool);
        this.eventAnalytics = new eventAnalytics_2.EventAnalyticsService(pool);
        this.volunteerAnalytics = new volunteerAnalytics_2.VolunteerAnalyticsService(pool);
        this.taskAnalytics = new taskAnalytics_2.TaskAnalyticsService(pool);
        this.trendAnalytics = new trendAnalytics_2.TrendAnalyticsService(pool);
    }
    // Delegation methods for donation analytics
    async getDonationMetrics(entityType, entityId) {
        return this.donationAnalytics.getDonationMetrics(entityType, entityId);
    }
    async getDonationTrends(months) {
        return this.donationAnalytics.getDonationTrends(months);
    }
    // Delegation methods for event analytics
    async getEventMetrics(entityType, entityId) {
        return this.eventAnalytics.getEventMetrics(entityType, entityId);
    }
    async getEventAttendanceTrends(months) {
        return this.eventAnalytics.getEventAttendanceTrends(months);
    }
    // Delegation methods for volunteer analytics
    async getVolunteerMetrics(contactId) {
        return this.volunteerAnalytics.getVolunteerMetrics(contactId);
    }
    async getVolunteerHoursTrends(months) {
        return this.volunteerAnalytics.getVolunteerHoursTrends(months);
    }
    // Delegation methods for task analytics
    async getTaskMetrics(entityType, entityId) {
        return this.taskAnalytics.getTaskMetrics(entityType, entityId);
    }
    // Delegation methods for trend analytics
    async getTrendAnalysis(metricType, months) {
        return this.trendAnalytics.getTrendAnalysis(metricType, months);
    }
    async detectAnomalies(metricType, months, sensitivityStdDev) {
        return this.trendAnalytics.detectAnomalies(metricType, months, sensitivityStdDev);
    }
    async getComparativeAnalytics(periodType) {
        return this.trendAnalytics.getComparativeAnalytics(periodType);
    }
    /**
     * Get full analytics for an account
     */
    async getAccountAnalytics(accountId) {
        try {
            // Get account info
            const accountQuery = `
        SELECT
          a.id as account_id,
          a.account_name,
          a.account_type,
          a.category,
          a.created_at,
          COUNT(c.id) as contact_count
        FROM accounts a
        LEFT JOIN contacts c ON a.id = c.account_id AND c.is_active = true
        WHERE a.id = $1
        GROUP BY a.id
      `;
            const accountResult = await this.pool.query(accountQuery, [accountId]);
            if (accountResult.rows.length === 0) {
                throw new Error('Account not found');
            }
            const account = accountResult.rows[0];
            // Get primary contact
            const primaryContactQuery = `
        SELECT
          c.id as contact_id,
          c.first_name || ' ' || c.last_name as name,
          c.email
        FROM contacts c
        LEFT JOIN contact_role_assignments cra ON cra.contact_id = c.id
        LEFT JOIN contact_roles cr ON cr.id = cra.role_id AND cr.name = 'Primary Contact'
        WHERE c.account_id = $1 AND c.is_active = true
        ORDER BY CASE WHEN cr.id IS NOT NULL THEN 0 ELSE 1 END, c.created_at ASC
        LIMIT 1
      `;
            const primaryResult = await this.pool.query(primaryContactQuery, [accountId]);
            const primaryContact = primaryResult.rows[0] || undefined;
            // Get all metrics
            const [donationMetrics, eventMetrics, taskMetrics] = await Promise.all([
                this.getDonationMetrics('account', accountId),
                this.getEventMetrics('account', accountId),
                this.getTaskMetrics('account', accountId),
            ]);
            const engagementScore = (0, engagement_2.calculateEngagementScore)(donationMetrics, eventMetrics, null, taskMetrics);
            return {
                account_id: account.account_id,
                account_name: account.account_name,
                account_type: account.account_type,
                category: account.category,
                created_at: account.created_at,
                contact_count: parseInt(account.contact_count),
                primary_contact: primaryContact,
                donation_metrics: donationMetrics,
                event_metrics: eventMetrics,
                task_metrics: taskMetrics,
                engagement_score: engagementScore,
                engagement_level: (0, engagement_2.getEngagementLevel)(engagementScore),
            };
        }
        catch (error) {
            // Preserve "not found" errors for proper HTTP 404 response
            if (error.message === 'Account not found') {
                throw error;
            }
            logger_1.logger.error('Error getting account analytics', { error, accountId });
            throw new Error('Failed to retrieve account analytics');
        }
    }
    /**
     * Get full analytics for a contact
     */
    async getContactAnalytics(contactId) {
        try {
            // Get contact info
            const contactQuery = `
        SELECT
          c.id as contact_id,
          c.first_name || ' ' || c.last_name as contact_name,
          c.email,
          c.account_id,
          a.account_name,
          COALESCE(
            ARRAY_AGG(DISTINCT cr.name) FILTER (WHERE cr.name IS NOT NULL),
            ARRAY[]::text[]
          ) as contact_roles,
          c.created_at
        FROM contacts c
        LEFT JOIN accounts a ON c.account_id = a.id
        LEFT JOIN contact_role_assignments cra ON cra.contact_id = c.id
        LEFT JOIN contact_roles cr ON cr.id = cra.role_id
        WHERE c.id = $1
        GROUP BY c.id, a.account_name
      `;
            const contactResult = await this.pool.query(contactQuery, [contactId]);
            if (contactResult.rows.length === 0) {
                throw new Error('Contact not found');
            }
            const contact = contactResult.rows[0];
            // Get all metrics
            const [donationMetrics, eventMetrics, volunteerMetrics, taskMetrics] = await Promise.all([
                this.getDonationMetrics('contact', contactId),
                this.getEventMetrics('contact', contactId),
                this.getVolunteerMetrics(contactId),
                this.getTaskMetrics('contact', contactId),
            ]);
            const engagementScore = (0, engagement_2.calculateEngagementScore)(donationMetrics, eventMetrics, volunteerMetrics, taskMetrics);
            return {
                contact_id: contact.contact_id,
                contact_name: contact.contact_name,
                email: contact.email,
                account_id: contact.account_id,
                account_name: contact.account_name,
                contact_roles: contact.contact_roles || [],
                created_at: contact.created_at,
                donation_metrics: donationMetrics,
                event_metrics: eventMetrics,
                volunteer_metrics: volunteerMetrics,
                task_metrics: taskMetrics,
                engagement_score: engagementScore,
                engagement_level: (0, engagement_2.getEngagementLevel)(engagementScore),
            };
        }
        catch (error) {
            // Preserve "not found" errors for proper HTTP 404 response
            if (error.message === 'Contact not found') {
                throw error;
            }
            logger_1.logger.error('Error getting contact analytics', { error, contactId });
            throw new Error('Failed to retrieve contact analytics');
        }
    }
    /**
     * Get organization-wide analytics summary
     */
    async getAnalyticsSummary(filters) {
        try {
            const startDate = filters?.start_date || new Date(new Date().getFullYear(), 0, 1).toISOString();
            const endDate = filters?.end_date || new Date().toISOString();
            // Try to get from cache
            const cacheKey = `analytics:summary:${startDate}:${endDate}`;
            const cached = await (0, redis_1.getCached)(cacheKey);
            if (cached) {
                logger_1.logger.debug('Analytics summary cache hit', { cacheKey });
                return cached;
            }
            // Get account stats
            const accountQuery = `
        SELECT
          COUNT(*) as total_accounts,
          COUNT(*) FILTER (WHERE is_active = true) as active_accounts
        FROM accounts
      `;
            // Get contact stats
            const contactQuery = `
        SELECT
          COUNT(*) as total_contacts,
          COUNT(*) FILTER (WHERE is_active = true) as active_contacts
        FROM contacts
      `;
            // Get donation stats for period
            const donationQuery = `
        SELECT
          COALESCE(SUM(amount), 0) as total_donations,
          COUNT(*) as donation_count,
          COALESCE(AVG(amount), 0) as average_donation
        FROM donations
        WHERE payment_status = 'completed'
          AND donation_date >= $1 AND donation_date <= $2
      `;
            // Get event stats for period
            const eventQuery = `
        SELECT COUNT(*) as total_events
        FROM events
        WHERE start_date >= $1 AND start_date <= $2
      `;
            // Get volunteer stats
            const volunteerQuery = `
        SELECT
          COUNT(DISTINCT v.id) as total_volunteers,
          COALESCE(SUM(vh.hours_logged), 0) as total_hours
        FROM volunteers v
        LEFT JOIN volunteer_hours vh ON v.id = vh.volunteer_id
          AND vh.activity_date >= $1 AND vh.activity_date <= $2
        WHERE v.volunteer_status = 'active'
      `;
            const [accountResult, contactResult, donationResult, eventResult, volunteerResult] = await Promise.all([
                this.pool.query(accountQuery),
                this.pool.query(contactQuery),
                this.pool.query(donationQuery, [startDate, endDate]),
                this.pool.query(eventQuery, [startDate, endDate]),
                this.pool.query(volunteerQuery, [startDate, endDate]),
            ]);
            const accounts = accountResult.rows[0];
            const contacts = contactResult.rows[0];
            const donations = donationResult.rows[0];
            const events = eventResult.rows[0];
            const volunteers = volunteerResult.rows[0];
            // Calculate engagement distribution (simplified)
            const engagementQuery = `
        SELECT
          CASE
            WHEN donation_count >= 3 OR hours_logged >= 20 THEN 'high'
            WHEN donation_count >= 1 OR hours_logged >= 5 THEN 'medium'
            WHEN donation_count > 0 OR hours_logged > 0 THEN 'low'
            ELSE 'inactive'
          END as engagement_level,
          COUNT(*) as count
        FROM (
          SELECT
            c.id,
            COUNT(d.id) as donation_count,
            COALESCE(SUM(vh.hours_logged), 0) as hours_logged
          FROM contacts c
          LEFT JOIN donations d ON c.id = d.contact_id AND d.payment_status = 'completed'
          LEFT JOIN volunteers v ON c.id = v.contact_id
          LEFT JOIN volunteer_hours vh ON v.id = vh.volunteer_id
          WHERE c.is_active = true
          GROUP BY c.id
        ) engagement_data
        GROUP BY engagement_level
      `;
            const engagementResult = await this.pool.query(engagementQuery);
            const engagementDistribution = {
                high: 0,
                medium: 0,
                low: 0,
                inactive: 0,
            };
            for (const row of engagementResult.rows) {
                engagementDistribution[row.engagement_level] =
                    parseInt(row.count);
            }
            const summary = {
                total_accounts: parseInt(accounts.total_accounts),
                active_accounts: parseInt(accounts.active_accounts),
                total_contacts: parseInt(contacts.total_contacts),
                active_contacts: parseInt(contacts.active_contacts),
                total_donations_ytd: parseFloat(donations.total_donations),
                donation_count_ytd: parseInt(donations.donation_count),
                average_donation_ytd: parseFloat(donations.average_donation),
                total_events_ytd: parseInt(events.total_events),
                total_volunteers: parseInt(volunteers.total_volunteers),
                total_volunteer_hours_ytd: parseFloat(volunteers.total_hours),
                engagement_distribution: engagementDistribution,
            };
            // Cache for 5 minutes (300 seconds)
            await (0, redis_1.setCached)(cacheKey, summary, 300);
            return summary;
        }
        catch (error) {
            logger_1.logger.error('Error getting analytics summary', { error });
            throw new Error('Failed to retrieve analytics summary');
        }
    }
}
exports.AnalyticsService = AnalyticsService;
// Default instance for backwards compatibility
exports.analyticsService = new AnalyticsService(database_1.default);
exports.default = exports.analyticsService;
//# sourceMappingURL=index.js.map