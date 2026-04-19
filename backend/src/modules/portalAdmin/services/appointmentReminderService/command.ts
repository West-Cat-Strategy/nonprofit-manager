import pool from '@config/database';
import {
  APPOINTMENT_REMINDER_JOB_RETURNING_COLUMNS,
  type ClaimedAppointmentReminderJobRow,
  mapClaimedJobRow,
  STALE_PROCESSING_TIMEOUT_MINUTES,
  type QueryValue,
} from './helpers';
import type { ClaimedAppointmentReminderJob } from '../appointmentReminderService';

export async function cancelPendingJobsForAppointment(
  appointmentId: string,
  reason: string,
  modifiedBy?: string | null
): Promise<number> {
  const result = await pool.query<{ id: string }>(
    `UPDATE appointment_reminder_jobs
     SET status = 'cancelled',
         processing_started_at = NULL,
         last_error = NULL,
         cancelled_reason = CASE
           WHEN $2::text = '' THEN cancelled_reason
           ELSE LEFT($2::text, 255)
         END,
         updated_at = NOW()
     WHERE appointment_id = $1
       AND status IN ('pending', 'processing')
     RETURNING id`,
    [appointmentId, `${reason}${modifiedBy ? `:${modifiedBy}` : ''}`]
  );

  return result.rows.length;
}

export async function cancelPendingJobsForNonSendableAppointments(
  limit = 400
): Promise<number> {
  const result = await pool.query<{ id: string }>(
    `WITH candidates AS (
       SELECT j.id
       FROM appointment_reminder_jobs j
       JOIN appointments a ON a.id = j.appointment_id
       WHERE j.status IN ('pending', 'processing')
         AND (
           a.status <> 'confirmed'
           OR a.start_time <= NOW()
         )
       ORDER BY j.scheduled_for ASC
       LIMIT $1
     )
     UPDATE appointment_reminder_jobs j
     SET status = 'cancelled',
         processing_started_at = NULL,
         cancelled_reason = 'appointment_not_sendable',
         updated_at = NOW()
     FROM candidates
     WHERE j.id = candidates.id
     RETURNING j.id`,
    [limit]
  );

  return result.rows.length;
}

export async function claimDueJobs(
  batchSize: number
): Promise<ClaimedAppointmentReminderJob[]> {
  const result = await pool.query<ClaimedAppointmentReminderJobRow>(
    `WITH due AS (
       SELECT j.id
       FROM appointment_reminder_jobs j
       JOIN appointments a ON a.id = j.appointment_id
       WHERE (
         (j.status = 'pending' AND j.scheduled_for <= NOW())
         OR (
           j.status = 'processing'
           AND j.processing_started_at < NOW() - ($2::int * INTERVAL '1 minute')
         )
       )
         AND a.status = 'confirmed'
         AND a.start_time > NOW()
       ORDER BY j.scheduled_for ASC
       LIMIT $1
       FOR UPDATE OF j SKIP LOCKED
     ),
     claimed AS (
       UPDATE appointment_reminder_jobs j
       SET status = 'processing',
           processing_started_at = NOW(),
           attempt_count = j.attempt_count + 1,
           updated_at = NOW()
       FROM due
       WHERE j.id = due.id
       RETURNING ${APPOINTMENT_REMINDER_JOB_RETURNING_COLUMNS}
     )
     SELECT
       ${APPOINTMENT_REMINDER_JOB_RETURNING_COLUMNS},
       a.title,
       a.start_time,
       a.end_time,
       a.location,
       TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS contact_name,
       c.email AS contact_email,
       pu.email AS portal_email,
       c.mobile_phone,
       c.phone,
       COALESCE(c.do_not_email, false) AS do_not_email,
       COALESCE(c.do_not_text, false) AS do_not_text
     FROM claimed
     JOIN appointments a ON a.id = claimed.appointment_id
     JOIN contacts c ON c.id = a.contact_id
     LEFT JOIN portal_users pu ON pu.id = a.requested_by_portal
     ORDER BY claimed.scheduled_for ASC`,
    [batchSize, STALE_PROCESSING_TIMEOUT_MINUTES]
  );

  return result.rows.map(mapClaimedJobRow);
}

export async function markJobResult(
  jobId: string,
  result: {
    status: 'sent' | 'failed' | 'skipped' | 'cancelled';
    error?: string | null;
  }
): Promise<void> {
  const params: QueryValue[] = [result.status, result.error || null, jobId];
  await pool.query(
    `UPDATE appointment_reminder_jobs
     SET status = $1,
         last_error = $2,
         processing_started_at = NULL,
         updated_at = NOW()
     WHERE id = $3`,
    params
  );
}
