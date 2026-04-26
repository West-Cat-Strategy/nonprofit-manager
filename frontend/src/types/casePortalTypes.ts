import type { MessageSendState } from '@nonprofit-manager/contracts/messaging';

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

export type CaseReassessmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface CaseReassessment {
  id: string;
  organization_id: string;
  case_id: string;
  follow_up_id: string;
  owner_user_id: string | null;
  status: CaseReassessmentStatus;
  title: string;
  summary: string | null;
  earliest_review_date: string | null;
  due_date: string;
  latest_review_date: string | null;
  completion_summary: string | null;
  cancellation_reason?: string | null;
  completed_at?: string | null;
  completed_by?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCaseReassessmentDTO {
  title: string;
  summary?: string | null;
  earliest_review_date?: string | null;
  due_date: string;
  latest_review_date?: string | null;
  owner_user_id?: string | null;
}

export interface UpdateCaseReassessmentDTO {
  title?: string;
  summary?: string | null;
  earliest_review_date?: string | null;
  due_date?: string;
  latest_review_date?: string | null;
  owner_user_id?: string | null;
  status?: Extract<CaseReassessmentStatus, 'scheduled' | 'in_progress'>;
}

export interface CompleteCaseReassessmentDTO {
  completion_summary: string;
  outcome_definition_ids?: string[];
  outcome_visibility?: boolean;
  next_due_date?: string;
  next_title?: string;
  next_summary?: string | null;
  next_earliest_review_date?: string | null;
  next_latest_review_date?: string | null;
  next_owner_user_id?: string | null;
}

export interface CancelCaseReassessmentDTO {
  cancellation_reason: string;
}

export interface CompleteCaseReassessmentResult {
  reassessment: CaseReassessment;
  next_reassessment: CaseReassessment | null;
}

export type CasePortalEscalationStatus = 'open' | 'in_review' | 'resolved' | 'referred';

export interface CasePortalEscalation {
  id: string;
  caseId: string;
  contactId: string | null;
  accountId: string | null;
  portalUserId: string | null;
  createdByPortalUserId: string | null;
  category: string;
  reason: string;
  severity: 'low' | 'normal' | 'high' | 'urgent';
  sensitivity: 'standard' | 'sensitive';
  assigneeUserId: string | null;
  slaDueAt: string | null;
  status: CasePortalEscalationStatus;
  resolutionSummary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCasePortalEscalationDTO {
  status?: CasePortalEscalationStatus;
  resolution_summary?: string | null;
  assignee_user_id?: string | null;
  sla_due_at?: string | null;
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
