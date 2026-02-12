/**
 * Analytics Services Index
 * Barrel exports and facade for analytics functionality
 */

import { Pool } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import { getCached, setCached } from '@config/redis';
import type {
  AccountAnalytics,
  ContactAnalytics,
  AnalyticsSummary,
  AnalyticsFilters,
  DonationMetrics,
  EventMetrics,
  VolunteerMetrics,
  TaskMetrics,
  ComparativeAnalytics,
  TrendAnalysis,
  AnomalyDetectionResult,
} from '@app-types/analytics';

// Export individual service classes
export { DonationAnalyticsService } from './donationAnalytics';
export { EventAnalyticsService } from './eventAnalytics';
export { VolunteerAnalyticsService } from './volunteerAnalytics';
export { TaskAnalyticsService } from './taskAnalytics';
export { TrendAnalyticsService } from './trendAnalytics';
export { calculateEngagementScore, getEngagementLevel } from './engagement';

// Import service classes for facade
import { DonationAnalyticsService } from './donationAnalytics';
import { EventAnalyticsService } from './eventAnalytics';
import { VolunteerAnalyticsService } from './volunteerAnalytics';
import { TaskAnalyticsService } from './taskAnalytics';
import { TrendAnalyticsService } from './trendAnalytics';
import { calculateEngagementScore, getEngagementLevel } from './engagement';

/**
 * Analytics Service Facade
 * Provides a unified interface for all analytics functionality
 * This is the main class used by controllers
 */
export class AnalyticsService {
  private donationAnalytics: DonationAnalyticsService;
  private eventAnalytics: EventAnalyticsService;
  private volunteerAnalytics: VolunteerAnalyticsService;
  private taskAnalytics: TaskAnalyticsService;
  private trendAnalytics: TrendAnalyticsService;

  constructor(private pool: Pool) {
    this.donationAnalytics = new DonationAnalyticsService(pool);
    this.eventAnalytics = new EventAnalyticsService(pool);
    this.volunteerAnalytics = new VolunteerAnalyticsService(pool);
    this.taskAnalytics = new TaskAnalyticsService(pool);
    this.trendAnalytics = new TrendAnalyticsService(pool);
  }

  // Delegation methods for donation analytics
  async getDonationMetrics(entityType: 'account' | 'contact', entityId: string): Promise<DonationMetrics> {
    return this.donationAnalytics.getDonationMetrics(entityType, entityId);
  }

  async getDonationTrends(months?: number) {
    return this.donationAnalytics.getDonationTrends(months);
  }

  // Delegation methods for event analytics
  async getEventMetrics(entityType: 'account' | 'contact', entityId: string): Promise<EventMetrics> {
    return this.eventAnalytics.getEventMetrics(entityType, entityId);
  }

  async getEventAttendanceTrends(months?: number) {
    return this.eventAnalytics.getEventAttendanceTrends(months);
  }

  // Delegation methods for volunteer analytics
  async getVolunteerMetrics(contactId: string): Promise<VolunteerMetrics | null> {
    return this.volunteerAnalytics.getVolunteerMetrics(contactId);
  }

  async getVolunteerHoursTrends(months?: number) {
    return this.volunteerAnalytics.getVolunteerHoursTrends(months);
  }

  // Delegation methods for task analytics
  async getTaskMetrics(entityType: 'account' | 'contact', entityId: string): Promise<TaskMetrics> {
    return this.taskAnalytics.getTaskMetrics(entityType, entityId);
  }

  // Delegation methods for trend analytics
  async getTrendAnalysis(metricType: 'donations' | 'volunteer_hours' | 'event_attendance', months?: number): Promise<TrendAnalysis> {
    return this.trendAnalytics.getTrendAnalysis(metricType, months);
  }

  async detectAnomalies(metricType: 'donations' | 'volunteer_hours' | 'event_attendance', months?: number, sensitivityStdDev?: number): Promise<AnomalyDetectionResult> {
    return this.trendAnalytics.detectAnomalies(metricType, months, sensitivityStdDev);
  }

  async getComparativeAnalytics(periodType?: 'month' | 'quarter' | 'year'): Promise<ComparativeAnalytics> {
    return this.trendAnalytics.getComparativeAnalytics(periodType);
  }

  /**
   * Get full analytics for an account
   */
  async getAccountAnalytics(accountId: string): Promise<AccountAnalytics> {
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

      const engagementScore = calculateEngagementScore(
        donationMetrics,
        eventMetrics,
        null,
        taskMetrics
      );

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
        engagement_level: getEngagementLevel(engagementScore),
      };
    } catch (error) {
      // Preserve "not found" errors for proper HTTP 404 response
      if ((error as Error).message === 'Account not found') {
        throw error;
      }
      logger.error('Error getting account analytics', { error, accountId });
      throw new Error('Failed to retrieve account analytics');
    }
  }

  /**
   * Get full analytics for a contact
   */
  async getContactAnalytics(contactId: string): Promise<ContactAnalytics> {
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

      const engagementScore = calculateEngagementScore(
        donationMetrics,
        eventMetrics,
        volunteerMetrics,
        taskMetrics
      );

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
        engagement_level: getEngagementLevel(engagementScore),
      };
    } catch (error) {
      // Preserve "not found" errors for proper HTTP 404 response
      if ((error as Error).message === 'Contact not found') {
        throw error;
      }
      logger.error('Error getting contact analytics', { error, contactId });
      throw new Error('Failed to retrieve contact analytics');
    }
  }

  /**
   * Get organization-wide analytics summary
   */
  async getAnalyticsSummary(filters?: AnalyticsFilters): Promise<AnalyticsSummary> {
    try {
      const startDate = filters?.start_date || new Date(new Date().getFullYear(), 0, 1).toISOString();
      const endDate = filters?.end_date || new Date().toISOString();

      // Try to get from cache
      const cacheKey = `analytics:summary:${startDate}:${endDate}`;
      const cached = await getCached<AnalyticsSummary>(cacheKey);
      if (cached) {
        logger.debug('Analytics summary cache hit', { cacheKey });
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

      const [accountResult, contactResult, donationResult, eventResult, volunteerResult] =
        await Promise.all([
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
        engagementDistribution[row.engagement_level as keyof typeof engagementDistribution] =
          parseInt(row.count);
      }

      const summary: AnalyticsSummary = {
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
      await setCached(cacheKey, summary, 300);

      return summary;
    } catch (error) {
      logger.error('Error getting analytics summary', { error });
      throw new Error('Failed to retrieve analytics summary');
    }
  }
}

// Default instance for backwards compatibility
export const analyticsService = new AnalyticsService(pool);
export default analyticsService;
