"use strict";
/**
 * Event Analytics Service
 * Handles event-related metrics and attendance trends
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventAnalyticsService = void 0;
const logger_1 = require("../../config/logger");
const redis_1 = require("../../config/redis");
class EventAnalyticsService {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Get event metrics for an account or contact
     */
    async getEventMetrics(entityType, entityId) {
        try {
            // For accounts, we need to get all contacts' registrations
            // For contacts, we get direct registrations
            const query = entityType === 'account'
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
            const typeQuery = entityType === 'account'
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
            const byEventType = {};
            for (const row of typeResult.rows) {
                byEventType[row.event_type] = parseInt(row.count);
            }
            // Get recent events
            const recentQuery = entityType === 'account'
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
        }
        catch (error) {
            logger_1.logger.error('Error getting event metrics', { error, entityType, entityId });
            throw new Error('Failed to retrieve event metrics');
        }
    }
    /**
     * Get event attendance trends by month for the last N months
     */
    async getEventAttendanceTrends(months = 12) {
        try {
            // Try to get from cache
            const cacheKey = `analytics:event-trends:${months}`;
            const cached = await (0, redis_1.getCached)(cacheKey);
            if (cached) {
                logger_1.logger.debug('Event trends cache hit', { cacheKey });
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
            const trends = [];
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
            await (0, redis_1.setCached)(cacheKey, trends, 600);
            return trends;
        }
        catch (error) {
            logger_1.logger.error('Error getting event attendance trends', { error });
            throw new Error('Failed to retrieve event attendance trends');
        }
    }
}
exports.EventAnalyticsService = EventAnalyticsService;
//# sourceMappingURL=eventAnalytics.js.map