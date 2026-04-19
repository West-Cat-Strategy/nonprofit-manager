import pool from '@config/database';
import type {
  AppointmentReminderContextRow,
  AppointmentReminderDeliveryRow,
  AppointmentReminderJobRow,
} from './helpers';
import {
  APPOINTMENT_REMINDER_DELIVERY_COLUMNS,
  APPOINTMENT_REMINDER_JOB_SELECT_COLUMNS,
  mapDeliveryRow,
  mapJobRow,
} from './helpers';
import type { AppointmentReminderJob, AppointmentReminderDelivery } from '../appointmentReminderService';
import type { AppointmentReminderListResult } from '../appointmentReminderService';

export const getReminderContext = async (
  appointmentId: string
): Promise<AppointmentReminderContextRow | null> => {
  const result = await pool.query<AppointmentReminderContextRow>(
    `SELECT
       a.id AS appointment_id,
       a.title,
       a.start_time,
       a.end_time,
       a.status,
       a.location,
       TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS contact_name,
       c.email AS contact_email,
       pu.email AS portal_email,
       c.mobile_phone,
       c.phone,
       COALESCE(c.do_not_email, false) AS do_not_email,
       COALESCE(c.do_not_text, false) AS do_not_text
     FROM appointments a
     JOIN contacts c ON c.id = a.contact_id
     LEFT JOIN portal_users pu ON pu.id = a.requested_by_portal
     WHERE a.id = $1
     LIMIT 1`,
    [appointmentId]
  );

  return result.rows[0] ?? null;
};

export const listAppointmentReminders = async (appointmentId: string): Promise<AppointmentReminderListResult> => {
  const [jobsResult, deliveriesResult] = await Promise.all([
    pool.query<AppointmentReminderJobRow>(
      `SELECT ${APPOINTMENT_REMINDER_JOB_SELECT_COLUMNS}
       FROM appointment_reminder_jobs
       WHERE appointment_id = $1
       ORDER BY scheduled_for ASC, channel ASC`,
      [appointmentId]
    ),
    pool.query<AppointmentReminderDeliveryRow>(
      `SELECT ${APPOINTMENT_REMINDER_DELIVERY_COLUMNS}
       FROM appointment_reminder_deliveries
       WHERE appointment_id = $1
       ORDER BY sent_at DESC`,
      [appointmentId]
    ),
  ]);

  return {
    jobs: jobsResult.rows.map(mapJobRow) as AppointmentReminderJob[],
    deliveries: deliveriesResult.rows.map(mapDeliveryRow) as AppointmentReminderDelivery[],
  };
};
