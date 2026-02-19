/**
 * Volunteer Analytics Service
 * Handles volunteer-related metrics and hour trends
 */

import { Pool } from 'pg';
import { logger } from '@config/logger';
import { getCached, setCached } from '@config/redis';
import type { VolunteerMetrics } from '@app-types/analytics';

export class VolunteerAnalyticsService {
  constructor(private pool: Pool) {}

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
      throw Object.assign(new Error('Failed to retrieve volunteer metrics'), { cause: error });
    }
  }

  /**
   * Get volunteer hours trends by month for the last N months
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
      throw Object.assign(new Error('Failed to retrieve volunteer hours trends'), { cause: error });
    }
  }
}
