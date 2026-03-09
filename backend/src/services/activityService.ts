/**
 * Activity Service
 * Fetches and aggregates activities across the application
 */

import pool from '@config/database';
import type { Activity } from '@app-types/activity';
import { activityEventService } from '@services/activityEventService';

const mergeActivities = (primary: Activity[], secondary: Activity[], limit?: number): Activity[] => {
  const seen = new Set<string>();
  const merged = [...primary, ...secondary].filter((activity) => {
    if (seen.has(activity.id)) {
      return false;
    }
    seen.add(activity.id);
    return true;
  });

  merged.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return typeof limit === 'number' ? merged.slice(0, limit) : merged;
};

export class ActivityService {
  /**
   * Get recent activities across all modules
   */
  async getRecentActivities(limit: number = 10, organizationId?: string): Promise<Activity[]> {
    const recordedActivities = await activityEventService.listRecentActivities(limit, organizationId);
    const activities: Activity[] = [];

    // Fetch recent cases (created in last 30 days)
    const casesResult = await pool.query(
      `SELECT
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
      LIMIT $1`,
      [Math.ceil(limit / 2)]
    );

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
    const donationsResult = await pool.query(
      `SELECT
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
      LIMIT $1`,
      [Math.ceil(limit / 3)]
    );

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
    const volunteerResult = await pool.query(
      `SELECT
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
      LIMIT $1`,
      [Math.ceil(limit / 4)]
    );

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
    const eventRegResult = await pool.query(
      `SELECT
        er.id,
        er.registered_at,
        e.name as event_name,
        c.first_name || ' ' || c.last_name as attendee_name
      FROM event_registrations er
      LEFT JOIN events e ON er.event_id = e.id
      LEFT JOIN contacts c ON er.contact_id = c.id
      WHERE er.registered_at >= NOW() - INTERVAL '30 days'
      ORDER BY er.registered_at DESC
      LIMIT $1`,
      [Math.ceil(limit / 4)]
    );

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
    return mergeActivities(recordedActivities, activities, limit);
  }

