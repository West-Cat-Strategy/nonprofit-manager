export type CaseFormQuestionType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'signature';

export type CaseFormLogicOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'answered'
  | 'not_answered'
  | 'truthy'
  | 'falsy';

export type CaseFormAssignmentStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'in_progress'
  | 'submitted'
  | 'revision_requested'
  | 'reviewed'
  | 'closed'
  | 'expired'
  | 'cancelled';

export type CaseFormAssignmentBucket = 'active' | 'completed';

export type CaseFormActorType = 'staff' | 'portal' | 'public';
export type CaseFormAssetKind = 'upload' | 'signature';
export type CaseFormDeliveryTarget = 'portal' | 'email' | 'portal_and_email';

export interface CaseFormLogicRule {
  question_key: string;
  operator: CaseFormLogicOperator;
  value?: string | number | boolean | string[] | null;
}

export interface CaseFormMappingTarget {
  entity: 'contact' | 'case';
  field?: string;
  container?: 'intake_data' | 'custom_data';
  key?: string;
}

export interface CaseFormQuestionOption {
  label: string;
  value: string;
}

export interface CaseFormQuestion {
  id: string;
  key: string;
  type: CaseFormQuestionType;
  label: string;
  helper_text?: string | null;
  placeholder?: string | null;
  required?: boolean;
  multiple?: boolean;
  options?: CaseFormQuestionOption[];
  visible_when?: CaseFormLogicRule[];
  mapping_target?: CaseFormMappingTarget | null;
  upload_config?: {
    max_files?: number;
    accept?: string[];
  } | null;
}

export interface CaseFormSection {
  id: string;
  title: string;
  description?: string | null;
  questions: CaseFormQuestion[];
}

export interface CaseFormSchema {
  version: number;
  title: string;
  description?: string | null;
  sections: CaseFormSection[];
}

export interface CaseFormAsset {
  id: string;
  assignment_id: string;
  case_id: string;
  contact_id: string;
  asset_kind: CaseFormAssetKind;
  question_key: string;
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_by_actor_type: CaseFormActorType;
  created_by_user_id?: string | null;
  created_by_portal_user_id?: string | null;
  submission_id?: string | null;
  created_at: string;
  download_url?: string | null;
}

export interface CaseFormDefault {
  id: string;
  case_type_id: string;
  account_id?: string | null;
  title: string;
  description?: string | null;
  schema: CaseFormSchema;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CaseFormSubmission {
  id: string;
  assignment_id: string;
  case_id: string;
  contact_id: string;
  submission_number: number;
  client_submission_id?: string | null;
  answers: Record<string, unknown>;
  mapping_audit: Array<{
    question_key: string;
    target: CaseFormMappingTarget;
    applied: boolean;
    reason?: string | null;
    value?: unknown;
  }>;
  asset_refs: CaseFormAsset[];
  signature_refs: CaseFormAsset[];
  response_packet_file_name?: string | null;
  response_packet_file_path?: string | null;
  response_packet_case_document_id?: string | null;
  response_packet_contact_document_id?: string | null;
  submitted_by_actor_type: CaseFormActorType;
  submitted_by_user_id?: string | null;
  submitted_by_portal_user_id?: string | null;
  access_token_id?: string | null;
  created_at: string;
  response_packet_download_url?: string | null;
}

export interface CaseFormAssignment {
  id: string;
  case_id: string;
  contact_id: string;
  account_id?: string | null;
  case_type_id?: string | null;
  source_default_id?: string | null;
  source_default_version?: number | null;
  title: string;
  description?: string | null;
  status: CaseFormAssignmentStatus;
  schema: CaseFormSchema;
  current_draft_answers?: Record<string, unknown> | null;
  last_draft_saved_at?: string | null;
  due_at?: string | null;
  recipient_email?: string | null;
  delivery_target?: CaseFormDeliveryTarget | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  submitted_at?: string | null;
  revision_requested_at?: string | null;
  revision_notes?: string | null;
  reviewed_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  case_number?: string | null;
  case_title?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  draft_assets?: CaseFormAsset[];
  latest_submission?: CaseFormSubmission | null;
  access_link_url?: string | null;
}

export interface CaseFormAssignmentSummary {
  id: string;
  title: string;
  status: CaseFormAssignmentStatus;
  description?: string | null;
  due_at?: string | null;
  sent_at?: string | null;
  submitted_at?: string | null;
  revision_requested_at?: string | null;
  updated_at: string;
  case_number?: string | null;
  case_title?: string | null;
}

export interface CaseFormReviewDecision {
  decision: 'revision_requested' | 'reviewed' | 'closed' | 'cancelled';
  notes?: string | null;
}

export interface CaseFormAssignmentDetail {
  assignment: CaseFormAssignment;
  submissions: CaseFormSubmission[];
}

export interface CreateCaseFormDefaultDTO {
  title: string;
  description?: string;
  schema: CaseFormSchema;
  is_active?: boolean;
}

export interface UpdateCaseFormDefaultDTO {
  title?: string;
  description?: string | null;
  schema?: CaseFormSchema;
  is_active?: boolean;
}

export interface CreateCaseFormAssignmentDTO {
  title: string;
  description?: string;
  schema: CaseFormSchema;
  case_type_id?: string;
  due_at?: string;
  recipient_email?: string;
  source_default_id?: string;
}

export interface UpdateCaseFormAssignmentDTO {
  title?: string;
  description?: string | null;
  schema?: CaseFormSchema;
  due_at?: string | null;
  recipient_email?: string | null;
  status?: CaseFormAssignmentStatus;
}

export interface SaveCaseFormDraftDTO {
  answers: Record<string, unknown>;
}

export interface SubmitCaseFormDTO {
  answers: Record<string, unknown>;
  client_submission_id?: string;
}

export interface SendCaseFormAssignmentDTO {
  delivery_target: CaseFormDeliveryTarget;
  recipient_email?: string;
  expires_in_days?: number;
}
