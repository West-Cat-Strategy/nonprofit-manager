// Case Management Types
// Frontend types matching backend case management system

import type {
  InteractionOutcomeImpact,
  InteractionOutcomeImpactInput,
  OutcomeDefinition,
  OutcomeUpdateMode,
} from './outcomes';
import type { MessageSendState } from '../features/messaging/types';

export type CasePriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
export type CaseSource = 'phone' | 'email' | 'walk-in' | 'referral' | 'web' | 'other';
export type CaseOutcome =
  | 'successful'
  | 'unsuccessful'
  | 'referred'
  | 'withdrawn'
  | 'attended_event'
  | 'additional_related_case'
  | 'other';
export type CaseStatusType = 'intake' | 'active' | 'review' | 'closed' | 'cancelled';
export type CaseSourceEntityType =
  | 'case_note'
  | 'contact_note'
  | 'appointment'
  | 'follow_up'
  | 'portal_thread'
  | 'case_status'
  | 'manual';
export type CaseOutcomeWorkflowStage =
  | 'interaction'
  | 'conversation'
  | 'appointment'
  | 'follow_up'
  | 'case_status'
  | 'manual'
  | 'legacy';
export type NoteType =
  | 'note'
  | 'email'
  | 'call'
  | 'meeting'
  | 'update'
  | 'status_change'
  | 'case_note'
  | 'assignment'
  | 'system'
  | 'portal_message';

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
  custom_fields?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CaseTypeAssignment {
  id: string;
  case_id: string;
  case_type_id: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
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
  case_type_ids?: string[] | null;
  case_type_names?: string[] | null;
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
  case_outcome_values?: CaseOutcome[] | null;
  outcome_notes?: string | null;
  closure_reason?: string | null;
  intake_data?: Record<string, unknown> | null;
  custom_data?: Record<string, unknown> | null;
  is_urgent: boolean;
  client_viewable: boolean;
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

export interface CaseOutcomeAssignment {
  id: string;
  case_id: string;
  outcome_value: CaseOutcome;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  modified_by?: string | null;
}

/**
 * Case Note
 */
export interface CaseNote {
  id: string;
  case_id: string;
  note_type: NoteType;
  subject?: string | null;
  category?: string | null;
  content: string;
  is_internal: boolean;
  visible_to_client: boolean;
  is_important: boolean;
  previous_status_id?: string | null;
  new_status_id?: string | null;
  attachments?: unknown[] | null;
  created_at: string;
  updated_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  source_entity_type?: CaseSourceEntityType | null;
  source_entity_id?: string | null;
  first_name?: string;
  last_name?: string;
  outcome_impacts?: InteractionOutcomeImpact[];
}

export interface CaseOutcomeEvent {
  id: string;
  case_id: string;
  account_id?: string | null;
  outcome_type?: string | null;
  outcome_definition_id?: string | null;
  outcome_definition_key?: string | null;
  outcome_definition_name?: string | null;
  source_interaction_id?: string | null;
  entry_source?: CaseOutcomeEntrySource | null;
  workflow_stage?: CaseOutcomeWorkflowStage | null;
  source_entity_type?: CaseSourceEntityType | null;
  source_entity_id?: string | null;
  outcome_date: string;
  notes?: string | null;
  visible_to_client: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface CaseTopicDefinition {
  id: string;
  account_id?: string | null;
  name: string;
  normalized_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CaseTopicEvent {
  id: string;
  case_id: string;
  account_id?: string | null;
  topic_definition_id: string;
  topic_name?: string;
  discussed_at: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface CaseDocument {
  id: string;
  case_id: string;
  account_id?: string | null;
  document_name: string;
  file_name?: string | null;
  original_filename?: string | null;
  document_type?: string | null;
  description?: string | null;
  file_path?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  visible_to_client: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  uploaded_at?: string;
  uploaded_by?: string | null;
  updated_by?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export type CaseTimelineEventType =
  | 'note'
  | 'outcome'
  | 'topic'
  | 'document'
  | 'appointment'
  | 'conversation'
  | 'follow_up'
  | 'attendance';

export interface CaseTimelineEvent {
  id: string;
  type: CaseTimelineEventType;
  case_id: string;
  created_at: string;
  visible_to_client: boolean;
  title: string;
  content?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export interface CaseTimelinePage {
  items: CaseTimelineEvent[];
  page: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

export type RelationshipType = 'duplicate' | 'related' | 'parent' | 'child' | 'blocked_by' | 'blocks';
export type ServiceType = 'counseling' | 'legal' | 'financial' | 'housing' | 'healthcare' | 'education' | 'employment' | 'other';
export type ServiceStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type ServiceOutcome = 'attended_event' | 'additional_related_case' | 'completed' | 'follow_up_needed' | 'other';
export type CaseOutcomeEntrySource = 'manual' | 'interaction_sync' | 'legacy';

export interface CasePortalMessage {
  id: string;
  sender_type: 'portal' | 'staff' | 'system';
  message_text: string;
  created_at: string;
  sender_display_name: string | null;
  is_internal: boolean;
  client_message_id?: string | null;
  send_state?: MessageSendState;
  send_error?: string | null;
  optimistic?: boolean;
}

export interface CasePortalThread {
  id: string;
  subject: string | null;
  status: 'open' | 'closed' | 'archived';
  case_id?: string | null;
  case_number?: string | null;
  case_title?: string | null;
  contact_id?: string | null;
  last_message_at: string;
  unread_count: number;
  portal_email: string | null;
}

export interface CasePortalConversation {
  thread: CasePortalThread;
  messages: CasePortalMessage[];
}

export type CaseAppointmentAttendanceState = 'scheduled' | 'attended' | 'cancelled' | 'no_show';

export interface CaseAppointment {
  id: string;
  contact_id: string;
  case_id: string | null;
  pointperson_user_id: string | null;
  slot_id: string | null;
  request_type: 'manual_request' | 'slot_booking';
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
  checked_in_at?: string | null;
  checked_in_by?: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  case_number?: string | null;
  case_title?: string | null;
  pointperson_first_name?: string | null;
  pointperson_last_name?: string | null;
  pointperson_email?: string | null;
  portal_user_id?: string | null;
  portal_email?: string | null;
  contact_name?: string | null;
  next_reminder_at?: string | null;
  pending_reminder_jobs?: number;
  last_reminder_sent_at?: string | null;
  reminder_offered?: boolean;
  attendance_state?: CaseAppointmentAttendanceState;
  linked_note_count?: number;
  linked_outcome_count?: number;
  missing_note?: boolean;
  missing_outcome?: boolean;
  missing_reminder?: boolean;
}

export interface ExternalServiceProvider {
  id: string;
  provider_name: string;
  provider_type?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  attached_services_count?: number;
  attached_cases_count?: number;
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
  related_case_number?: string;
  related_case_title?: string;
  created_at: string;
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
  external_service_provider_id?: string | null;
  external_service_provider_name?: string | null;
  external_service_provider_type?: string | null;
  service_date: string;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  status: ServiceStatus;
  outcome?: ServiceOutcome | string | null;
  cost?: number | null;
  currency: string;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

/**
 * Create Case DTO
 */
export interface CreateCaseDTO {
  contact_id: string;
  account_id?: string;
  case_type_id?: string;
  case_type_ids?: string[];
  title: string;
  description?: string;
  priority?: CasePriority;
  outcome?: CaseOutcome;
  source?: CaseSource;
  referral_source?: string;
  assigned_to?: string;
  assigned_team?: string;
  due_date?: string;
  intake_data?: Record<string, unknown>;
  custom_data?: Record<string, unknown>;
  tags?: string[];
  is_urgent?: boolean;
  client_viewable?: boolean;
  case_outcome_values?: CaseOutcome[];
}

/**
 * Update Case DTO
 */
export interface UpdateCaseDTO {
  title?: string;
  description?: string;
  priority?: CasePriority;
  case_type_id?: string;
  case_type_ids?: string[];
  assigned_to?: string;
  assigned_team?: string;
  due_date?: string;
  outcome?: CaseOutcome;
  case_outcome_values?: CaseOutcome[];
  outcome_notes?: string;
  closure_reason?: string;
  custom_data?: Record<string, unknown>;
  tags?: string[];
  is_urgent?: boolean;
  client_viewable?: boolean;
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
  quick_filter?: 'active' | 'overdue' | 'due_soon' | 'unassigned' | 'urgent';
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
  category?: string;
  content: string;
  is_internal?: boolean;
  visible_to_client?: boolean;
  is_portal_visible?: boolean;
  is_important?: boolean;
  attachments?: unknown[];
  source_entity_type?: CaseSourceEntityType | null;
  source_entity_id?: string | null;
  outcome_impacts?: InteractionOutcomeImpactInput[];
  outcomes_mode?: OutcomeUpdateMode;
}

export interface UpdateCaseNoteDTO {
  note_type?: NoteType;
  subject?: string;
  category?: string | null;
  content?: string;
  is_internal?: boolean;
  visible_to_client?: boolean;
  is_portal_visible?: boolean;
  is_important?: boolean;
  attachments?: unknown[] | null;
  source_entity_type?: CaseSourceEntityType | null;
  source_entity_id?: string | null;
  outcome_impacts?: InteractionOutcomeImpactInput[];
  outcomes_mode?: OutcomeUpdateMode;
}

export interface CreateCaseOutcomeDTO {
  outcome_type?: string;
  outcome_definition_id?: string;
  outcome_date?: string;
  notes?: string;
  visible_to_client?: boolean;
  is_portal_visible?: boolean;
  source_entity_type?: CaseSourceEntityType | null;
  source_entity_id?: string | null;
  workflow_stage?: CaseOutcomeWorkflowStage;
}

export interface UpdateCaseOutcomeDTO {
  outcome_type?: string | null;
  outcome_definition_id?: string;
  outcome_date?: string;
  notes?: string | null;
  visible_to_client?: boolean;
  is_portal_visible?: boolean;
  source_entity_type?: CaseSourceEntityType | null;
  source_entity_id?: string | null;
  workflow_stage?: CaseOutcomeWorkflowStage | null;
}

export interface CreateCaseTopicDefinitionDTO {
  name: string;
}

export interface CreateCaseTopicEventDTO {
  topic_definition_id?: string;
  topic_name?: string;
  discussed_at?: string;
  notes?: string;
}

export interface UpdateCaseDocumentDTO {
  document_name?: string;
  document_type?: string | null;
  description?: string | null;
  visible_to_client?: boolean;
  is_portal_visible?: boolean;
  is_active?: boolean;
}

/**
 * Update Case Status DTO
 */
export interface UpdateCaseStatusDTO {
  new_status_id: string;
  reason?: string;
  notes: string;
  outcome_definition_ids?: string[];
  outcome_visibility?: boolean;
}

/**
 * Case Milestone
 */
export interface CaseMilestone {
  id: string;
  case_id: string;
  milestone_name: string;
  description?: string | null;
  due_date?: string | null;
  completed_date?: string | null;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
  created_by?: string | null;
}

/**
 * Create Case Milestone DTO
 */
export interface CreateCaseMilestoneDTO {
  milestone_name: string;
  description?: string;
  due_date?: string;
  sort_order?: number;
}

/**
 * Update Case Milestone DTO
 */
export interface UpdateCaseMilestoneDTO {
  milestone_name?: string;
  description?: string;
  due_date?: string;
  is_completed?: boolean;
  sort_order?: number;
}

/**
 * Reassign Case DTO
 */
export interface ReassignCaseDTO {
  assigned_to: string | null;
  reason?: string;
}

/**
 * Bulk Status Update DTO
 */
export interface BulkStatusUpdateDTO {
  case_ids: string[];
  new_status_id: string;
  notes?: string;
}

/**
 * Create Case Relationship DTO
 */
export interface CreateCaseRelationshipDTO {
  related_case_id: string;
  relationship_type: RelationshipType;
  description?: string;
}

/**
 * Create Case Service DTO
 */
export interface CreateCaseServiceDTO {
  service_name: string;
  service_type?: ServiceType;
  service_provider?: string;
  external_service_provider_id?: string;
  service_date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  status?: ServiceStatus;
  outcome?: ServiceOutcome | string;
  cost?: number;
  currency?: string;
  notes?: string;
}

/**
 * Update Case Service DTO
 */
export interface UpdateCaseServiceDTO {
  service_name?: string;
  service_type?: ServiceType;
  service_provider?: string;
  external_service_provider_id?: string | null;
  service_date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  status?: ServiceStatus;
  outcome?: ServiceOutcome | string;
  cost?: number;
  currency?: string;
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
  caseMilestones: CaseMilestone[];
  caseRelationships: CaseRelationship[];
  caseServices: CaseService[];
  caseOutcomeDefinitions?: OutcomeDefinition[];
  interactionOutcomeImpacts?: Record<string, InteractionOutcomeImpact[]>;
  caseOutcomes?: CaseOutcomeEvent[];
  caseTopicDefinitions?: CaseTopicDefinition[];
  caseTopicEvents?: CaseTopicEvent[];
  caseDocuments?: CaseDocument[];
  caseTimeline?: CaseTimelineEvent[];
  summary: CaseSummary | null;
  total: number;
  loading: boolean;
  error: string | null;
  outcomesLoading?: boolean;
  outcomesSaving?: boolean;
  outcomesError?: string | null;
  filters: CaseFilter;
  selectedCaseIds: string[];
  contactCasesByContactId?: Record<
    string,
    {
      cases: CaseWithDetails[];
      loading: boolean;
      error: string | null;
      fetchedAt: number | null;
    }
  >;
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

export interface CaseMilestonesResponse {
  milestones: CaseMilestone[];
}

export interface CaseRelationshipsResponse {
  relationships: CaseRelationship[];
}

export interface CaseServicesResponse {
  services: CaseService[];
}

export interface ExternalServiceProvidersResponse {
  providers: ExternalServiceProvider[];
}