  /**
   * Get activities for a specific entity
   */
  async getActivitiesForEntity(
    entityType: 'case' | 'donation' | 'volunteer' | 'event' | 'contact',
    entityId: string,
    organizationId?: string
  ): Promise<Activity[]> {
    const recordedActivities = await activityEventService.listActivitiesForEntity(
      entityType,
      entityId,
      organizationId
    );

    if (entityType !== 'contact') {
      return recordedActivities;
    }

    const activities: Activity[] = [];

    const notesResult = await pool.query(
      `SELECT
        cn.id,
        cn.note_type,
        cn.subject,
        cn.content,
        cn.created_at,
        u.first_name || ' ' || u.last_name as user_name
      FROM contact_notes cn
      LEFT JOIN users u ON cn.created_by = u.id
      WHERE cn.contact_id = $1
      ORDER BY cn.created_at DESC
      LIMIT 100`,
      [entityId]
    );

    notesResult.rows.forEach((row) => {
      activities.push({
        id: `note-${row.id}`,
        type: 'contact_note_added',
        title: row.subject ? `Note: ${row.subject}` : 'Note added',
        description: row.content ? row.content.slice(0, 160) : '',
        timestamp: row.created_at,
        user_id: null,
        user_name: row.user_name,
        entity_type: 'contact',
        entity_id: entityId,
        metadata: {
          note_type: row.note_type,
        },
      });
    });

    const casesResult = await pool.query(
      `SELECT id, case_number, title, created_at, status_name
       FROM cases
       WHERE contact_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [entityId]
    );

    casesResult.rows.forEach((row) => {
      activities.push({
        id: `case-${row.id}`,
        type: 'case_created',
        title: `Case created`,
        description: `Case ${row.case_number}: ${row.title}`,
        timestamp: row.created_at,
        user_id: null,
        user_name: null,
        entity_type: 'case',
        entity_id: row.id,
        metadata: {
          case_number: row.case_number,
          status: row.status_name,
        },
      });
    });

    const donationsResult = await pool.query(
      `SELECT id, amount, donation_date, payment_status
       FROM donations
       WHERE contact_id = $1
       ORDER BY donation_date DESC
       LIMIT 50`,
      [entityId]
    );

    donationsResult.rows.forEach((row) => {
      activities.push({
        id: `donation-${row.id}`,
        type: 'donation_received',
        title: 'Donation received',
        description: `Donation of $${parseFloat(row.amount).toFixed(2)}`,
        timestamp: row.donation_date,
        user_id: null,
        user_name: null,
        entity_type: 'donation',
        entity_id: row.id,
        metadata: {
          status: row.payment_status,
        },
      });
    });

    const tasksResult = await pool.query(
      `SELECT id, subject, status, priority, created_at, due_date
       FROM tasks
       WHERE related_to_type = 'contact' AND related_to_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [entityId]
    );

    tasksResult.rows.forEach((row) => {
      activities.push({
        id: `task-${row.id}`,
        type: 'task_created',
        title: `Task: ${row.subject}`,
        description: row.due_date ? `Due ${row.due_date}` : 'Task created',
        timestamp: row.created_at,
        user_id: null,
        user_name: null,
        entity_type: 'task' as Activity['entity_type'],
        entity_id: row.id,
        metadata: {
          status: row.status,
          priority: row.priority,
        },
      });
    });

    const documentsResult = await pool.query(
      `SELECT id, title, original_name, created_at
       FROM contact_documents
       WHERE contact_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [entityId]
    );

    documentsResult.rows.forEach((row) => {
      activities.push({
        id: `document-${row.id}`,
        type: 'document_uploaded',
        title: row.title || row.original_name,
        description: 'Document uploaded',
        timestamp: row.created_at,
        user_id: null,
        user_name: null,
        entity_type: 'contact',
        entity_id: entityId,
        metadata: {
          document_id: row.id,
        },
      });
    });

    const appointmentsResult = await pool.query(
      `SELECT
         a.id,
         a.title,
         a.status,
         a.start_time,
         a.end_time,
         a.location,
         a.checked_in_at,
         a.created_at,
         a.updated_at,
         c.case_number,
         c.title AS case_title
       FROM appointments a
       LEFT JOIN cases c ON c.id = a.case_id
       WHERE a.contact_id = $1
       ORDER BY COALESCE(a.checked_in_at, a.updated_at, a.created_at) DESC
       LIMIT 50`,
      [entityId]
    );

    appointmentsResult.rows.forEach((row) => {
      const activityType =
        row.status === 'cancelled'
          ? 'appointment_cancelled'
          : row.status === 'completed'
            ? 'appointment_completed'
            : 'appointment_scheduled';
      activities.push({
        id: `appointment-${row.id}`,
        type: activityType as Activity['type'],
        title:
          row.status === 'cancelled'
            ? 'Appointment cancelled'
            : row.status === 'completed'
              ? 'Appointment completed'
              : 'Appointment scheduled',
        description: [
          row.title || 'Appointment',
          row.case_number ? `(${row.case_number})` : '',
          row.location ? `at ${row.location}` : '',
        ]
          .filter(Boolean)
          .join(' '),
        timestamp: row.checked_in_at || row.updated_at || row.created_at,
        user_id: null,
        user_name: null,
        entity_type: 'appointment',
        entity_id: row.id,
        metadata: {
          status: row.status,
          start_time: row.start_time,
          end_time: row.end_time,
          case_number: row.case_number,
          case_title: row.case_title,
        },
      });
    });

    const conversationsResult = await pool.query(
      `SELECT
         t.id,
         t.subject,
         t.status,
         t.last_message_preview,
         COALESCE(t.closed_at, t.updated_at) AS resolved_at
       FROM portal_threads t
       WHERE t.contact_id = $1
         AND t.status IN ('closed', 'archived')
       ORDER BY COALESCE(t.closed_at, t.updated_at) DESC
       LIMIT 50`,
      [entityId]
    );

    conversationsResult.rows.forEach((row) => {
      activities.push({
        id: `conversation-${row.id}`,
        type: 'conversation_resolved',
        title: 'Conversation resolved',
        description: row.subject || row.last_message_preview || 'Portal conversation closed',
        timestamp: row.resolved_at,
        user_id: null,
        user_name: null,
        entity_type: 'conversation',
        entity_id: row.id,
        metadata: {
          status: row.status,
        },
      });
    });

    const followUpsResult = await pool.query(
      `SELECT
         fu.id,
         fu.title,
         fu.status,
         fu.completed_date,
          fu.completed_notes,
         fu.updated_at,
         fu.created_at,
         fu.entity_type,
         fu.entity_id,
         c.case_number
       FROM follow_ups fu
       LEFT JOIN cases c ON fu.entity_type = 'case' AND fu.entity_id = c.id
       WHERE (
         (fu.entity_type = 'contact' AND fu.entity_id = $1)
         OR (fu.entity_type = 'case' AND c.contact_id = $1)
       )
       AND fu.status IN ('completed', 'cancelled')
       ORDER BY COALESCE(fu.completed_date, fu.updated_at, fu.created_at) DESC
       LIMIT 50`,
      [entityId]
    );

    followUpsResult.rows.forEach((row) => {
      activities.push({
        id: `follow-up-${row.id}`,
        type: 'follow_up_completed',
        title: row.status === 'cancelled' ? 'Follow-up cancelled' : 'Follow-up completed',
        description: [row.title, row.case_number ? `(${row.case_number})` : ''].filter(Boolean).join(' '),
        timestamp: row.completed_date || row.updated_at || row.created_at,
        user_id: null,
        user_name: null,
        entity_type: 'follow_up',
        entity_id: row.id,
        metadata: {
          status: row.status,
          entity_type: row.entity_type,
          entity_id: row.entity_id,
          completed_notes: row.completed_notes,
        },
      });
    });

    const attendanceResult = await pool.query(
      `SELECT
         er.id,
         er.event_id,
         er.case_id,
         er.registration_status,
         er.check_in_time,
         er.check_in_method,
         er.created_at,
         e.name AS event_name,
         c.case_number
       FROM event_registrations er
       LEFT JOIN events e ON e.id = er.event_id
       LEFT JOIN cases c ON c.id = er.case_id
       WHERE er.contact_id = $1
         AND er.checked_in = true
       ORDER BY COALESCE(er.check_in_time, er.created_at) DESC
       LIMIT 50`,
      [entityId]
    );

    attendanceResult.rows.forEach((row) => {
      activities.push({
        id: `attendance-${row.id}`,
        type: 'attendance_recorded',
        title: 'Attendance recorded',
        description: [row.event_name || 'Event', row.case_number ? `(${row.case_number})` : '']
          .filter(Boolean)
          .join(' '),
        timestamp: row.check_in_time || row.created_at,
        user_id: null,
        user_name: null,
        entity_type: 'attendance',
        entity_id: row.id,
        metadata: {
          event_id: row.event_id,
          case_id: row.case_id,
          registration_status: row.registration_status,
          check_in_method: row.check_in_method,
        },
      });
    });

    return mergeActivities(recordedActivities, activities, 200);
  }
}

export default new ActivityService();
