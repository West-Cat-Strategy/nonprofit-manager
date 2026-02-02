/**
 * Analytics Service
 * Provides analytics and metrics for constituents (accounts and contacts)
 */

import { Pool } from 'pg';
import { logger } from '../config/logger';
import { getCached, setCached } from '../config/redis';
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
  PeriodComparison,
} from '../types/analytics';

export class AnalyticsService {
  constructor(private pool: Pool) {}

  /**
   * Calculate engagement score based on various metrics
   * Returns a score from 0-100
   */
  private calculateEngagementScore(
    donationMetrics: DonationMetrics,
    eventMetrics: EventMetrics,
    volunteerMetrics: VolunteerMetrics | null,
    taskMetrics: TaskMetrics
  ): number {
    let score = 0;

    // Donation engagement (max 40 points)
    if (donationMetrics.total_count > 0) {
      score += Math.min(15, donationMetrics.total_count * 3); // Up to 15 points for donation count
      score += donationMetrics.recurring_donations > 0 ? 15 : 0; // 15 points for recurring
      score += Math.min(10, Math.floor(donationMetrics.total_amount / 1000)); // Up to 10 points for total amount
    }

    // Event engagement (max 30 points)
    if (eventMetrics.total_registrations > 0) {
      score += Math.min(15, eventMetrics.events_attended * 3); // Up to 15 points for attendance
      score += Math.min(15, Math.floor(eventMetrics.attendance_rate * 15)); // Up to 15 points for attendance rate
    }

    // Volunteer engagement (max 20 points)
    if (volunteerMetrics) {
      score += Math.min(10, Math.floor(volunteerMetrics.total_hours / 10)); // Up to 10 points for hours
      score += Math.min(10, volunteerMetrics.completed_assignments * 2); // Up to 10 points for assignments
    }

    // Task engagement (max 10 points)
    if (taskMetrics.total_tasks > 0) {
      const completionRate = taskMetrics.completed_tasks / taskMetrics.total_tasks;
      score += Math.floor(completionRate * 10);
    }

    return Math.min(100, score);
  }

  /**
   * Get engagement level based on score
   */
  private getEngagementLevel(score: number): 'high' | 'medium' | 'low' | 'inactive' {
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    if (score > 0) return 'low';
    return 'inactive';
  }

