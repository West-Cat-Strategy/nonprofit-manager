import pool from '@config/database';
import { logger } from '@config/logger';
import {
  AppointmentReminderDelivery,
  AppointmentReminderJob,
  ClaimedAppointmentReminderJob,
  DeliveryStatus,
  ReminderChannel,
  ReminderCadenceKey,
  ReminderJobStatus,
  ReminderTriggerType,
} from './types';

const APPOINTMENT_REMINDER_JOB_COLUMNS = [
  'id',
  'appointment_id',
  'cadence_key',
  'channel',
  'scheduled_for',
  'status',
  'processing_started_at',
  'attempt_count',
  'last_error',
  'cancelled_reason',
  'created_at',
  'updated_at',
] as const;

const APPOINTMENT_REMINDER_JOB_SELECT_COLUMNS = APPOINTMENT_REMINDER_JOB_COLUMNS.join(', ');
const APPOINTMENT_REMINDER_JOB_RETURNING_COLUMNS = APPOINTMENT_REMINDER_JOB_COLUMNS.map(
  (column) => `j.${column}`
).join(', ');

const APPOINTMENT_REMINDER_DELIVERY_COLUMNS = [
  'id',
  'appointment_id',
  'job_id',
  'channel',
  'trigger_type',
  'recipient',
  'delivery_status',
  'error_message',
  'message_preview',
  'sent_by',
  'sent_at',
].join(', ');

interface AppointmentReminderContextRow {
  appointment_id: string;
  title: string;
  start_time: Date;
  end_time: Date | null;
  status: string;
  location: string | null;
  contact_name: string;
  contact_email: string | null;
  portal_email: string | null;
  mobile_phone: string | null;
  phone: string | null;
  do_not_email: boolean;
  do_not_text: boolean;
}

