"use strict";
/**
 * Activity Service
 * Fetches and aggregates activities across the application
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityService = void 0;
const database_1 = __importDefault(require("../config/database"));
class ActivityService {
    /**
     * Get recent activities across all modules
     */
    async getRecentActivities(limit = 10) {
        const activities = [];
        // Fetch recent cases (created in last 30 days)
        const casesResult = await database_1.default.query(`SELECT
        c.id,
        c.case_number,
        c.title,
        c.created_at,
        c.opened_date,
        c.assigned_to,
        c.status_name,
        u.first_name || ' ' || u.last_name as user_name
      FROM cases c
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE c.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY c.created_at DESC
      LIMIT $1`, [Math.ceil(limit / 2)]);
        casesResult.rows.forEach((row) => {
            activities.push({
                id: `case-${row.id}`,
                type: 'case_created',
                title: 'New case created',
                description: `Case ${row.case_number}: ${row.title}`,
                timestamp: row.created_at,
                user_id: row.assigned_to,
                user_name: row.user_name,
                entity_type: 'case',
                entity_id: row.id,
                metadata: {
                    case_number: row.case_number,
                    status: row.status_name,
                },
            });
        });
        // Fetch recent donations (last 30 days)
        const donationsResult = await database_1.default.query(`SELECT
        d.id,
        d.amount,
        d.donation_date,
        d.payment_method,
        d.donor_name,
        c.first_name || ' ' || c.last_name as contact_name
      FROM donations d
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE d.donation_date >= NOW() - INTERVAL '30 days'
      ORDER BY d.donation_date DESC
      LIMIT $1`, [Math.ceil(limit / 3)]);
        donationsResult.rows.forEach((row) => {
            const donorName = row.donor_name || row.contact_name || 'Anonymous';
            activities.push({
                id: `donation-${row.id}`,
                type: 'donation_received',
                title: 'New donation received',
                description: `${donorName} donated $${parseFloat(row.amount).toFixed(2)}`,
                timestamp: row.donation_date,
                user_id: null,
                user_name: donorName,
                entity_type: 'donation',
                entity_id: row.id,
                metadata: {
                    amount: row.amount,
                    payment_method: row.payment_method,
                },
            });
        });
        // Fetch recent volunteer hours (last 30 days)
        const volunteerResult = await database_1.default.query(`SELECT
        vh.id,
        vh.hours_logged,
        vh.activity_date,
        vh.notes,
        c.first_name || ' ' || c.last_name as volunteer_name
      FROM volunteer_hours vh
      LEFT JOIN volunteers v ON vh.volunteer_id = v.id
      LEFT JOIN contacts c ON v.contact_id = c.id
      WHERE vh.activity_date >= NOW() - INTERVAL '30 days'
      ORDER BY vh.activity_date DESC
      LIMIT $1`, [Math.ceil(limit / 4)]);
        volunteerResult.rows.forEach((row) => {
            activities.push({
                id: `volunteer-${row.id}`,
                type: 'volunteer_hours_logged',
                title: 'Volunteer hours logged',
                description: `${row.volunteer_name} logged ${row.hours_logged} hours`,
                timestamp: row.activity_date,
                user_id: null,
                user_name: row.volunteer_name,
                entity_type: 'volunteer',
                entity_id: row.id,
                metadata: {
                    hours: row.hours_logged,
                    notes: row.notes,
                },
            });
        });
        // Fetch recent event registrations (last 30 days)
        const eventRegResult = await database_1.default.query(`SELECT
        er.id,
        er.registered_at,
        e.name as event_name,
        c.first_name || ' ' || c.last_name as attendee_name
      FROM event_registrations er
      LEFT JOIN events e ON er.event_id = e.id
      LEFT JOIN contacts c ON er.contact_id = c.id
      WHERE er.registered_at >= NOW() - INTERVAL '30 days'
      ORDER BY er.registered_at DESC
      LIMIT $1`, [Math.ceil(limit / 4)]);
        eventRegResult.rows.forEach((row) => {
            activities.push({
                id: `event-reg-${row.id}`,
                type: 'event_registration',
                title: 'Event registration',
                description: `${row.attendee_name} registered for ${row.event_name}`,
                timestamp: row.registered_at,
                user_id: null,
                user_name: row.attendee_name,
                entity_type: 'event',
                entity_id: row.id,
                metadata: {
                    event_name: row.event_name,
                },
            });
        });
        // Sort all activities by timestamp (newest first) and limit
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return activities.slice(0, limit);
    }
    /**
     * Get activities for a specific entity
     */
    async getActivitiesForEntity(_entityType, _entityId) {
        // This can be expanded to fetch activities related to a specific entity
        // For now, return empty array as this is primarily for the dashboard feed
        return [];
    }
}
exports.ActivityService = ActivityService;
exports.default = new ActivityService();
//# sourceMappingURL=activityService.js.map