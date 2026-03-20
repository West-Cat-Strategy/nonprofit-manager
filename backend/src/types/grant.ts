export const GRANT_JURISDICTIONS = [
  'federal',
  'provincial',
  'territorial',
  'municipal',
  'private',
  'foundation',
  'other',
] as const;

export type GrantJurisdiction = (typeof GRANT_JURISDICTIONS)[number];

export const GRANT_PROGRAM_STATUSES = ['draft', 'open', 'closed', 'archived'] as const;
export type GrantProgramStatus = (typeof GRANT_PROGRAM_STATUSES)[number];

export const GRANT_RECIPIENT_STATUSES = ['active', 'inactive', 'archived'] as const;
export type GrantRecipientStatus = (typeof GRANT_RECIPIENT_STATUSES)[number];

export const GRANT_FUNDING_FREQUENCIES = [
  'monthly',
  'quarterly',
  'semiannual',
  'annual',
  'ad_hoc',
] as const;
export type GrantReportingFrequency = (typeof GRANT_FUNDING_FREQUENCIES)[number];

export const GRANT_APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'declined',
  'withdrawn',
] as const;
export type GrantApplicationStatus = (typeof GRANT_APPLICATION_STATUSES)[number];

export const GRANT_AWARD_STATUSES = [
  'active',
  'on_hold',
  'completed',
  'closed',
  'expired',
] as const;
export type GrantAwardStatus = (typeof GRANT_AWARD_STATUSES)[number];

export const GRANT_DISBURSEMENT_STATUSES = [
  'scheduled',
  'pending',
  'paid',
  'failed',
  'cancelled',
] as const;
export type GrantDisbursementStatus = (typeof GRANT_DISBURSEMENT_STATUSES)[number];

export const GRANT_REPORT_STATUSES = [
  'draft',
  'due',
  'submitted',
  'reviewed',
  'overdue',
  'accepted',
  'rejected',
] as const;
export type GrantReportStatus = (typeof GRANT_REPORT_STATUSES)[number];

export const GRANT_ENTITY_TYPES = [
  'funder',
  'program',
  'recipient',
  'funded_program',
  'application',
  'award',
  'disbursement',
  'report',
  'document',
] as const;
export type GrantEntityType = (typeof GRANT_ENTITY_TYPES)[number];

export interface GrantFunder {
  id: string;
  organization_id: string;
  name: string;
  jurisdiction: GrantJurisdiction;
  funder_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  active: boolean;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
  grant_count?: number;
  total_amount?: number;
}

export interface GrantProgram {
  id: string;
  organization_id: string;
  funder_id: string;
  funder_name?: string | null;
  name: string;
  program_code: string | null;
  fiscal_year: string | null;
  jurisdiction: GrantJurisdiction;
  status: GrantProgramStatus;
  application_open_at: string | null;
  application_due_at: string | null;
  award_date: string | null;
  expiry_date: string | null;
  total_budget: number | null;
  notes: string | null;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
  grant_count?: number;
  total_amount?: number;
}

export interface RecipientOrganization {
  id: string;
  organization_id: string;
  name: string;
  legal_name: string | null;
  jurisdiction: GrantJurisdiction | null;
  province: string | null;
  city: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  status: GrantRecipientStatus;
  notes: string | null;
  active: boolean;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
  funded_program_count?: number;
  grant_count?: number;
  total_amount?: number;
}

export interface FundedProgram {
  id: string;
  organization_id: string;
  recipient_organization_id: string;
  recipient_name?: string | null;
  name: string;
  description: string | null;
  owner_user_id: string | null;
  owner_name?: string | null;
  status: 'planned' | 'active' | 'paused' | 'complete' | 'archived';
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  notes: string | null;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
  grant_count?: number;
  total_amount?: number;
}

