import pool from '@config/database';
import {
  APPOINTMENT_REMINDER_JOB_SELECT_COLUMNS,
  computeSchedule,
  CHANNELS,
  mapJobRow,
  type AppointmentReminderJobRow,
} from './helpers';
import { getReminderContext } from './query';
import { cancelPendingJobsForAppointment } from './command';
import type { AppointmentReminderJob } from '../appointmentReminderService';

export async function syncJobsForAppointment(
  appointmentId: string
): Promise<AppointmentReminderJob[]> {
  const appointment = await getReminderContext(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.status !== 'confirmed' || appointment.start_time <= new Date()) {
    await cancelPendingJobsForAppointment(
      appointmentId,
      appointment.status !== 'confirmed'
        ? `appointment_status_${appointment.status}`
        : 'appointment_start_passed'
    );
    return [];
  }

  const now = new Date();
  const schedules = computeSchedule(appointment.start_time);
  const activeCombos: Array<{
    cadenceKey: '24h' | '2h';
    channel: 'email' | 'sms';
    scheduledFor: Date;
  }> = [];
  const outsideWindowCombos: Array<{
    cadenceKey: '24h' | '2h';
    channel: 'email' | 'sms';
  }> = [];

  for (const schedule of schedules) {
    for (const channel of CHANNELS) {
      if (schedule.scheduledFor <= now) {
        outsideWindowCombos.push({
          cadenceKey: schedule.cadenceKey,
          channel,
        });
        continue;
      }

      activeCombos.push({
        cadenceKey: schedule.cadenceKey,
        channel,
        scheduledFor: schedule.scheduledFor,
      });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (outsideWindowCombos.length > 0) {
      await client.query(
        `UPDATE appointment_reminder_jobs AS jobs
         SET status = 'cancelled',
             processing_started_at = NULL,
             cancelled_reason = 'outside_send_window',
             updated_at = NOW()
         FROM UNNEST($2::varchar[], $3::varchar[]) AS stale(cadence_key, channel)
         WHERE jobs.appointment_id = $1
           AND jobs.cadence_key = stale.cadence_key
           AND jobs.channel = stale.channel
           AND jobs.status IN ('pending', 'processing')`,
        [
          appointmentId,
          outsideWindowCombos.map((combo) => combo.cadenceKey),
          outsideWindowCombos.map((combo) => combo.channel),
        ]
      );
    }

    if (activeCombos.length > 0) {
      await client.query(
        `INSERT INTO appointment_reminder_jobs (
           appointment_id,
           cadence_key,
           channel,
           scheduled_for,
           status,
           processing_started_at,
           attempt_count,
           last_error,
           cancelled_reason
         )
         SELECT
           $1,
           entries.cadence_key,
           entries.channel,
           entries.scheduled_for,
           'pending',
           NULL,
           0,
           NULL,
           NULL
         FROM UNNEST($2::varchar[], $3::varchar[], $4::timestamptz[]) AS entries(
           cadence_key,
           channel,
           scheduled_for
         )
         ON CONFLICT (appointment_id, cadence_key, channel)
         DO UPDATE
         SET scheduled_for = EXCLUDED.scheduled_for,
             status = CASE
               WHEN appointment_reminder_jobs.status = 'sent' THEN 'sent'
               ELSE 'pending'
             END,
             processing_started_at = NULL,
             last_error = NULL,
             cancelled_reason = NULL,
             updated_at = NOW()`,
        [
          appointmentId,
          activeCombos.map((combo) => combo.cadenceKey),
          activeCombos.map((combo) => combo.channel),
          activeCombos.map((combo) => combo.scheduledFor),
        ]
      );

      await client.query(
        `UPDATE appointment_reminder_jobs AS jobs
         SET status = 'cancelled',
             processing_started_at = NULL,
             cancelled_reason = 'cadence_removed',
             updated_at = NOW()
         WHERE jobs.appointment_id = $1
           AND jobs.status IN ('pending', 'processing')
           AND NOT EXISTS (
             SELECT 1
             FROM UNNEST($2::varchar[], $3::varchar[]) AS keep(cadence_key, channel)
             WHERE keep.cadence_key = jobs.cadence_key
               AND keep.channel = jobs.channel
           )`,
        [
          appointmentId,
          activeCombos.map((combo) => combo.cadenceKey),
          activeCombos.map((combo) => combo.channel),
        ]
      );
    } else {
      await client.query(
        `UPDATE appointment_reminder_jobs
         SET status = 'cancelled',
             processing_started_at = NULL,
             cancelled_reason = 'cadence_removed',
             updated_at = NOW()
         WHERE appointment_id = $1
           AND status IN ('pending', 'processing')`,
        [appointmentId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const rows = await pool.query<AppointmentReminderJobRow>(
    `SELECT ${APPOINTMENT_REMINDER_JOB_SELECT_COLUMNS}
     FROM appointment_reminder_jobs
     WHERE appointment_id = $1
     ORDER BY scheduled_for ASC, channel ASC`,
    [appointmentId]
  );

  return rows.rows.map(mapJobRow) as AppointmentReminderJob[];
}
