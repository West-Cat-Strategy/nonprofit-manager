/**
 * Contact Type Definitions
 * Aligned with Microsoft Common Data Model (CDM) Contact entity
 */
import type {
  InteractionOutcomeImpact,
  InteractionOutcomeImpactInput,
  OutcomeUpdateMode,
} from './outcomes';

// ============================================================================
// Phone Number Types
// ============================================================================

export type PhoneLabel = 'home' | 'work' | 'mobile' | 'fax' | 'other';

export interface ContactPhoneNumber {
  id: string;
  contact_id: string;
  phone_number: string;
  label: PhoneLabel;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  modified_by: string | null;
}

export interface CreateContactPhoneDTO {
  phone_number: string;
  label?: PhoneLabel;
  is_primary?: boolean;
}

export interface UpdateContactPhoneDTO {
  phone_number?: string;
  label?: PhoneLabel;
  is_primary?: boolean;
}

// ============================================================================
// Email Address Types
// ============================================================================

export type EmailLabel = 'personal' | 'work' | 'other';

export interface ContactEmailAddress {
  id: string;
  contact_id: string;
  email_address: string;
  label: EmailLabel;
  is_primary: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  modified_by: string | null;
}

export interface CreateContactEmailDTO {
  email_address: string;
  label?: EmailLabel;
  is_primary?: boolean;
}

export interface UpdateContactEmailDTO {
  email_address?: string;
  label?: EmailLabel;
  is_primary?: boolean;
}

// ============================================================================
// Relationship Types
// ============================================================================

export type RelationshipType =
  | 'contact_person'
  | 'spouse'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'family_member'
  | 'emergency_contact'
  | 'social_worker'
  | 'caregiver'
  | 'advocate'
  | 'support_person'
  | 'roommate'
  | 'friend'
  | 'colleague'
  | 'other';

export interface ContactRelationship {
  id: string;
  contact_id: string;
  related_contact_id: string;
  relationship_type: RelationshipType;
  relationship_label: string | null;
  is_bidirectional: boolean;
  inverse_relationship_type: RelationshipType | null;
  notes: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  modified_by: string | null;
  // Joined fields for display
  related_contact_first_name?: string;
  related_contact_last_name?: string;
  related_contact_email?: string;
  related_contact_phone?: string;
}

export interface CreateContactRelationshipDTO {
  related_contact_id: string;
  relationship_type: RelationshipType;
  relationship_label?: string;
  is_bidirectional?: boolean;
  inverse_relationship_type?: RelationshipType;
  notes?: string;
}

export interface UpdateContactRelationshipDTO {
  relationship_type?: RelationshipType;
  relationship_label?: string;
  is_bidirectional?: boolean;
  inverse_relationship_type?: RelationshipType;
  notes?: string;
  is_active?: boolean;
}

// ============================================================================
// Contact Note Types
// ============================================================================

export type ContactNoteType = 'note' | 'email' | 'call' | 'meeting' | 'update' | 'other';

export interface ContactNote {
  id: string;
  contact_id: string;
  case_id: string | null;
  note_type: ContactNoteType;
  subject: string | null;
  content: string;
  is_internal: boolean;
  is_important: boolean;
  is_pinned: boolean;
  is_alert: boolean;
  is_portal_visible: boolean;
  portal_visible_at: Date | null;
  portal_visible_by: string | null;
  attachments: any | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  // Joined fields for display
  created_by_first_name?: string;
  created_by_last_name?: string;
  case_number?: string;
  case_title?: string;
  outcome_impacts?: InteractionOutcomeImpact[];
}

export type ContactNoteTimelineSource = 'contact_note' | 'case_note' | 'event_activity';

export interface ContactNoteTimelineCounts {
  all: number;
  contact_notes: number;
  case_notes: number;
  event_activity: number;
}

export interface ContactNoteTimelineItem {
  id: string;
  source_type: ContactNoteTimelineSource;
  editable: boolean;
  note_type: string | null;
  activity_type: string | null;
  title: string | null;
  content: string | null;
  is_internal: boolean;
  is_important: boolean;
  is_pinned: boolean;
  is_alert: boolean;
  is_portal_visible: boolean;
  created_at: Date;
  updated_at: Date | null;
  created_by: string | null;
  created_by_first_name?: string | null;
  created_by_last_name?: string | null;
  case_id: string | null;
  case_number?: string | null;
  case_title?: string | null;
  event_id: string | null;
  event_name?: string | null;
  registration_id?: string | null;
  registration_status?: string | null;
  previous_registration_status?: string | null;
  next_registration_status?: string | null;
  checked_in?: boolean | null;
  check_in_method?: string | null;
  outcome_impacts?: InteractionOutcomeImpact[];
}