interface AppointmentReminderJobRow {
  id: string;
  appointment_id: string;
  cadence_key: ReminderCadenceKey;
  channel: ReminderChannel;
  scheduled_for: Date;
  status: ReminderJobStatus;
  processing_started_at: Date | null;
  attempt_count: number;
  last_error: string | null;
  cancelled_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ClaimedAppointmentReminderJobRow extends AppointmentReminderJobRow {
  title: string;
  start_time: Date;
  end_time: Date | null;
  location: string | null;
  contact_name: string;
  contact_email: string | null;
  portal_email: string | null;
  mobile_phone: string | null;
  phone: string | null;
  do_not_email: boolean;
  do_not_text: boolean;
}

interface AppointmentReminderDeliveryRow {
  id: string;
  appointment_id: string;
  job_id: string | null;
  channel: ReminderChannel;
  trigger_type: ReminderTriggerType;
  recipient: string;
  delivery_status: DeliveryStatus;
  error_message: string | null;
  message_preview: string | null;
  sent_by: string | null;
  sent_at: Date;
}

const mapJobRow = (row: AppointmentReminderJobRow): AppointmentReminderJob => ({
  id: row.id,
  appointment_id: row.appointment_id,
  cadence_key: row.cadence_key,
  channel: row.channel,
  scheduled_for: row.scheduled_for,
  status: row.status,
  processing_started_at: row.processing_started_at,
  attempt_count: row.attempt_count,
  last_error: row.last_error,
  cancelled_reason: row.cancelled_reason,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapClaimedJobRow = (row: ClaimedAppointmentReminderJobRow): ClaimedAppointmentReminderJob => ({
  ...mapJobRow(row),
  title: row.title,
  start_time: row.start_time,
  end_time: row.end_time,
  location: row.location,
  contact_name: row.contact_name,
  contact_email: row.contact_email,
  portal_email: row.portal_email,
  mobile_phone: row.mobile_phone,
  phone: row.phone,
  do_not_email: row.do_not_email,
  do_not_text: row.do_not_text,
});

const mapDeliveryRow = (row: AppointmentReminderDeliveryRow): AppointmentReminderDelivery => ({
  id: row.id,
  appointment_id: row.appointment_id,
  job_id: row.job_id,
  channel: row.channel,
  trigger_type: row.trigger_type,
  recipient: row.recipient,
  delivery_status: row.delivery_status,
  error_message: row.error_message,
  message_preview: row.message_preview,
  sent_by: row.sent_by,
  sent_at: row.sent_at,
});

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

export const listJobsForAppointment = async (appointmentId: string): Promise<AppointmentReminderJob[]> => {
  const result = await pool.query<AppointmentReminderJobRow>(
    `SELECT ${APPOINTMENT_REMINDER_JOB_SELECT_COLUMNS}
     FROM appointment_reminder_jobs
     WHERE appointment_id = $1
     ORDER BY scheduled_for ASC, channel ASC`,
    [appointmentId]
  );

  return result.rows.map(mapJobRow);
};

export const listDeliveriesForAppointment = async (
  appointmentId: string
): Promise<AppointmentReminderDelivery[]> => {
  const result = await pool.query<AppointmentReminderDeliveryRow>(
    `SELECT ${APPOINTMENT_REMINDER_DELIVERY_COLUMNS}
     FROM appointment_reminder_deliveries
     WHERE appointment_id = $1
     ORDER BY sent_at DESC`,
    [appointmentId]
  );

  return result.rows.map(mapDeliveryRow);
};

export const upsertReminderJobs = async (
  client: typeof pool | { query: typeof pool.query },
  appointmentId: string,
  activeCombos: Array<{
    cadenceKey: ReminderCadenceKey;
    channel: ReminderChannel;
    scheduledFor: Date;
  }>
): Promise<void> => {
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
};

export const cancelJobsOutsideWindow = async (
  client: typeof pool | { query: typeof pool.query },
  appointmentId: string,
  outsideWindowCombos: Array<{ cadenceKey: ReminderCadenceKey; channel: ReminderChannel }>
): Promise<void> => {
  if (outsideWindowCombos.length === 0) {
    return;
  }

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
};

export const cancelJobsMissingCombos = async (
  client: typeof pool | { query: typeof pool.query },
  appointmentId: string,
  activeCombos: Array<{ cadenceKey: ReminderCadenceKey; channel: ReminderChannel }>
): Promise<void> => {
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
};

export const cancelAllActiveJobs = async (
  client: typeof pool | { query: typeof pool.query },
  appointmentId: string
): Promise<void> => {
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
};

export const cancelPendingJobsForAppointment = async (
  appointmentId: string,
  reason: string
): Promise<number> => {
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
    [appointmentId, reason]
  );

  return result.rows.length;
};

export const cancelPendingJobsForNonSendableAppointments = async (limit = 400): Promise<number> => {
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
};

export const claimDueJobs = async (
  batchSize: number,
  staleProcessingTimeoutMinutes: number
): Promise<ClaimedAppointmentReminderJob[]> => {
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
       ${APPOINTMENT_REMINDER_JOB_SELECT_COLUMNS},
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
    [batchSize, staleProcessingTimeoutMinutes]
  );

  return result.rows.map(mapClaimedJobRow);
};

export const markJobResult = async (
  jobId: string,
  status: Extract<ReminderJobStatus, 'sent' | 'failed' | 'skipped' | 'cancelled'>,
  error?: string | null
): Promise<void> => {
  await pool.query(
    `UPDATE appointment_reminder_jobs
     SET status = $1,
         last_error = $2,
         processing_started_at = NULL,
         updated_at = NOW()
     WHERE id = $3`,
    [status, error || null, jobId]
  );
};

export const recordDelivery = async (args: {
  appointmentId: string;
  jobId?: string | null;
  channel: ReminderChannel;
  triggerType: ReminderTriggerType;
  recipient: string;
  deliveryStatus: DeliveryStatus;
  errorMessage?: string | null;
  messagePreview: string;
  sentBy?: string | null;
}): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO appointment_reminder_deliveries (
         appointment_id,
         job_id,
         channel,
         trigger_type,
         recipient,
         delivery_status,
         error_message,
         message_preview,
         sent_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        args.appointmentId,
        args.jobId || null,
        args.channel,
        args.triggerType,
        args.recipient,
        args.deliveryStatus,
        args.errorMessage || null,
        args.messagePreview.slice(0, 255),
        args.sentBy ?? null,
      ]
    );
  } catch (error) {
    logger.warn('Failed to record appointment reminder delivery', {
      appointmentId: args.appointmentId,
      channel: args.channel,
      deliveryStatus: args.deliveryStatus,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
