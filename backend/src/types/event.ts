/**
 * Event Type Definitions
 * Aligned with Microsoft Common Data Model (CDM) Campaign/Event entity
 */

export enum EventType {
  FUNDRAISER = 'fundraiser',
  COMMUNITY = 'community',
  TRAINING = 'training',
  MEETING = 'meeting',
  WORKSHOP = 'workshop',
  WEBINAR = 'webinar',
  CONFERENCE = 'conference',
  OUTREACH = 'outreach',
  VOLUNTEER = 'volunteer',
  SOCIAL = 'social',
  OTHER = 'other',
}

export enum RecurrencePattern {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum EventStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

export enum RegistrationStatus {
  REGISTERED = 'registered',
  WAITLISTED = 'waitlisted',
  CANCELLED = 'cancelled',
  CONFIRMED = 'confirmed',
  NO_SHOW = 'no_show',
}

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
  recurrence_end_date: Date | null;
  start_date: Date;
  end_date: Date;

  // Location fields
  location_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;

  // Capacity tracking
  capacity: number | null;
  registered_count: number;
  attended_count: number;

  // Lifecycle tracking
  created_at: Date;
  updated_at: Date;
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
  recurrence_end_date?: Date;
  start_date: Date;
  end_date: Date;
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
  recurrence_end_date?: Date;
  start_date?: Date;
  end_date?: Date;
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
  start_date?: Date;
  end_date?: Date;
}

export type { PaginationParams } from './pagination';

export interface PaginatedEvents {
  data: Event[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// Event Registration Types
export interface EventRegistration {
  registration_id: string;
  event_id: string;
  contact_id: string;
  registration_status: RegistrationStatus;
  checked_in: boolean;
  check_in_time: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;

  // Related info (for joins)
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
  checked_in?: boolean;
  check_in_time?: Date;
  notes?: string;
}

export interface RegistrationFilters {
  event_id?: string;
  contact_id?: string;
  registration_status?: RegistrationStatus;
  checked_in?: boolean;
}

export interface CheckInResult {
  success: boolean;
  message: string;
  registration?: EventRegistration;
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
  eventStartDate: Date;
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
  absolute_send_at: Date | null;
  send_email: boolean;
  send_sms: boolean;
  custom_message: string | null;
  timezone: string;
  is_active: boolean;
  processing_started_at: Date | null;
  attempted_at: Date | null;
  attempt_status: EventReminderAttemptStatus | null;
  attempt_summary: Record<string, unknown> | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  modified_by: string | null;
}

export interface CreateEventReminderAutomationDTO {
  timingType: EventReminderTimingType;
  relativeMinutesBefore?: number;
  absoluteSendAt?: Date;
  sendEmail?: boolean;
  sendSms?: boolean;
  customMessage?: string;
  timezone?: string;
}

export interface UpdateEventReminderAutomationDTO {
  timingType?: EventReminderTimingType;
  relativeMinutesBefore?: number;
  absoluteSendAt?: Date;
  sendEmail?: boolean;
  sendSms?: boolean;
  customMessage?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface SyncEventReminderAutomationsDTO {
  items: CreateEventReminderAutomationDTO[];
}

export interface SendEventRemindersContext {
  triggerType?: ReminderTriggerType;
  automationId?: string | null;
  sentBy?: string | null;
}
