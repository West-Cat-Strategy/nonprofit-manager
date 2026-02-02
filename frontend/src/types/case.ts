// Case Management Types
// Frontend types matching backend case management system

export type CasePriority = 'low' | 'medium' | 'high' | 'urgent';
export type CaseSource = 'phone' | 'email' | 'walk-in' | 'referral' | 'web' | 'other';
export type CaseOutcome = 'successful' | 'unsuccessful' | 'referred' | 'withdrawn' | 'other';
export type CaseStatusType = 'intake' | 'active' | 'review' | 'closed' | 'cancelled';
export type NoteType = 'note' | 'email' | 'call' | 'meeting' | 'update' | 'status_change';

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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

/**
 * Main Case Record
 */
export interface Case {
  id: string;
  case_number: string;
  contact_id: string;
  account_id?: string | null;
  case_type_id: string;
  status_id: string;
  priority: CasePriority;
  title: string;
  description?: string | null;
  source?: CaseSource | null;
  referral_source?: string | null;
  intake_date: string;
  opened_date?: string | null;
  closed_date?: string | null;
  due_date?: string | null;
  assigned_to?: string | null;
  assigned_team?: string | null;
  outcome?: CaseOutcome | null;
  outcome_notes?: string | null;
  closure_reason?: string | null;
  intake_data?: Record<string, any> | null;
  custom_data?: Record<string, any> | null;
  is_urgent: boolean;
  requires_followup: boolean;
  followup_date?: string | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  modified_by?: string | null;
}

/**
 * Case with related data
 */
export interface CaseWithDetails extends Case {
  case_type_name?: string;
  case_type_color?: string;
  case_type_icon?: string;
  status_name?: string;
  status_color?: string;
  status_type?: CaseStatusType;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_email?: string;
  contact_phone?: string;
  assigned_first_name?: string;
  assigned_last_name?: string;
  assigned_email?: string;
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
  created_at: string;
  created_by?: string | null;
  first_name?: string;
  last_name?: string;
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
  due_date?: string;
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
  due_date?: string;
  outcome?: CaseOutcome;
  outcome_notes?: string;
  closure_reason?: string;
  custom_data?: Record<string, any>;
  tags?: string[];
  is_urgent?: boolean;
  requires_followup?: boolean;
  followup_date?: string;
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
  intake_start_date?: string;
  intake_end_date?: string;
  due_date_start?: string;
  due_date_end?: string;
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

/**
 * Redux State Types
 */
export interface CasesState {
  cases: CaseWithDetails[];
  currentCase: CaseWithDetails | null;
  caseTypes: CaseType[];
  caseStatuses: CaseStatus[];
  caseNotes: CaseNote[];
  summary: CaseSummary | null;
  total: number;
  loading: boolean;
  error: string | null;
  filters: CaseFilter;
}

/**
 * API Response Types
 */
export interface CasesResponse {
  cases: CaseWithDetails[];
  total: number;
  pagination: {
    page: number;
    limit: number;
  };
}

export interface CaseTypesResponse {
  types: CaseType[];
}

export interface CaseStatusesResponse {
  statuses: CaseStatus[];
}

export interface CaseNotesResponse {
  notes: CaseNote[];
}
