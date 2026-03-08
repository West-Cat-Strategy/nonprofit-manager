import pool from '@config/database';
import { logger } from '@config/logger';
import { sendMail } from '@services/emailService';
import { getEmailSettings } from '@services/emailSettingsService';
import { sendSms } from '@services/twilioSmsService';
import { getTwilioSettings } from '@services/twilioSettingsService';

type ReminderChannel = 'email' | 'sms';
type ReminderTriggerType = 'manual' | 'automated';
type ReminderCadenceKey = '24h' | '2h';
type ReminderJobStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'cancelled';
type DeliveryStatus = 'sent' | 'failed' | 'skipped';

type QueryValue = string | number | boolean | Date | null;

const STALE_PROCESSING_TIMEOUT_MINUTES = 10;

const CADENCE_MINUTES: Record<ReminderCadenceKey, number> = {
  '24h': 24 * 60,
  '2h': 2 * 60,
};

const CADENCE_KEYS: ReminderCadenceKey[] = ['24h', '2h'];
const CHANNELS: ReminderChannel[] = ['email', 'sms'];

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

export interface AppointmentReminderJob {
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

export interface ClaimedAppointmentReminderJob extends AppointmentReminderJob {
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

export interface AppointmentReminderDelivery {
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

export interface AppointmentReminderListResult {
  jobs: AppointmentReminderJob[];
  deliveries: AppointmentReminderDelivery[];
}

export interface AppointmentReminderChannelSummary {
  requested: boolean;
  enabled: boolean;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface AppointmentReminderSendSummary {
  appointmentId: string;
  appointmentStart: Date;
  email: AppointmentReminderChannelSummary;
  sms: AppointmentReminderChannelSummary;
  warnings: string[];
}

interface SendReminderOptions {
  sendEmail?: boolean;
  sendSms?: boolean;
  customMessage?: string;
}

interface SendReminderContext {
  triggerType: ReminderTriggerType;
  sentBy?: string | null;
  jobId?: string | null;
}

interface MarkJobResultInput {
  status: Extract<ReminderJobStatus, 'sent' | 'failed' | 'skipped' | 'cancelled'>;
  error?: string | null;
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

const createChannelSummary = (
  requested: boolean,
  enabled: boolean
): AppointmentReminderChannelSummary => ({
  requested,
  enabled,
  attempted: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
});

const getReminderContext = async (
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

const formatReminderDate = (date: Date): string =>
  new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const buildReminderBaseMessage = (appointment: AppointmentReminderContextRow): string => {
  const locationLabel = appointment.location ? ` at ${appointment.location}` : '';
  return `Reminder: ${appointment.title} starts ${formatReminderDate(appointment.start_time)}${locationLabel}.`;
};

const buildReminderEmailSubject = (appointment: AppointmentReminderContextRow): string =>
  `Reminder: ${appointment.title} on ${new Date(appointment.start_time).toLocaleDateString('en-US')}`;

const computeSchedule = (
  startTime: Date
): Array<{ cadenceKey: ReminderCadenceKey; scheduledFor: Date }> =>
  CADENCE_KEYS.map((cadenceKey) => ({
    cadenceKey,
    scheduledFor: new Date(startTime.getTime() - CADENCE_MINUTES[cadenceKey] * 60_000),
  }));

const resolveEmailRecipient = (appointment: AppointmentReminderContextRow): string =>
  appointment.contact_email?.trim() || appointment.portal_email?.trim() || '';

const resolveSmsRecipient = (appointment: AppointmentReminderContextRow): string =>
  appointment.mobile_phone || appointment.phone || '';

const recordDelivery = async (args: {
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
    cadenceKey: ReminderCadenceKey;
    channel: ReminderChannel;
    scheduledFor: Date;
  }> = [];
  const outsideWindowCombos: Array<{
    cadenceKey: ReminderCadenceKey;
    channel: ReminderChannel;
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
    `SELECT *
     FROM appointment_reminder_jobs
     WHERE appointment_id = $1
     ORDER BY scheduled_for ASC, channel ASC`,
    [appointmentId]
  );

  return rows.rows.map(mapJobRow);
}

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
       RETURNING j.*
     )
     SELECT
       claimed.*,
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
  result: MarkJobResultInput
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

export async function listAppointmentReminders(
  appointmentId: string
): Promise<AppointmentReminderListResult> {
  const [jobsResult, deliveriesResult] = await Promise.all([
    pool.query<AppointmentReminderJobRow>(
      `SELECT *
       FROM appointment_reminder_jobs
       WHERE appointment_id = $1
       ORDER BY scheduled_for ASC, channel ASC`,
      [appointmentId]
    ),
    pool.query<AppointmentReminderDeliveryRow>(
      `SELECT *
       FROM appointment_reminder_deliveries
       WHERE appointment_id = $1
       ORDER BY sent_at DESC`,
      [appointmentId]
    ),
  ]);

  return {
    jobs: jobsResult.rows.map(mapJobRow),
    deliveries: deliveriesResult.rows.map(mapDeliveryRow),
  };
}

export async function sendAppointmentReminders(
  appointmentId: string,
  options: SendReminderOptions,
  context: SendReminderContext
): Promise<AppointmentReminderSendSummary> {
  const appointment = await getReminderContext(appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.status !== 'confirmed' || appointment.start_time <= new Date()) {
    throw new Error('Appointment is not eligible for reminders');
  }

  const sendEmailRequested = options.sendEmail ?? true;
  const sendSmsRequested = options.sendSms ?? true;
  if (!sendEmailRequested && !sendSmsRequested) {
    throw new Error('At least one reminder channel must be enabled');
  }

  const [emailSettings, twilioSettings] = await Promise.all([
    sendEmailRequested ? getEmailSettings() : Promise.resolve(null),
    sendSmsRequested ? getTwilioSettings() : Promise.resolve(null),
  ]);

  const emailEnabled = Boolean(sendEmailRequested && emailSettings?.isConfigured);
  const smsEnabled = Boolean(sendSmsRequested && twilioSettings?.isConfigured);
  const warnings: string[] = [];
  if (sendEmailRequested && !emailEnabled) {
    warnings.push('Email reminders were requested, but SMTP is not configured.');
  }
  if (sendSmsRequested && !smsEnabled) {
    warnings.push('SMS reminders were requested, but Twilio is not configured.');
  }

  const emailSummary = createChannelSummary(sendEmailRequested, emailEnabled);
  const smsSummary = createChannelSummary(sendSmsRequested, smsEnabled);

  const baseMessage = buildReminderBaseMessage(appointment);
  const customMessage = options.customMessage?.trim();
  const fullMessage = customMessage ? `${baseMessage} ${customMessage}` : baseMessage;
  const smsMessage = fullMessage.length > 320 ? `${fullMessage.slice(0, 317)}...` : fullMessage;
  const triggerType = context.triggerType;
  const sentBy = context.sentBy ?? null;
  const jobId = context.jobId ?? null;

  if (sendEmailRequested) {
    emailSummary.attempted += 1;
    const recipientEmail = resolveEmailRecipient(appointment);

    if (!emailEnabled) {
      emailSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'email',
        triggerType,
        recipient: recipientEmail || appointment.contact_name || 'unknown',
        deliveryStatus: 'skipped',
        errorMessage: 'SMTP not configured',
        messagePreview: fullMessage,
        sentBy,
      });
    } else if (!recipientEmail) {
      emailSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'email',
        triggerType,
        recipient: appointment.contact_name || 'unknown',
        deliveryStatus: 'skipped',
        errorMessage: 'Missing recipient email',
        messagePreview: fullMessage,
        sentBy,
      });
    } else if (appointment.do_not_email) {
      emailSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'email',
        triggerType,
        recipient: recipientEmail,
        deliveryStatus: 'skipped',
        errorMessage: 'Contact opted out of email',
        messagePreview: fullMessage,
        sentBy,
      });
    } else {
      const greetingName = appointment.contact_name || 'there';
      const sent = await sendMail({
        to: recipientEmail,
        subject: buildReminderEmailSubject(appointment),
        text: [
          `Hi ${greetingName},`,
          '',
          fullMessage,
          '',
          'Please contact us if you need to reschedule.',
        ].join('\n'),
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
            <h2 style="color:#0f172a">Appointment Reminder</h2>
            <p>Hi ${greetingName},</p>
            <p>${fullMessage}</p>
            <p>Please contact us if you need to reschedule.</p>
          </div>
        `,
      });

      if (sent) {
        emailSummary.sent += 1;
      } else {
        emailSummary.failed += 1;
      }

      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'email',
        triggerType,
        recipient: recipientEmail,
        deliveryStatus: sent ? 'sent' : 'failed',
        errorMessage: sent ? null : 'Email send failed',
        messagePreview: fullMessage,
        sentBy,
      });
    }
  }

  if (sendSmsRequested) {
    smsSummary.attempted += 1;
    const recipientPhone = resolveSmsRecipient(appointment);

    if (!smsEnabled) {
      smsSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'sms',
        triggerType,
        recipient: recipientPhone || appointment.contact_name || 'unknown',
        deliveryStatus: 'skipped',
        errorMessage: 'Twilio not configured',
        messagePreview: smsMessage,
        sentBy,
      });
    } else if (!recipientPhone) {
      smsSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'sms',
        triggerType,
        recipient: appointment.contact_name || 'unknown',
        deliveryStatus: 'skipped',
        errorMessage: 'Missing recipient phone number',
        messagePreview: smsMessage,
        sentBy,
      });
    } else if (appointment.do_not_text) {
      smsSummary.skipped += 1;
      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'sms',
        triggerType,
        recipient: recipientPhone,
        deliveryStatus: 'skipped',
        errorMessage: 'Contact opted out of text messaging',
        messagePreview: smsMessage,
        sentBy,
      });
    } else {
      const smsResult = await sendSms({
        to: recipientPhone,
        body: smsMessage,
      });

      if (smsResult.success) {
        smsSummary.sent += 1;
      } else {
        smsSummary.failed += 1;
      }

      await recordDelivery({
        appointmentId,
        jobId,
        channel: 'sms',
        triggerType,
        recipient: smsResult.normalizedTo || recipientPhone,
        deliveryStatus: smsResult.success ? 'sent' : 'failed',
        errorMessage: smsResult.success ? null : smsResult.error || 'SMS send failed',
        messagePreview: smsMessage,
        sentBy,
      });
    }
  }

  return {
    appointmentId,
    appointmentStart: appointment.start_time,
    email: emailSummary,
    sms: smsSummary,
    warnings,
  };
}