export interface ContactNotesTimelineResponse {
  items: ContactNoteTimelineItem[];
  counts: ContactNoteTimelineCounts;
}

export interface CreateContactNoteDTO {
  case_id?: string;
  note_type?: ContactNoteType;
  subject?: string;
  content: string;
  is_internal?: boolean;
  is_important?: boolean;
  is_pinned?: boolean;
  is_alert?: boolean;
  is_portal_visible?: boolean;
  attachments?: any;
  outcome_impacts?: InteractionOutcomeImpactInput[];
  outcomes_mode?: OutcomeUpdateMode;
}

export interface UpdateContactNoteDTO {
  note_type?: ContactNoteType;
  subject?: string;
  content?: string;
  is_internal?: boolean;
  is_important?: boolean;
  is_pinned?: boolean;
  is_alert?: boolean;
  is_portal_visible?: boolean;
  attachments?: any;
  outcome_impacts?: InteractionOutcomeImpactInput[];
  outcomes_mode?: OutcomeUpdateMode;
}

// ============================================================================
// Contact Types
// ============================================================================

export interface Contact {
  contact_id: string;
  account_id: string | null;
  document_count?: number;

  // Name fields
  first_name: string;
  preferred_name?: string | null;
  last_name: string;
  middle_name: string | null;
  salutation: string | null;
  suffix: string | null;

  // Personal information
  birth_date: string | null;
  gender: string | null;
  pronouns: string | null;
  phn: string | null;

  // Legacy contact information (kept for backwards compatibility)
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
  no_fixed_address: boolean;

  // Additional information
  job_title: string | null;
  department: string | null;
  preferred_contact_method: string | null;
  do_not_email: boolean;
  do_not_phone: boolean;
  do_not_text: boolean;
  do_not_voicemail: boolean;
  notes: string | null;
  tags: string[];

  // Lifecycle tracking
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  modified_by: string;

  // Related account info (for joins)
  account_name?: string;

  // Related data counts (for detail views)
  phone_count?: number;
  email_count?: number;
  relationship_count?: number;
  note_count?: number;

  // Roles
  roles?: string[];
}

export type ContactMergeResolution = 'source' | 'target';

export interface ContactMergeFieldPreview {
  field: string;
  label: string;
  source_value: string | number | boolean | string[] | null;
  target_value: string | number | boolean | string[] | null;
  conflict: boolean;
  auto_merged: boolean;
}

export interface ContactMergeCounts {
  phones: number;
  emails: number;
  relationships: number;
  notes: number;
  documents: number;
  roles: number;
}

export interface ContactMergePreview {
  source_contact: Contact & { roles: string[] };
  target_contact: Contact & { roles: string[] };
  fields: ContactMergeFieldPreview[];
  source_summary: ContactMergeCounts;
  target_summary: ContactMergeCounts;
}

export interface ContactMergeRequest {
  target_contact_id: string;
  resolutions: Record<string, ContactMergeResolution>;
}

export interface ContactMergeSummary {
  source_contact_id: string;
  target_contact_id: string;
  merged_fields: string[];
  moved_counts: Record<string, number>;
}

export interface ContactMergeResult {
  survivor_contact: Contact & { roles: string[] };
  merge_summary: ContactMergeSummary;
}

export interface ContactWithRelated extends Contact {
  phones: ContactPhoneNumber[];
  emails: ContactEmailAddress[];
  relationships: ContactRelationship[];
}

export interface ContactLookupItem {
  contact_id: string;
  first_name: string;
  preferred_name?: string | null;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  account_name?: string | null;
  is_active: boolean;
}

export interface CreateContactDTO {
  account_id?: string;
  first_name: string;
  preferred_name?: string;
  last_name: string;
  middle_name?: string;
  salutation?: string;
  suffix?: string;
  birth_date?: string | null;
  gender?: string;
  pronouns?: string;
  phn?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  no_fixed_address?: boolean;
  job_title?: string;
  department?: string;
  preferred_contact_method?: string;
  do_not_email?: boolean;
  do_not_phone?: boolean;
  do_not_text?: boolean;
  do_not_voicemail?: boolean;
  notes?: string;
  tags?: string[];
  roles?: string[];
}

