/**
 * Contact Type Definitions
 * Aligned with Microsoft Common Data Model (CDM) Contact entity
 */

export enum ContactRole {
  PRIMARY = 'primary',
  BILLING = 'billing',
  TECHNICAL = 'technical',
  GENERAL = 'general',
}

export interface Contact {
  contact_id: string;
  account_id: string | null;
  contact_role: ContactRole;

  // Name fields
  first_name: string;
  last_name: string;
  middle_name: string | null;
  salutation: string | null;
  suffix: string | null;

  // Contact information
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;

  // Address fields
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;

  // Additional information
  job_title: string | null;
  department: string | null;
  preferred_contact_method: string | null;
  do_not_email: boolean;
  do_not_phone: boolean;
  notes: string | null;

  // Lifecycle tracking
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  modified_by: string;

  // Related account info (for joins)
  account_name?: string;
}

export interface CreateContactDTO {
  account_id?: string;
  contact_role?: ContactRole;
  first_name: string;
  last_name: string;
  middle_name?: string;
  salutation?: string;
  suffix?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  job_title?: string;
  department?: string;
  preferred_contact_method?: string;
  do_not_email?: boolean;
  do_not_phone?: boolean;
  notes?: string;
}

export interface UpdateContactDTO {
  account_id?: string;
  contact_role?: ContactRole;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  salutation?: string;
  suffix?: string;
  email?: string;
  phone?: string;
  mobile_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  job_title?: string;
  department?: string;
  preferred_contact_method?: string;
  do_not_email?: boolean;
  do_not_phone?: boolean;
  notes?: string;
  is_active?: boolean;
}

export interface ContactFilters {
  search?: string;
  account_id?: string;
  contact_role?: ContactRole;
  is_active?: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedContacts {
  data: Contact[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
