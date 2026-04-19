export type ReminderChannel = 'email' | 'sms';
export type ReminderTriggerType = 'manual' | 'automated';
export type ReminderCadenceKey = '24h' | '2h';
export type ReminderJobStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'skipped'
  | 'cancelled';
export type DeliveryStatus = 'sent' | 'failed' | 'skipped';

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