export interface UpdateContactDTO {
  account_id?: string;
  first_name?: string;
  preferred_name?: string;
  last_name?: string;
  middle_name?: string;
  salutation?: string;
  suffix?: string;
  birth_date?: string | null;
  gender?: string | null;
  pronouns?: string | null;
  phn?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  no_fixed_address?: boolean;
  job_title?: string;
  department?: string;
  preferred_contact_method?: string;
  do_not_email?: boolean;
  do_not_phone?: boolean;
  do_not_text?: boolean;
  do_not_voicemail?: boolean;
  notes?: string;
  is_active?: boolean;
  tags?: string[];
  roles?: string[];
}

export interface ContactRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

export type ContactCommunicationChannel = 'email' | 'sms';
export type ContactCommunicationSourceType = 'appointment_reminder' | 'event_reminder';
export type ContactCommunicationDeliveryStatus = 'sent' | 'failed' | 'skipped';
export type ContactCommunicationTriggerType = 'manual' | 'automated';
export type ContactCommunicationActionType =
  | 'send_appointment_reminder'
  | 'open_event'
  | 'none';

export interface ContactCommunicationAction {
  type: ContactCommunicationActionType;
  label: string;
  appointment_id?: string | null;
  case_id?: string | null;
  event_id?: string | null;
  disabled_reason?: string | null;
}

export interface ContactCommunication {
  id: string;
  channel: ContactCommunicationChannel;
  source_type: ContactCommunicationSourceType;
  delivery_status: ContactCommunicationDeliveryStatus;
  recipient: string;
  error_message: string | null;
  message_preview: string | null;
  trigger_type: ContactCommunicationTriggerType;
  sent_at: Date;
  appointment_id: string | null;
  case_id: string | null;
  event_id: string | null;
  registration_id: string | null;
  source_label: string;
  source_subtitle: string | null;
  action: ContactCommunicationAction;
}

export interface ContactCommunicationFilters {
  channel?: ContactCommunicationChannel;
  source_type?: ContactCommunicationSourceType;
  delivery_status?: ContactCommunicationDeliveryStatus;
  limit?: number;
}

export interface ContactCommunicationsResult {
  items: ContactCommunication[];
  total: number;
  filters: ContactCommunicationFilters;
}

export const CONTACT_ROLE_FILTER_VALUES = [
  'client',
  'donor',
  'support_person',
  'staff',
  'volunteer',
  'board',
] as const;

export type ContactRoleFilter = typeof CONTACT_ROLE_FILTER_VALUES[number];

export interface ContactFilters {
  search?: string;
  account_id?: string;
  is_active?: boolean;
  role?: ContactRoleFilter;
  tags?: string[];
}

export type { PaginationParams } from './pagination';

export interface PaginatedContacts {
  data: Contact[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

// ============================================================================
// Contact Document Types
// ============================================================================

export type DocumentType =
  | 'identification'
  | 'legal'
  | 'medical'
  | 'financial'
  | 'correspondence'
  | 'photo'
  | 'consent_form'
  | 'assessment'
  | 'report'
  | 'form_response'
  | 'form_attachment'
  | 'other';

export interface ContactDocument {
  id: string;
  contact_id: string;
  case_id: string | null;

  // File metadata
  file_name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;

  // Document metadata
  document_type: DocumentType;
  title: string | null;
  description: string | null;
  is_portal_visible: boolean;
  portal_visible_at: Date | null;
  portal_visible_by: string | null;

  // Audit fields
  is_active: boolean;
  created_at: Date;
  created_by: string | null;
  updated_at: Date;

  // Joined fields for display
  created_by_first_name?: string;
  created_by_last_name?: string;
  case_number?: string;
  case_title?: string;
}

export interface CreateContactDocumentDTO {
  case_id?: string;
  document_type?: DocumentType;
  title?: string;
  description?: string;
  is_portal_visible?: boolean;
}

export interface UpdateContactDocumentDTO {
  document_type?: DocumentType;
  title?: string;
  description?: string;
  is_portal_visible?: boolean;
}
