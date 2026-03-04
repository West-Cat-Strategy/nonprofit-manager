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
export type RegistrationStatus =
  | 'registered'
  | 'waitlisted'
  | 'cancelled'
  | 'confirmed'
  | 'no_show';

export interface Event {
  event_id: string;
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
  registration_status: RegistrationStatus;
  checked_in: boolean;
  check_in_time: string | null;
  checked_in_by: string | null;
  check_in_method: 'manual' | 'qr';
  check_in_token: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  contact_email?: string;
  event_name?: string;
}

export interface CreateRegistrationDTO {
  event_id: string;
  contact_id: string;
  registration_status?: RegistrationStatus;
  notes?: string;
}

export interface UpdateRegistrationDTO {
  registration_status?: RegistrationStatus;
  notes?: string;
}

export interface RegistrationFilters {
  registration_status?: RegistrationStatus;
  checked_in?: boolean;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  registration?: EventRegistration;
}

export interface EventCheckInSettings {
  event_id: string;
  public_checkin_enabled: boolean;
  public_checkin_pin_configured: boolean;
  public_checkin_pin_rotated_at: string | null;
}

export interface UpdateEventCheckInSettingsDTO {
  public_checkin_enabled: boolean;
}

export interface RotateEventCheckInPinResult extends EventCheckInSettings {
  pin: string;
}

export interface EventWalkInCheckInDTO {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  notes?: string;
  registration_status?: RegistrationStatus;
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
  location_name: string | null;
  public_checkin_enabled: boolean;
  public_checkin_pin_required: boolean;
  checkin_open: boolean;
  checkin_window_before_minutes: number;
  checkin_window_after_minutes: number;
}

export interface PublicEventCheckInDTO {
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
  timingType: EventReminderTimingType;
  relativeMinutesBefore?: number;
  absoluteSendAt?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  customMessage?: string;
  timezone?: string;
}

export interface UpdateEventReminderAutomationDTO {
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
