/**
 * Event Type Definitions
 * Aligned with Microsoft Common Data Model (CDM) Campaign/Event entity
 */

export enum EventType {
  FUNDRAISER = 'fundraiser',
  COMMUNITY = 'community',
  TRAINING = 'training',
  MEETING = 'meeting',
  VOLUNTEER = 'volunteer',
  SOCIAL = 'social',
  OTHER = 'other',
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
  start_date?: Date;
  end_date?: Date;
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
