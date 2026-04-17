/**
 * Event Type Definitions (Frontend)
 * Mirrors backend types but adjusted for frontend usage
 */

export type EventType =
  | 'fundraiser'
  | 'community'
  | 'training'
  | 'meeting'
  | 'workshop'
  | 'webinar'
  | 'conference'
  | 'outreach'
  | 'volunteer'
  | 'social'
  | 'other';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type EventStatus = 'planned' | 'active' | 'completed' | 'cancelled' | 'postponed';
export type EventBatchScope = 'occurrence' | 'future_occurrences' | 'series';
export type RegistrationStatus =
  | 'registered'
  | 'waitlisted'
  | 'cancelled'
  | 'confirmed'
  | 'no_show';
export type ConfirmationEmailStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface EventOccurrence {
  occurrence_id: string;
  event_id: string;
  series_id?: string | null;
  occurrence_index?: number | null;
  occurrence_name?: string | null;
  start_date: string;
  end_date: string;
  status: EventStatus;
  event_name?: string;
  description?: string | null;
  event_type?: EventType;
  is_public?: boolean;
  is_primary?: boolean;
  is_exception?: boolean;
  is_cancelled?: boolean;
  capacity: number | null;
  registered_count: number;
  attended_count: number;
  waitlist_enabled?: boolean;
  location_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  checkin_window_before_minutes?: number | null;
  checkin_window_after_minutes?: number | null;
  public_checkin_enabled?: boolean;
  public_checkin_pin_configured?: boolean;
  public_checkin_pin_required?: boolean;
  notes?: string | null;
}

export interface Event {
  event_id: string;
  occurrence_id?: string | null;
  event_name: string;
  description: string | null;
  event_type: EventType;
  status: EventStatus;
  is_public: boolean;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  start_date: string;
  end_date: string;
  series_id?: string | null;
  occurrence_count?: number | null;
  next_occurrence_id?: string | null;
  next_occurrence_start_date?: string | null;
  occurrences?: EventOccurrence[];
  location_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  capacity: number | null;
  registered_count: number;
  attended_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  modified_by: string;
}

export interface CreateEventDTO {
  event_name: string;
  description?: string;
  event_type: EventType;
  status?: EventStatus;
  is_public?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  start_date: string;
  end_date: string;
  location_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  capacity?: number;
}

export interface UpdateEventDTO {
  event_name?: string;
  description?: string;
  event_type?: EventType;
  status?: EventStatus;
  is_public?: boolean;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  start_date?: string;
  end_date?: string;
  location_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  capacity?: number;
}