export interface GrantApplication {
  id: string;
  organization_id: string;
  application_number: string;
  title: string;
  funder_id: string;
  funder_name?: string | null;
  program_id: string | null;
  program_name?: string | null;
  recipient_organization_id: string | null;
  recipient_name?: string | null;
  funded_program_id: string | null;
  funded_program_name?: string | null;
  grant_id: string | null;
  status: GrantApplicationStatus;
  requested_amount: number;
  approved_amount: number | null;
  currency: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  decision_at: string | null;
  due_at: string | null;
  outcome_reason: string | null;
  notes: string | null;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantAward {
  id: string;
  organization_id: string;
  grant_number: string;
  title: string;
  application_id: string | null;
  funder_id: string;
  funder_name?: string | null;
  program_id: string | null;
  program_name?: string | null;
  recipient_organization_id: string | null;
  recipient_name?: string | null;
  funded_program_id: string | null;
  funded_program_name?: string | null;
  status: GrantAwardStatus;
  amount: number;
  committed_amount: number;
  disbursed_amount: number;
  currency: string;
  fiscal_year: string | null;
  jurisdiction: GrantJurisdiction;
  award_date: string | null;
  start_date: string | null;
  end_date: string | null;
  expiry_date: string | null;
  reporting_frequency: GrantReportingFrequency | null;
  next_report_due_at: string | null;
  closeout_due_at: string | null;
  notes: string | null;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
  outstanding_amount?: number;
  report_count?: number;
  disbursement_count?: number;
}

export interface GrantDisbursement {
  id: string;
  organization_id: string;
  grant_id: string;
  grant_number?: string | null;
  grant_title?: string | null;
  tranche_label: string | null;
  scheduled_date: string | null;
  paid_at: string | null;
  amount: number;
  currency: string;
  status: GrantDisbursementStatus;
  method: string | null;
  notes: string | null;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantReport {
  id: string;
  organization_id: string;
  grant_id: string;
  grant_number?: string | null;
  grant_title?: string | null;
  report_type: string;
  period_start: string | null;
  period_end: string | null;
  due_at: string;
  submitted_at: string | null;
  status: GrantReportStatus;
  summary: string | null;
  outstanding_items: string | null;
  notes: string | null;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantDocument {
  id: string;
  organization_id: string;
  grant_id: string | null;
  application_id: string | null;
  report_id: string | null;
  document_type: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  notes: string | null;
  uploaded_by: string | null;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrantActivityLog {
  id: string;
  organization_id: string;
  grant_id: string | null;
  entity_type: GrantEntityType | string;
  entity_id: string | null;
  action: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface GrantCalendarItem {
  id: string;
  grant_id: string;
  grant_number: string;
  grant_title: string;
  item_type: 'report' | 'disbursement' | 'application';
  status: string;
  due_at: string;
  amount: number | null;
  recipient_name: string | null;
  program_name: string | null;
}

export interface GrantStatusBreakdownItem {
  status: string;
  count: number;
  amount: number;
}

export interface GrantSummary {
  total_funders: number;
  total_programs: number;
  total_recipients: number;
  total_funded_programs: number;
  total_applications: number;
  draft_applications: number;
  submitted_applications: number;
  approved_applications: number;
  declined_applications: number;
  total_awards: number;
  active_awards: number;
  total_awarded_amount: number;
  committed_amount: number;
  total_disbursed_amount: number;
  outstanding_amount: number;
  overdue_reports: number;
  upcoming_reports: number;
  upcoming_disbursements: number;
  by_status: GrantStatusBreakdownItem[];
  by_jurisdiction: GrantStatusBreakdownItem[];
  recent_activity: GrantActivityLog[];
  upcoming_items: GrantCalendarItem[];
}

export interface GrantPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedGrantResult<T> {
  data: T[];
  pagination: GrantPagination;
}

export interface GrantListFilters {
  search?: string;
  status?: string;
  funder_id?: string;
  program_id?: string;
  recipient_organization_id?: string;
  funded_program_id?: string;
  jurisdiction?: GrantJurisdiction;
  fiscal_year?: string;
  due_before?: string;
  due_after?: string;
  min_amount?: number;
  max_amount?: number;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateGrantFunderDTO {
  name: string;
  jurisdiction: GrantJurisdiction;
  funder_type?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  notes?: string | null;
  active?: boolean;
}

export interface UpdateGrantFunderDTO {
  name?: string;
  jurisdiction?: GrantJurisdiction;
  funder_type?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  notes?: string | null;
  active?: boolean;
}

export interface CreateGrantProgramDTO {
  funder_id: string;
  name: string;
  program_code?: string | null;
  fiscal_year?: string | null;
  jurisdiction: GrantJurisdiction;
  status?: GrantProgramStatus;
  application_open_at?: string | null;
  application_due_at?: string | null;
  award_date?: string | null;
  expiry_date?: string | null;
  total_budget?: number | null;
  notes?: string | null;
}

export interface UpdateGrantProgramDTO {
  funder_id?: string;
  name?: string;
  program_code?: string | null;
  fiscal_year?: string | null;
  jurisdiction?: GrantJurisdiction;
  status?: GrantProgramStatus;
  application_open_at?: string | null;
  application_due_at?: string | null;
  award_date?: string | null;
  expiry_date?: string | null;
  total_budget?: number | null;
  notes?: string | null;
}

export interface CreateRecipientOrganizationDTO {
  name: string;
  legal_name?: string | null;
  jurisdiction?: GrantJurisdiction | null;
  province?: string | null;
  city?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  status?: GrantRecipientStatus;
  notes?: string | null;
  active?: boolean;
}

export interface UpdateRecipientOrganizationDTO {
  name?: string;
  legal_name?: string | null;
  jurisdiction?: GrantJurisdiction | null;
  province?: string | null;
  city?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;
  status?: GrantRecipientStatus;
  notes?: string | null;
  active?: boolean;
}

export interface CreateFundedProgramDTO {
  recipient_organization_id: string;
  name: string;
  description?: string | null;
  owner_user_id?: string | null;
  status?: 'planned' | 'active' | 'paused' | 'complete' | 'archived';
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  notes?: string | null;
}

export interface UpdateFundedProgramDTO {
  recipient_organization_id?: string;
  name?: string;
  description?: string | null;
  owner_user_id?: string | null;
  status?: 'planned' | 'active' | 'paused' | 'complete' | 'archived';
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  notes?: string | null;
}

export interface CreateGrantApplicationDTO {
  application_number?: string | null;
  title: string;
  funder_id: string;
  program_id?: string | null;
  recipient_organization_id?: string | null;
  funded_program_id?: string | null;
  status?: GrantApplicationStatus;
  requested_amount: number;
  approved_amount?: number | null;
  currency?: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  decision_at?: string | null;
  due_at?: string | null;
  outcome_reason?: string | null;
  notes?: string | null;
}

export interface UpdateGrantApplicationDTO {
  application_number?: string | null;
  title?: string;
  funder_id?: string;
  program_id?: string | null;
  recipient_organization_id?: string | null;
  funded_program_id?: string | null;
  status?: GrantApplicationStatus;
  requested_amount?: number;
  approved_amount?: number | null;
  currency?: string;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  decision_at?: string | null;
  due_at?: string | null;
  outcome_reason?: string | null;
  notes?: string | null;
}

export interface CreateGrantAwardDTO {
  grant_number?: string | null;
  title: string;
  application_id?: string | null;
  funder_id: string;
  program_id?: string | null;
  recipient_organization_id?: string | null;
  funded_program_id?: string | null;
  status?: GrantAwardStatus;
  amount: number;
  committed_amount?: number;
  currency?: string;
  fiscal_year?: string | null;
  jurisdiction: GrantJurisdiction;
  award_date?: string | null;
  reviewed_at?: string | null;
  decision_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  expiry_date?: string | null;
  reporting_frequency?: GrantReportingFrequency | null;
  next_report_due_at?: string | null;
  closeout_due_at?: string | null;
  notes?: string | null;
}

export interface UpdateGrantAwardDTO {
  grant_number?: string | null;
  title?: string;
  application_id?: string | null;
  funder_id?: string;
  program_id?: string | null;
  recipient_organization_id?: string | null;
  funded_program_id?: string | null;
  status?: GrantAwardStatus;
  amount?: number;
  committed_amount?: number;
  disbursed_amount?: number;
  currency?: string;
  fiscal_year?: string | null;
  jurisdiction?: GrantJurisdiction;
  award_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  expiry_date?: string | null;
  reporting_frequency?: GrantReportingFrequency | null;
  next_report_due_at?: string | null;
  closeout_due_at?: string | null;
  notes?: string | null;
}

export interface CreateGrantDisbursementDTO {
  grant_id: string;
  tranche_label?: string | null;
  scheduled_date?: string | null;
  paid_at?: string | null;
  amount: number;
  currency?: string;
  status?: GrantDisbursementStatus;
  method?: string | null;
  notes?: string | null;
}

export interface UpdateGrantDisbursementDTO {
  grant_id?: string;
  tranche_label?: string | null;
  scheduled_date?: string | null;
  paid_at?: string | null;
  amount?: number;
  currency?: string;
  status?: GrantDisbursementStatus;
  method?: string | null;
  notes?: string | null;
}

export interface CreateGrantReportDTO {
  grant_id: string;
  report_type?: string;
  period_start?: string | null;
  period_end?: string | null;
  due_at: string;
  submitted_at?: string | null;
  status?: GrantReportStatus;
  summary?: string | null;
  outstanding_items?: string | null;
  notes?: string | null;
}

export interface UpdateGrantReportDTO {
  grant_id?: string;
  report_type?: string;
  period_start?: string | null;
  period_end?: string | null;
  due_at?: string;
  submitted_at?: string | null;
  status?: GrantReportStatus;
  summary?: string | null;
  outstanding_items?: string | null;
  notes?: string | null;
}

export interface CreateGrantDocumentDTO {
  grant_id?: string | null;
  application_id?: string | null;
  report_id?: string | null;
  document_type: string;
  file_name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  notes?: string | null;
  uploaded_by?: string | null;
}

export interface UpdateGrantDocumentDTO {
  grant_id?: string | null;
  application_id?: string | null;
  report_id?: string | null;
  document_type?: string;
  file_name?: string;
  file_url?: string;
  mime_type?: string;
  file_size?: number;
  notes?: string | null;
  uploaded_by?: string | null;
}

export interface CreateGrantActivityLogDTO {
  grant_id?: string | null;
  entity_type: GrantEntityType | string;
  entity_id?: string | null;
  action: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
}