  /**
   * Get donation metrics for an account or contact
   */
  async getDonationMetrics(
    entityType: 'account' | 'contact',
    entityId: string
  ): Promise<DonationMetrics> {
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
      const byPaymentMethod: Record<string, { count: number; amount: number }> = {};
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
      const byYear: Record<string, { count: number; amount: number }> = {};
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
    } catch (error) {
      logger.error('Error getting donation metrics', { error, entityType, entityId });
      throw new Error('Failed to retrieve donation metrics');
    }
  }

  /**
   * Get event metrics for an account or contact
   */
  async getEventMetrics(
    entityType: 'account' | 'contact',
    entityId: string
  ): Promise<EventMetrics> {
    try {
      // For accounts, we need to get all contacts' registrations
      // For contacts, we get direct registrations
      const query =
        entityType === 'account'
          ? `
            SELECT
              COUNT(*) as total_registrations,
              COUNT(*) FILTER (WHERE er.registration_status IN ('confirmed', 'registered') AND er.checked_in = true) as events_attended,
              COUNT(*) FILTER (WHERE er.registration_status = 'no_show') as no_shows
            FROM event_registrations er
            JOIN contacts c ON er.contact_id = c.id
            WHERE c.account_id = $1
          `
          : `
            SELECT
              COUNT(*) as total_registrations,
              COUNT(*) FILTER (WHERE registration_status IN ('confirmed', 'registered') AND checked_in = true) as events_attended,
              COUNT(*) FILTER (WHERE registration_status = 'no_show') as no_shows
            FROM event_registrations
            WHERE contact_id = $1
          `;

      const statsResult = await this.pool.query(query, [entityId]);
      const stats = statsResult.rows[0];

      const totalRegs = parseInt(stats.total_registrations) || 0;
      const attended = parseInt(stats.events_attended) || 0;
      const noShows = parseInt(stats.no_shows) || 0;
      const attendanceRate = totalRegs > 0 ? attended / totalRegs : 0;

      // Get breakdown by event type
      const typeQuery =
        entityType === 'account'
          ? `
            SELECT e.event_type, COUNT(*) as count
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            JOIN contacts c ON er.contact_id = c.id
            WHERE c.account_id = $1
            GROUP BY e.event_type
          `
          : `
            SELECT e.event_type, COUNT(*) as count
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            WHERE er.contact_id = $1
            GROUP BY e.event_type
          `;

      const typeResult = await this.pool.query(typeQuery, [entityId]);
      const byEventType: Record<string, number> = {};
      for (const row of typeResult.rows) {
        byEventType[row.event_type] = parseInt(row.count);
      }

      // Get recent events
      const recentQuery =
        entityType === 'account'
          ? `
            SELECT e.id as event_id, e.event_name, e.start_date as event_date, er.registration_status as status
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            JOIN contacts c ON er.contact_id = c.id
            WHERE c.account_id = $1
            ORDER BY e.start_date DESC
            LIMIT 5
          `
          : `
            SELECT e.id as event_id, e.event_name, e.start_date as event_date, er.registration_status as status
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            WHERE er.contact_id = $1
            ORDER BY e.start_date DESC
            LIMIT 5
          `;

      const recentResult = await this.pool.query(recentQuery, [entityId]);

      return {
        total_registrations: totalRegs,
        events_attended: attended,
        no_shows: noShows,
        attendance_rate: attendanceRate,
        by_event_type: byEventType,
        recent_events: recentResult.rows.map((row) => ({
          event_id: row.event_id,
          event_name: row.event_name,
          event_date: row.event_date,
          status: row.status,
        })),
      };
    } catch (error) {
      logger.error('Error getting event metrics', { error, entityType, entityId });
      throw new Error('Failed to retrieve event metrics');
    }
  }

  /**
   * Get volunteer metrics for a contact
   */
  async getVolunteerMetrics(contactId: string): Promise<VolunteerMetrics | null> {
    try {
      // Check if contact is a volunteer
      const volunteerQuery = `
        SELECT
          v.id as volunteer_id,
          v.skills,
          v.volunteer_status as availability_status,
          v.created_at as volunteer_since,
          COALESCE(SUM(vh.hours_logged), 0) as total_hours,
          COUNT(DISTINCT vh.id) as total_assignments,
          COUNT(DISTINCT vh.id) FILTER (WHERE vh.verified = true) as completed_assignments,
          0 as active_assignments
        FROM volunteers v
        LEFT JOIN volunteer_hours vh ON v.id = vh.volunteer_id
        WHERE v.contact_id = $1 AND v.volunteer_status = 'active'
        GROUP BY v.id, v.skills, v.volunteer_status, v.created_at
      `;

      const volunteerResult = await this.pool.query(volunteerQuery, [contactId]);

      if (volunteerResult.rows.length === 0) {
        return null;
      }

      const volunteer = volunteerResult.rows[0];

      // Get hours by month
      const monthQuery = `
        SELECT
          TO_CHAR(vh.activity_date, 'YYYY-MM') as month,
          COALESCE(SUM(vh.hours_logged), 0) as hours
        FROM volunteer_hours vh
        JOIN volunteers v ON vh.volunteer_id = v.id
        WHERE v.contact_id = $1
        GROUP BY TO_CHAR(vh.activity_date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `;

      const monthResult = await this.pool.query(monthQuery, [contactId]);
      const hoursByMonth: Record<string, number> = {};
      for (const row of monthResult.rows) {
        hoursByMonth[row.month] = parseFloat(row.hours);
      }

      // Get recent volunteer hours
      const recentQuery = `
        SELECT
          vh.id as assignment_id,
          vh.activity_type as event_name,
          vh.description as task_subject,
          COALESCE(vh.hours_logged, 0) as hours_logged,
          CASE WHEN vh.verified = true THEN 'completed' ELSE 'pending' END as status
        FROM volunteer_hours vh
        JOIN volunteers v ON vh.volunteer_id = v.id
        WHERE v.contact_id = $1
        ORDER BY vh.activity_date DESC
        LIMIT 5
      `;

      const recentResult = await this.pool.query(recentQuery, [contactId]);

      return {
        total_hours: parseFloat(volunteer.total_hours),
        total_assignments: parseInt(volunteer.total_assignments),
        completed_assignments: parseInt(volunteer.completed_assignments),
        active_assignments: parseInt(volunteer.active_assignments),
        skills: volunteer.skills || [],
        availability_status: volunteer.availability_status,
        volunteer_since: volunteer.volunteer_since,
        hours_by_month: hoursByMonth,
        recent_assignments: recentResult.rows.map((row) => ({
          assignment_id: row.assignment_id,
          event_name: row.event_name || undefined,
          task_subject: row.task_subject || undefined,
          hours_logged: parseFloat(row.hours_logged),
          status: row.status,
        })),
      };
    } catch (error) {
      logger.error('Error getting volunteer metrics', { error, contactId });
      throw new Error('Failed to retrieve volunteer metrics');
    }
  }

  /**
   * Get task metrics for an account or contact
   */
  async getTaskMetrics(
    entityType: 'account' | 'contact',
    entityId: string
  ): Promise<TaskMetrics> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_tasks,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
          COUNT(*) FILTER (WHERE status IN ('not_started', 'in_progress', 'waiting')) as pending_tasks,
          COUNT(*) FILTER (WHERE status NOT IN ('completed', 'cancelled', 'deferred') AND due_date < CURRENT_TIMESTAMP) as overdue_tasks,
          COUNT(*) FILTER (WHERE priority = 'low') as priority_low,
          COUNT(*) FILTER (WHERE priority = 'normal') as priority_normal,
          COUNT(*) FILTER (WHERE priority = 'high') as priority_high,
          COUNT(*) FILTER (WHERE priority = 'urgent') as priority_urgent,
          COUNT(*) FILTER (WHERE status = 'not_started') as status_not_started,
          COUNT(*) FILTER (WHERE status = 'in_progress') as status_in_progress,
          COUNT(*) FILTER (WHERE status = 'waiting') as status_waiting,
          COUNT(*) FILTER (WHERE status = 'completed') as status_completed,
          COUNT(*) FILTER (WHERE status = 'deferred') as status_deferred,
          COUNT(*) FILTER (WHERE status = 'cancelled') as status_cancelled
        FROM tasks
        WHERE related_to_type = $1 AND related_to_id = $2
      `;

      const result = await this.pool.query(query, [entityType, entityId]);
      const stats = result.rows[0];

      return {
        total_tasks: parseInt(stats.total_tasks),
        completed_tasks: parseInt(stats.completed_tasks),
        pending_tasks: parseInt(stats.pending_tasks),
        overdue_tasks: parseInt(stats.overdue_tasks),
        by_priority: {
          low: parseInt(stats.priority_low),
          normal: parseInt(stats.priority_normal),
          high: parseInt(stats.priority_high),
          urgent: parseInt(stats.priority_urgent),
        },
        by_status: {
          not_started: parseInt(stats.status_not_started),
          in_progress: parseInt(stats.status_in_progress),
          waiting: parseInt(stats.status_waiting),
          completed: parseInt(stats.status_completed),
          deferred: parseInt(stats.status_deferred),
          cancelled: parseInt(stats.status_cancelled),
        },
      };
    } catch (error) {
      logger.error('Error getting task metrics', { error, entityType, entityId });
      throw new Error('Failed to retrieve task metrics');
    }
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
        SELECT id as contact_id, first_name || ' ' || last_name as name, email
        FROM contacts
        WHERE account_id = $1 AND contact_role = 'primary' AND is_active = true
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

      const engagementScore = this.calculateEngagementScore(
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
        engagement_level: this.getEngagementLevel(engagementScore),
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
          c.contact_role,
          c.created_at
        FROM contacts c
        LEFT JOIN accounts a ON c.account_id = a.id
        WHERE c.id = $1
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

      const engagementScore = this.calculateEngagementScore(
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
        contact_role: contact.contact_role,
        created_at: contact.created_at,
        donation_metrics: donationMetrics,
        event_metrics: eventMetrics,
        volunteer_metrics: volunteerMetrics,
        task_metrics: taskMetrics,
        engagement_score: engagementScore,
        engagement_level: this.getEngagementLevel(engagementScore),
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

  /**
   * Get donation trends by month for the last 12 months
   */
  async getDonationTrends(months: number = 12): Promise<
    Array<{
      month: string;
      amount: number;
      count: number;
    }>
  > {
    try {
      // Try to get from cache
      const cacheKey = `analytics:donation-trends:${months}`;
      const cached = await getCached<
        Array<{ month: string; amount: number; count: number }>
      >(cacheKey);
      if (cached) {
        logger.debug('Donation trends cache hit', { cacheKey });
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
      const trends: Array<{ month: string; amount: number; count: number }> = [];
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
      await setCached(cacheKey, trends, 600);

      return trends;
    } catch (error) {
      logger.error('Error getting donation trends', { error });
      throw new Error('Failed to retrieve donation trends');
    }
  }

  /**
   * Get volunteer hours trends by month for the last 12 months
   */
  async getVolunteerHoursTrends(months: number = 12): Promise<
    Array<{
      month: string;
      hours: number;
      assignments: number;
    }>
  > {
    try {
      // Try to get from cache
      const cacheKey = `analytics:volunteer-trends:${months}`;
      const cached = await getCached<
        Array<{ month: string; hours: number; assignments: number }>
      >(cacheKey);
      if (cached) {
        logger.debug('Volunteer trends cache hit', { cacheKey });
        return cached;
      }

      const query = `
        SELECT
          TO_CHAR(activity_date, 'YYYY-MM') as month,
          COALESCE(SUM(hours_logged), 0) as hours,
          COUNT(*) as assignments
        FROM volunteer_hours
        WHERE activity_date >= NOW() - INTERVAL '${months} months'
        GROUP BY TO_CHAR(activity_date, 'YYYY-MM')
        ORDER BY month ASC
      `;

      const result = await this.pool.query(query);

      // Fill in missing months with zeros
      const trends: Array<{ month: string; hours: number; assignments: number }> = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = date.toISOString().substring(0, 7); // YYYY-MM format

        const existing = result.rows.find((row) => row.month === monthStr);
        trends.push({
          month: monthStr,
          hours: existing ? parseFloat(existing.hours) : 0,
          assignments: existing ? parseInt(existing.assignments) : 0,
        });
      }

      // Cache for 10 minutes (600 seconds)
      await setCached(cacheKey, trends, 600);

      return trends;
    } catch (error) {
      logger.error('Error getting volunteer hours trends', { error });
      throw new Error('Failed to retrieve volunteer hours trends');
    }
  }

  /**
   * Get event attendance trends by month for the last 12 months
   */
  async getEventAttendanceTrends(months: number = 12): Promise<
    Array<{
      month: string;
      total_events: number;
      total_registrations: number;
      total_attendance: number;
      capacity_utilization: number;
      attendance_rate: number;
    }>
  > {
    try {
      // Try to get from cache
      const cacheKey = `analytics:event-trends:${months}`;
      const cached = await getCached<
        Array<{
          month: string;
          total_events: number;
          total_registrations: number;
          total_attendance: number;
          capacity_utilization: number;
          attendance_rate: number;
        }>
      >(cacheKey);
      if (cached) {
        logger.debug('Event trends cache hit', { cacheKey });
        return cached;
      }

      const query = `
        SELECT
          TO_CHAR(e.start_date, 'YYYY-MM') as month,
          COUNT(DISTINCT e.id) as total_events,
          COUNT(er.id) as total_registrations,
          COUNT(er.id) FILTER (WHERE er.checked_in = true) as total_attendance,
          COALESCE(SUM(e.max_attendees), 0) as total_capacity,
          CASE
            WHEN SUM(e.max_attendees) > 0
            THEN (COUNT(er.id)::float / SUM(e.max_attendees)::float) * 100
            ELSE 0
          END as capacity_utilization,
          CASE
            WHEN COUNT(er.id) > 0
            THEN (COUNT(er.id) FILTER (WHERE er.checked_in = true)::float / COUNT(er.id)::float) * 100
            ELSE 0
          END as attendance_rate
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.event_id
        WHERE e.start_date >= NOW() - INTERVAL '${months} months'
        GROUP BY TO_CHAR(e.start_date, 'YYYY-MM')
        ORDER BY month ASC
      `;

      const result = await this.pool.query(query);

      // Fill in missing months with zeros
      const trends: Array<{
        month: string;
        total_events: number;
        total_registrations: number;
        total_attendance: number;
        capacity_utilization: number;
        attendance_rate: number;
      }> = [];
      const now = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = date.toISOString().substring(0, 7); // YYYY-MM format

        const existing = result.rows.find((row) => row.month === monthStr);
        trends.push({
          month: monthStr,
          total_events: existing ? parseInt(existing.total_events) : 0,
          total_registrations: existing ? parseInt(existing.total_registrations) : 0,
          total_attendance: existing ? parseInt(existing.total_attendance) : 0,
          capacity_utilization: existing ? parseFloat(existing.capacity_utilization) : 0,
          attendance_rate: existing ? parseFloat(existing.attendance_rate) : 0,
        });
      }

      // Cache for 10 minutes (600 seconds)
      await setCached(cacheKey, trends, 600);

      return trends;
    } catch (error) {
      logger.error('Error getting event attendance trends', { error });
      throw new Error('Failed to retrieve event attendance trends');
    }
  }

  /**
   * Get comparative analytics (YoY, MoM, QoQ)
   */
  async getComparativeAnalytics(
    periodType: 'month' | 'quarter' | 'year' = 'month'
  ): Promise<ComparativeAnalytics> {
    try {
      // Try to get from cache
      const cacheKey = `analytics:comparative:${periodType}`;
      const cached = await getCached<ComparativeAnalytics>(cacheKey);
      if (cached) {
        logger.debug('Comparative analytics cache hit', { cacheKey });
        return cached;
      }

      const now = new Date();
      let currentStart: Date;
      let currentEnd: Date;
      let previousStart: Date;
      let previousEnd: Date;
      let currentPeriodLabel: string;
      let previousPeriodLabel: string;

      // Calculate period boundaries
      if (periodType === 'month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        currentPeriodLabel = currentStart.toISOString().substring(0, 7);
        previousPeriodLabel = previousStart.toISOString().substring(0, 7);
      } else if (periodType === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
        currentEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
        previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
        currentPeriodLabel = `${now.getFullYear()}-Q${currentQuarter + 1}`;
        previousPeriodLabel = `${now.getFullYear()}-Q${currentQuarter}`;
      } else {
        // year
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31);
        currentPeriodLabel = now.getFullYear().toString();
        previousPeriodLabel = (now.getFullYear() - 1).toString();
      }

      // Helper function to calculate comparison
      const calculateComparison = (current: number, previous: number): PeriodComparison => {
        const change = current - previous;
        const changePercent = previous === 0 ? 0 : (change / previous) * 100;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (Math.abs(changePercent) > 5) {
          trend = changePercent > 0 ? 'up' : 'down';
        }
        return {
          current,
          previous,
          change,
          change_percent: parseFloat(changePercent.toFixed(2)),
          trend,
        };
      };

      // Get donation metrics for both periods
      const donationQuery = `
        SELECT
          CASE
            WHEN donation_date >= $1 AND donation_date <= $2 THEN 'current'
            WHEN donation_date >= $3 AND donation_date <= $4 THEN 'previous'
          END as period,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(*) as count,
          COALESCE(AVG(amount), 0) as average_amount
        FROM donations
        WHERE payment_status = 'completed'
          AND ((donation_date >= $1 AND donation_date <= $2)
            OR (donation_date >= $3 AND donation_date <= $4))
        GROUP BY period
      `;

      // Get contact metrics for both periods
      const contactQuery = `
        SELECT
          CASE
            WHEN created_at >= $1 AND created_at <= $2 THEN 'current'
            WHEN created_at >= $3 AND created_at <= $4 THEN 'previous'
          END as period,
          COUNT(*) as count
        FROM contacts
        WHERE (created_at >= $1 AND created_at <= $2)
          OR (created_at >= $3 AND created_at <= $4)
        GROUP BY period
      `;

      // Get event metrics for both periods
      const eventQuery = `
        SELECT
          CASE
            WHEN start_date >= $1 AND start_date <= $2 THEN 'current'
            WHEN start_date >= $3 AND start_date <= $4 THEN 'previous'
          END as period,
          COUNT(*) as count
        FROM events
        WHERE (start_date >= $1 AND start_date <= $2)
          OR (start_date >= $3 AND start_date <= $4)
        GROUP BY period
      `;

      // Get volunteer metrics for both periods
      const volunteerQuery = `
        SELECT
          CASE
            WHEN activity_date >= $1 AND activity_date <= $2 THEN 'current'
            WHEN activity_date >= $3 AND activity_date <= $4 THEN 'previous'
          END as period,
          COALESCE(SUM(hours_logged), 0) as hours
        FROM volunteer_hours
        WHERE (activity_date >= $1 AND activity_date <= $2)
            OR (activity_date >= $3 AND activity_date <= $4)
        GROUP BY period
      `;

      const params = [
        currentStart.toISOString(),
        currentEnd.toISOString(),
        previousStart.toISOString(),
        previousEnd.toISOString(),
      ];

      const [donationResult, contactResult, eventResult, volunteerResult] = await Promise.all([
        this.pool.query(donationQuery, params),
        this.pool.query(contactQuery, params),
        this.pool.query(eventQuery, params),
        this.pool.query(volunteerQuery, params),
      ]);

      // Extract metrics
      const currentDonations = donationResult.rows.find((r) => r.period === 'current');
      const previousDonations = donationResult.rows.find((r) => r.period === 'previous');

      const currentContacts = contactResult.rows.find((r) => r.period === 'current');
      const previousContacts = contactResult.rows.find((r) => r.period === 'previous');

      const currentEvents = eventResult.rows.find((r) => r.period === 'current');
      const previousEvents = eventResult.rows.find((r) => r.period === 'previous');

      const currentVolunteer = volunteerResult.rows.find((r) => r.period === 'current');
      const previousVolunteer = volunteerResult.rows.find((r) => r.period === 'previous');

      // Build comparative analytics
      const result: ComparativeAnalytics = {
        period_type: periodType,
        current_period: currentPeriodLabel,
        previous_period: previousPeriodLabel,
        metrics: {
          total_donations: calculateComparison(
            currentDonations ? parseFloat(currentDonations.total_amount) : 0,
            previousDonations ? parseFloat(previousDonations.total_amount) : 0
          ),
          donation_count: calculateComparison(
            currentDonations ? parseInt(currentDonations.count) : 0,
            previousDonations ? parseInt(previousDonations.count) : 0
          ),
          average_donation: calculateComparison(
            currentDonations ? parseFloat(currentDonations.average_amount) : 0,
            previousDonations ? parseFloat(previousDonations.average_amount) : 0
          ),
          new_contacts: calculateComparison(
            currentContacts ? parseInt(currentContacts.count) : 0,
            previousContacts ? parseInt(previousContacts.count) : 0
          ),
          total_events: calculateComparison(
            currentEvents ? parseInt(currentEvents.count) : 0,
            previousEvents ? parseInt(previousEvents.count) : 0
          ),
          volunteer_hours: calculateComparison(
            currentVolunteer ? parseFloat(currentVolunteer.hours) : 0,
            previousVolunteer ? parseFloat(previousVolunteer.hours) : 0
          ),
          engagement_score: calculateComparison(0, 0), // Placeholder for now
        },
      };

      // Cache for 10 minutes (600 seconds)
      await setCached(cacheKey, result, 600);

      return result;
    } catch (error) {
      logger.error('Error getting comparative analytics', { error });
      throw new Error('Failed to retrieve comparative analytics');
    }
  }

  /**
   * Calculate simple moving average
   * @private
   */
  private calculateMovingAverage(data: number[], window: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) {
        result.push(data[i]); // Not enough data points yet
      } else {
        const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(sum / window);
      }
    }
    return result;
  }

  /**
   * Calculate statistical summary for anomaly detection
   * @private
   */
  private calculateStatistics(data: number[]): {
    mean: number;
    median: number;
    std_deviation: number;
    min: number;
    max: number;
  } {
    if (data.length === 0) {
      return { mean: 0, median: 0, std_deviation: 0, min: 0, max: 0 };
    }

    // Mean
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;

    // Median
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    // Standard deviation
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const std_deviation = Math.sqrt(variance);

    // Min and max
    const min = Math.min(...data);
    const max = Math.max(...data);

    return { mean, median, std_deviation, min, max };
  }

  /**
   * Detect trend direction and strength
   * Uses linear regression to determine trend
   * @private
   */
  private detectTrend(data: number[]): {
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number;
    velocity: number;
  } {
    if (data.length < 2) {
      return { direction: 'stable', strength: 0, velocity: 0 };
    }

    // Simple linear regression
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * data[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    // Slope (velocity)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    // R-squared (strength)
    const yMean = sumY / n;
    const ssTotal = data.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const yPredicted = x.map(xi => (sumY - slope * sumX) / n + slope * xi);
    const ssResidual = data.reduce((sum, yi, i) => sum + Math.pow(yi - yPredicted[i], 2), 0);
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

    // Determine direction
    const direction = Math.abs(slope) < 0.01 ? 'stable' : slope > 0 ? 'increasing' : 'decreasing';

    // Strength as percentage (0-100)
    const strength = Math.min(100, Math.abs(rSquared) * 100);

    return { direction, strength, velocity: slope };
  }

  /**
   * Analyze trends with moving averages
   * Provides trend analysis with 7-day and 30-day moving averages
   */
  async getTrendAnalysis(
    metricType: 'donations' | 'volunteer_hours' | 'event_attendance',
    months: number = 12
  ): Promise<import('../types/analytics').TrendAnalysis> {
    try {
      const cacheKey = `trend_analysis:${metricType}:${months}`;
      const cached = await getCached<import('../types/analytics').TrendAnalysis>(cacheKey);
      if (cached) return cached;

      let data: Array<{ month: string; value: number }> = [];
      let metricName = '';

      // Get raw data based on metric type
      switch (metricType) {
        case 'donations': {
          metricName = 'Total Donations';
          const trends = await this.getDonationTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.amount }));
          break;
        }
        case 'volunteer_hours': {
          metricName = 'Volunteer Hours';
          const trends = await this.getVolunteerHoursTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.hours }));
          break;
        }
        case 'event_attendance': {
          metricName = 'Event Attendance';
          const trends = await this.getEventAttendanceTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.total_attendance }));
          break;
        }
      }

      if (data.length === 0) {
        throw new Error('No data available for trend analysis');
      }

      // Extract values for calculations
      const values = data.map(d => d.value);

      // Calculate moving averages
      const ma7 = this.calculateMovingAverage(values, Math.min(7, values.length));
      const ma30 = this.calculateMovingAverage(values, Math.min(30, values.length));

      // Build data points with moving averages
      const dataPoints: import('../types/analytics').TrendDataPoint[] = data.map((d, i) => ({
        period: d.month,
        value: d.value,
        movingAverage: values[i],
        movingAverage7: ma7[i],
        movingAverage30: ma30[i],
      }));

      // Detect trend
      const trendInfo = this.detectTrend(values);

      // Predict next period using linear extrapolation
      const predictionNextPeriod = values[values.length - 1] + trendInfo.velocity;

      const result: import('../types/analytics').TrendAnalysis = {
        metric_name: metricName,
        data_points: dataPoints,
        trend_direction: trendInfo.direction,
        trend_strength: Math.round(trendInfo.strength),
        velocity: Math.round(trendInfo.velocity * 100) / 100,
        prediction_next_period: Math.max(0, Math.round(predictionNextPeriod)),
        analysis_period: {
          start_date: data[0].month,
          end_date: data[data.length - 1].month,
          period_count: data.length,
        },
      };

      // Cache for 1 hour
      await setCached(cacheKey, result, 3600);

      return result;
    } catch (error) {
      logger.error('Error analyzing trends', { error, metricType });
      throw new Error('Failed to analyze trends');
    }
  }

  /**
   * Detect anomalies in metric data
   * Uses statistical methods to identify unusual data points
   */
  async detectAnomalies(
    metricType: 'donations' | 'volunteer_hours' | 'event_attendance',
    months: number = 12,
    sensitivityStdDev: number = 2.0 // Standard deviations from mean to flag as anomaly
  ): Promise<import('../types/analytics').AnomalyDetectionResult> {
    try {
      const cacheKey = `anomaly_detection:${metricType}:${months}:${sensitivityStdDev}`;
      const cached = await getCached<import('../types/analytics').AnomalyDetectionResult>(cacheKey);
      if (cached) return cached;

      let data: Array<{ month: string; value: number }> = [];
      let metricName = '';

      // Get raw data based on metric type
      switch (metricType) {
        case 'donations': {
          metricName = 'Total Donations';
          const trends = await this.getDonationTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.amount }));
          break;
        }
        case 'volunteer_hours': {
          metricName = 'Volunteer Hours';
          const trends = await this.getVolunteerHoursTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.hours }));
          break;
        }
        case 'event_attendance': {
          metricName = 'Event Attendance';
          const trends = await this.getEventAttendanceTrends(months);
          data = trends.map(t => ({ month: t.month, value: t.total_attendance }));
          break;
        }
      }

      if (data.length === 0) {
        throw new Error('No data available for anomaly detection');
      }

      // Calculate statistics
      const values = data.map(d => d.value);
      const stats = this.calculateStatistics(values);

      // Define thresholds
      const thresholdUpper = stats.mean + sensitivityStdDev * stats.std_deviation;
      const thresholdLower = Math.max(0, stats.mean - sensitivityStdDev * stats.std_deviation);

      // Detect anomalies
      const anomalies: import('../types/analytics').Anomaly[] = [];

      data.forEach((point) => {
        const value = point.value;
        const expectedValue = stats.mean;
        const deviation = value - expectedValue;
        const deviationPercent = expectedValue === 0 ? 0 : (deviation / expectedValue) * 100;

        // Check if value is outside thresholds
        if (value > thresholdUpper || value < thresholdLower) {
          // Determine severity based on how many standard deviations away
          const stdDevsAway = Math.abs(deviation) / stats.std_deviation;
          let severity: 'low' | 'medium' | 'high';
          if (stdDevsAway > 3) severity = 'high';
          else if (stdDevsAway > 2.5) severity = 'medium';
          else severity = 'low';

          // Determine type
          let type: 'spike' | 'drop' | 'unusual_pattern';
          if (value > thresholdUpper) {
            type = 'spike';
          } else if (value < thresholdLower) {
            type = 'drop';
          } else {
            type = 'unusual_pattern';
          }

          anomalies.push({
            period: point.month,
            value,
            expected_value: Math.round(expectedValue),
            deviation: Math.round(deviation),
            deviation_percent: Math.round(deviationPercent * 10) / 10,
            severity,
            type,
          });
        }
      });

      const result: import('../types/analytics').AnomalyDetectionResult = {
        metric_name: metricName,
        total_periods: data.length,
        anomalies_detected: anomalies.length,
        anomalies,
        statistical_summary: {
          mean: Math.round(stats.mean),
          median: Math.round(stats.median),
          std_deviation: Math.round(stats.std_deviation * 10) / 10,
          min: Math.round(stats.min),
          max: Math.round(stats.max),
          threshold_upper: Math.round(thresholdUpper),
          threshold_lower: Math.round(thresholdLower),
        },
        analysis_period: {
          start_date: data[0].month,
          end_date: data[data.length - 1].month,
        },
      };

      // Cache for 1 hour
      await setCached(cacheKey, result, 3600);

      return result;
    } catch (error) {
      logger.error('Error detecting anomalies', { error, metricType });
      throw new Error('Failed to detect anomalies');
    }
  }
}

export default AnalyticsService;