export interface EventFilters {
  search?: string;
  event_type?: EventType;
  status?: EventStatus;
  is_public?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedEvents {
  data: Event[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface EventRegistration {
  registration_id: string;
  event_id: string;
  contact_id: string;
  case_id?: string | null;
  occurrence_id?: string | null;
  series_enrollment_id?: string | null;
  registration_status: RegistrationStatus;
  checked_in: boolean;
  check_in_time: string | null;
  checked_in_by: string | null;
  check_in_method: 'manual' | 'qr';
  check_in_token: string;
  confirmation_email_status?: ConfirmationEmailStatus | null;
  confirmation_email_sent_at?: string | null;
  confirmation_email_last_error?: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  contact_email?: string;
  event_name?: string;
  occurrence_name?: string | null;
}

export interface CreateRegistrationDTO {
  event_id: string;
  contact_id: string;
  case_id?: string;
  occurrence_id?: string;
  scope?: EventBatchScope;
  registration_status?: RegistrationStatus;
  notes?: string;
}

export interface UpdateRegistrationDTO {
  registration_status?: RegistrationStatus;
  case_id?: string | null;
  occurrence_id?: string | null;
  scope?: EventBatchScope;
  notes?: string;
}

export interface RegistrationFilters {
  registration_status?: RegistrationStatus;
  checked_in?: boolean;
  occurrence_id?: string;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  registration?: EventRegistration;
}

export interface EventConfirmationEmailResult {
  registration_id: string;
  event_id: string;
  occurrence_id?: string | null;
  status: ConfirmationEmailStatus;
  message: string;
  sent_at: string | null;
  qr_code_url?: string | null;
}

export interface EventCheckInSettings {
  event_id: string;
  occurrence_id?: string | null;
  public_checkin_enabled: boolean;
  public_checkin_pin_configured: boolean;
  public_checkin_pin_rotated_at: string | null;
}

export interface UpdateEventCheckInSettingsDTO {
  occurrence_id?: string;
  public_checkin_enabled: boolean;
}

export interface RotateEventCheckInPinResult extends EventCheckInSettings {
  pin: string;
}

export interface EventWalkInCheckInDTO {
  occurrence_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  notes?: string;
  registration_status?: RegistrationStatus;
  send_confirmation_email?: boolean;
}

export interface EventWalkInCheckInResult {
  status: 'created_and_checked_in' | 'existing_checked_in' | 'already_checked_in';
  contact_id: string;
  registration: EventRegistration;
  created_contact: boolean;
  created_registration: boolean;
}

export interface PublicEventCheckInInfo {
  event_id: string;
  event_name: string;
  description: string | null;
  event_type: EventType;
  status: EventStatus;
  start_date: string;
  end_date: string;
  occurrence_id?: string | null;
  series_id?: string | null;
  series_name?: string | null;
  occurrence_name?: string | null;
  occurrence_label?: string | null;
  occurrence_index?: number | null;
  occurrence_count?: number | null;
  occurrence_start_date?: string | null;
  occurrence_end_date?: string | null;
  location_name: string | null;
  public_checkin_enabled: boolean;
  public_checkin_pin_required: boolean;
  checkin_open: boolean;
  checkin_window_before_minutes: number;
  checkin_window_after_minutes: number;
}

export interface PublicEventCheckInDTO {
  occurrence_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  pin: string;
}

export interface PublicEventCheckInResult {
  status: 'checked_in' | 'already_checked_in';
  contact_id: string;
  registration: EventRegistration;
  created_contact: boolean;
  created_registration: boolean;
}

export interface PublicEventsQuery {
  search?: string;
  event_type?: EventType;
  include_past?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: 'start_date' | 'name' | 'created_at';
  sort_order?: 'asc' | 'desc';
  site?: string;
}

export interface PublicEventListItem {
  event_id: string;
  event_name: string;
  description: string | null;
  event_type: EventType;
  status: EventStatus;
  start_date: string;
  end_date: string;
  occurrence_id?: string | null;
  series_id?: string | null;
  series_name?: string | null;
  occurrence_name?: string | null;
  occurrence_label?: string | null;
  occurrence_index?: number | null;
  occurrence_count?: number | null;
  occurrence_start_date?: string | null;
  occurrence_end_date?: string | null;
  location_name: string | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  capacity: number | null;
  registered_count: number;
}

export interface PublicEventsPageInfo {
  limit: number;
  offset: number;
  total: number;
  has_more: boolean;
}

export interface PublicEventsSiteInfo {
  id: string;
  name: string;
  subdomain: string | null;
  customDomain: string | null;
}

export interface PublicEventsListResult {
  items: PublicEventListItem[];
  page: PublicEventsPageInfo;
  site: PublicEventsSiteInfo;
}

export interface SendEventRemindersDTO {
  occurrence_id?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  customMessage?: string;
}

export interface ReminderChannelSummary {
  requested: boolean;
  enabled: boolean;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface EventReminderSummary {
  eventId: string;
  eventName: string;
  eventStartDate: string;
  occurrence_id?: string | null;
  totalRegistrations: number;
  eligibleRegistrations: number;
  email: ReminderChannelSummary;
  sms: ReminderChannelSummary;
  warnings: string[];
}

export type ReminderTriggerType = 'manual' | 'automated';
export type EventReminderTimingType = 'relative' | 'absolute';
export type EventReminderAttemptStatus =
  | 'sent'
  | 'partial'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export interface EventReminderAutomation {
  id: string;
  event_id: string;
  occurrence_id?: string | null;
  timing_type: EventReminderTimingType;
  relative_minutes_before: number | null;
  absolute_send_at: string | null;
  send_email: boolean;
  send_sms: boolean;
  custom_message: string | null;
  timezone: string;
  is_active: boolean;
  processing_started_at: string | null;
  attempted_at: string | null;
  attempt_status: EventReminderAttemptStatus | null;
  attempt_summary: Record<string, unknown> | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  modified_by: string | null;
}

export interface CreateEventReminderAutomationDTO {
  occurrenceId?: string;
  timingType: EventReminderTimingType;
  relativeMinutesBefore?: number;
  absoluteSendAt?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  customMessage?: string;
  timezone?: string;
}

export interface UpdateEventReminderAutomationDTO {
  occurrenceId?: string;
  timingType?: EventReminderTimingType;
  relativeMinutesBefore?: number;
  absoluteSendAt?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  customMessage?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface SyncEventReminderAutomationsDTO {
  items: CreateEventReminderAutomationDTO[];
}
