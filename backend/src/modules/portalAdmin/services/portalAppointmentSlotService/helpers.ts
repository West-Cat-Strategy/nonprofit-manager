import type { AppointmentSlot } from '../portalAppointmentSlotService';

export const APPOINTMENT_SELECT = `
  SELECT
    a.id,
    a.contact_id,
    a.case_id,
    a.pointperson_user_id,
    a.slot_id,
    a.request_type,
    a.title,
    a.description,
    a.start_time,
    a.end_time,
    a.status,
    a.checked_in_at,
    a.checked_in_by,
    a.location,
    a.created_at,
    a.updated_at,
    c.case_number,
    c.title AS case_title,
    contact.first_name || ' ' || contact.last_name AS contact_name,
    u.first_name AS pointperson_first_name,
    u.last_name AS pointperson_last_name,
    u.email AS pointperson_email,
    pu.id AS portal_user_id,
    pu.email AS portal_email,
    reminder_jobs.next_reminder_at,
    reminder_jobs.pending_reminder_jobs,
    reminder_jobs.total_reminder_jobs,
    reminder_history.last_reminder_sent_at,
    resolution_counts.linked_note_count,
    resolution_counts.linked_outcome_count,
    CASE
      WHEN a.status = 'cancelled' THEN 'cancelled'
      WHEN a.checked_in_at IS NOT NULL OR a.status = 'completed' THEN 'attended'
      WHEN a.status IN ('requested', 'confirmed') AND COALESCE(a.end_time, a.start_time) < NOW() THEN 'no_show'
      ELSE 'scheduled'
    END AS attendance_state,
    CASE
      WHEN a.case_id IS NOT NULL AND a.status IN ('completed', 'cancelled') AND COALESCE(resolution_counts.linked_note_count, 0) = 0 THEN true
      ELSE false
    END AS missing_note,
    CASE
      WHEN a.case_id IS NOT NULL AND a.status IN ('completed', 'cancelled') AND COALESCE(resolution_counts.linked_outcome_count, 0) = 0 THEN true
      ELSE false
    END AS missing_outcome,
    CASE
      WHEN a.status = 'confirmed'
        AND a.start_time > NOW()
        AND COALESCE(reminder_jobs.total_reminder_jobs, 0) = 0
        AND reminder_history.last_reminder_sent_at IS NULL THEN true
      ELSE false
    END AS missing_reminder,
    CASE
      WHEN COALESCE(reminder_jobs.total_reminder_jobs, 0) > 0
        OR reminder_history.last_reminder_sent_at IS NOT NULL THEN true
      ELSE false
    END AS reminder_offered
  FROM appointments a
  LEFT JOIN cases c ON c.id = a.case_id
  LEFT JOIN contacts contact ON contact.id = a.contact_id
  LEFT JOIN users u ON u.id = a.pointperson_user_id
  LEFT JOIN portal_users pu ON pu.id = a.requested_by_portal
  LEFT JOIN LATERAL (
    SELECT
      MIN(j.scheduled_for) FILTER (WHERE j.status IN ('pending', 'processing')) AS next_reminder_at,
      COUNT(*) FILTER (WHERE j.status IN ('pending', 'processing'))::int AS pending_reminder_jobs,
      COUNT(*)::int AS total_reminder_jobs
    FROM appointment_reminder_jobs j
    WHERE j.appointment_id = a.id
  ) reminder_jobs ON true
  LEFT JOIN LATERAL (
    SELECT MAX(d.sent_at) AS last_reminder_sent_at
    FROM appointment_reminder_deliveries d
    WHERE d.appointment_id = a.id
  ) reminder_history ON true
  LEFT JOIN LATERAL (
    SELECT
      (
        SELECT COUNT(*)::int
        FROM case_notes cn
        WHERE cn.case_id = a.case_id
          AND cn.source_entity_type = 'appointment'
          AND cn.source_entity_id = a.id
      ) AS linked_note_count,
      (
        SELECT COUNT(*)::int
        FROM case_outcomes co
        WHERE co.case_id = a.case_id
          AND co.source_entity_type = 'appointment'
          AND co.source_entity_id = a.id
      ) AS linked_outcome_count
  ) resolution_counts ON true
`;

export const SLOT_SELECT = `
  SELECT
    s.*,
    c.case_number,
    c.title AS case_title,
    u.first_name AS pointperson_first_name,
    u.last_name AS pointperson_last_name,
    u.email AS pointperson_email,
    GREATEST(s.capacity - s.booked_count, 0) AS available_count
  FROM appointment_availability_slots s
  LEFT JOIN cases c ON c.id = s.case_id
  LEFT JOIN users u ON u.id = s.pointperson_user_id
`;

export const normalizeSlot = (row: Record<string, unknown>): AppointmentSlot => ({
  ...(row as unknown as AppointmentSlot),
  capacity: Number(row.capacity || 0),
  booked_count: Number(row.booked_count || 0),
  available_count: Number(row.available_count || 0),
});
