// Case Management Types
// Defines types for comprehensive case management system

export type CasePriority = 'low' | 'medium' | 'high' | 'urgent';
export type CaseSource = 'phone' | 'email' | 'walk-in' | 'referral' | 'web' | 'other';
export type CaseOutcome = 'successful' | 'unsuccessful' | 'referred' | 'withdrawn' | 'other';
export type CaseStatusType = 'intake' | 'active' | 'review' | 'closed' | 'cancelled';
export type NoteType = 'note' | 'email' | 'call' | 'meeting' | 'update' | 'status_change';
export type DocumentType = 'intake' | 'assessment' | 'consent' | 'report' | 'correspondence' | 'other';
export type AccessLevel = 'public' | 'standard' | 'restricted' | 'confidential';
export type RelationshipType = 'duplicate' | 'related' | 'parent' | 'child' | 'blocked_by' | 'blocks';
export type ServiceType = 'counseling' | 'legal' | 'financial' | 'housing' | 'healthcare' | 'education' | 'employment' | 'other';
export type ServiceStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

/**
 * Case Type Definition
 */
export interface CaseType {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active: boolean;
  requires_intake: boolean;
  average_duration_days?: number | null;
  custom_fields?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;
  created_by?: string | null;
  modified_by?: string | null;
}

/**
 * Case Status Definition
 */
export interface CaseStatus {
  id: string;
  name: string;
  status_type: CaseStatusType;
  description?: string | null;
  color?: string | null;
  sort_order: number;
  is_active: boolean;
  can_transition_to?: string[] | null;
  requires_reason: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Main Case Record
 */
export interface Case {
  id: string;
  case_number: string;

  // Relationships
  contact_id: string;
  account_id?: string | null;

  // Case details
  case_type_id: string;
  status_id: string;
  priority: CasePriority;

  // Information
  title: string;
  description?: string | null;
  source?: CaseSource | null;
  referral_source?: string | null;

  // Dates
  intake_date: Date | string;
  opened_date?: Date | string | null;
  closed_date?: Date | string | null;
  due_date?: Date | string | null;

  // Assignment
  assigned_to?: string | null;
  assigned_team?: string | null;

  // Outcome
  outcome?: CaseOutcome | null;
  outcome_notes?: string | null;
  closure_reason?: string | null;

  // Custom data
  intake_data?: Record<string, any> | null;
  custom_data?: Record<string, any> | null;

  // Flags
  is_urgent: boolean;
  requires_followup: boolean;
  followup_date?: Date | string | null;

  // Tags
  tags?: string[] | null;

  // Metadata
  created_at: Date | string;
  updated_at: Date | string;
  created_by?: string | null;
  modified_by?: string | null;
}

/**
 * Case with related data
 */
export interface CaseWithDetails extends Case {
  case_type?: CaseType;
  status?: CaseStatus;
  contact?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  assigned_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  notes_count?: number;
  documents_count?: number;
  services_count?: number;
}

/**
 * Case Note
 */
export interface CaseNote {
  id: string;
  case_id: string;
  note_type: NoteType;
  subject?: string | null;
  content: string;
  is_internal: boolean;
  is_important: boolean;
  previous_status_id?: string | null;
  new_status_id?: string | null;
  attachments?: any[] | null;
  created_at: Date | string;
  created_by?: string | null;
  creator?: {
    first_name: string;
    last_name: string;
  };
}

/**
 * Case Assignment
 */
export interface CaseAssignment {
  id: string;
  case_id: string;
  assigned_from?: string | null;
  assigned_to: string;
  assignment_reason?: string | null;
  assigned_at: Date | string;
  assigned_by?: string | null;
  unassigned_at?: Date | string | null;
  unassigned_by?: string | null;
}

/**
 * Case Document
 */
export interface CaseDocument {
  id: string;
  case_id: string;
  document_name: string;
  document_type?: DocumentType | null;
  description?: string | null;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  is_confidential: boolean;
  access_level: AccessLevel;
  version: number;
  parent_document_id?: string | null;
  uploaded_at: Date | string;
  uploaded_by?: string | null;
}

/**
 * Case Relationship
 */
export interface CaseRelationship {
  id: string;
  case_id: string;
  related_case_id: string;
  relationship_type: RelationshipType;
  description?: string | null;
  created_at: Date | string;
  created_by?: string | null;
}

/**
 * Case Service
 */
export interface CaseService {
  id: string;
  case_id: string;
  service_name: string;
  service_type?: ServiceType | null;
  service_provider?: string | null;
  service_date: Date | string;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  status: ServiceStatus;
  outcome?: string | null;
  cost?: number | null;
  currency: string;
  notes?: string | null;
  created_at: Date | string;
  created_by?: string | null;
}

/**
 * Case Milestone
 */
export interface CaseMilestone {
  id: string;
  case_id: string;
  milestone_name: string;
  description?: string | null;
  due_date?: Date | string | null;
  completed_date?: Date | string | null;
  is_completed: boolean;
  sort_order: number;
  created_at: Date | string;
  created_by?: string | null;
}

/**
 * Create Case DTO
 */
export interface CreateCaseDTO {
  contact_id: string;
  account_id?: string;
  case_type_id: string;
  title: string;
  description?: string;
  priority?: CasePriority;
  source?: CaseSource;
  referral_source?: string;
  assigned_to?: string;
  assigned_team?: string;
  due_date?: Date | string;
  intake_data?: Record<string, any>;
  custom_data?: Record<string, any>;
  tags?: string[];
  is_urgent?: boolean;
}

/**
 * Update Case DTO
 */
export interface UpdateCaseDTO {
  title?: string;
  description?: string;
  priority?: CasePriority;
  assigned_to?: string;
  assigned_team?: string;
  due_date?: Date | string;
  outcome?: CaseOutcome;
  outcome_notes?: string;
  closure_reason?: string;
  custom_data?: Record<string, any>;
  tags?: string[];
  is_urgent?: boolean;
  requires_followup?: boolean;
  followup_date?: Date | string;
}

/**
 * Case Filter Parameters
 */
export interface CaseFilter {
  search?: string;
  contact_id?: string;
  account_id?: string;
  case_type_id?: string;
  status_id?: string;
  priority?: CasePriority;
  assigned_to?: string;
  assigned_team?: string;
  is_urgent?: boolean;
  requires_followup?: boolean;
  tags?: string[];
  intake_start_date?: Date | string;
  intake_end_date?: Date | string;
  due_date_start?: Date | string;
  due_date_end?: Date | string;
  quick_filter?: 'overdue' | 'due_soon' | 'unassigned' | 'urgent';
  due_within_days?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Case Summary Statistics
 */
export interface CaseSummary {
  total_cases: number;
  open_cases: number;
  closed_cases: number;
  by_priority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  by_status_type: {
    intake: number;
    active: number;
    review: number;
    closed: number;
    cancelled: number;
  };
  by_case_type: Record<string, number>;
  average_case_duration_days?: number;
  cases_due_this_week: number;
  overdue_cases: number;
  unassigned_cases: number;
}

/**
 * Create Case Note DTO
 */
export interface CreateCaseNoteDTO {
  case_id: string;
  note_type: NoteType;
  subject?: string;
  content: string;
  is_internal?: boolean;
  is_important?: boolean;
  attachments?: any[];
}

/**
 * Update Case Status DTO
 */
export interface UpdateCaseStatusDTO {
  new_status_id: string;
  reason?: string;
  notes?: string;
}
