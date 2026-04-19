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

export type QueryValue = string | number | boolean | Date | null;

export const STALE_PROCESSING_TIMEOUT_MINUTES = 10;

export const CADENCE_MINUTES: Record<ReminderCadenceKey, number> = {
  '24h': 24 * 60,
  '2h': 2 * 60,
};

export const CADENCE_KEYS: ReminderCadenceKey[] = ['24h', '2h'];
export const CHANNELS: ReminderChannel[] = ['email', 'sms'];

export const APPOINTMENT_REMINDER_JOB_COLUMNS = [
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
export const APPOINTMENT_REMINDER_JOB_SELECT_COLUMNS = APPOINTMENT_REMINDER_JOB_COLUMNS.join(', ');
export const APPOINTMENT_REMINDER_JOB_RETURNING_COLUMNS = APPOINTMENT_REMINDER_JOB_COLUMNS.map(
  (column) => `j.${column}`
).join(', ');
export const APPOINTMENT_REMINDER_DELIVERY_COLUMNS = [
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

export interface AppointmentReminderContextRow {
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

export interface AppointmentReminderJobRow {
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

export interface ClaimedAppointmentReminderJobRow extends AppointmentReminderJobRow {
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

export interface AppointmentReminderDeliveryRow {
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

export const mapJobRow = (row: AppointmentReminderJobRow) => ({
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

export const mapClaimedJobRow = (row: ClaimedAppointmentReminderJobRow) => ({
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

export const mapDeliveryRow = (row: AppointmentReminderDeliveryRow) => ({
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

export const createChannelSummary = (
  requested: boolean,
  enabled: boolean
): {
  requested: boolean;
  enabled: boolean;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
} => ({
  requested,
  enabled,
  attempted: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
});

export const formatReminderDate = (date: Date): string =>
  new Date(date).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const buildReminderBaseMessage = (appointment: AppointmentReminderContextRow): string => {
  const locationLabel = appointment.location ? ` at ${appointment.location}` : '';
  return `Reminder: ${appointment.title} starts ${formatReminderDate(appointment.start_time)}${locationLabel}.`;
};

export const buildReminderEmailSubject = (appointment: AppointmentReminderContextRow): string =>
  `Reminder: ${appointment.title} on ${new Date(appointment.start_time).toLocaleDateString('en-US')}`;

export const computeSchedule = (startTime: Date) =>
  CADENCE_KEYS.map((cadenceKey) => ({
    cadenceKey,
    scheduledFor: new Date(startTime.getTime() - CADENCE_MINUTES[cadenceKey] * 60_000),
  }));

export const resolveEmailRecipient = (appointment: AppointmentReminderContextRow): string =>
  appointment.contact_email?.trim() || appointment.portal_email?.trim() || '';

export const resolveSmsRecipient = (appointment: AppointmentReminderContextRow): string =>
  appointment.mobile_phone || appointment.phone || '';
