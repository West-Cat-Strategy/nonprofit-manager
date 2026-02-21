/**
 * Contact Type Definitions for Frontend
 */

export interface ContactStaffInvitation {
  role: string;
  inviteUrl: string;
}

export interface Contact {
  contact_id: string;
  account_id: string | null;
  account_name?: string;
  first_name: string;
  preferred_name?: string | null;
  last_name: string;
  middle_name: string | null;
  salutation: string | null;
  suffix: string | null;
  birth_date: string | null;
  gender: string | null;
  pronouns: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  no_fixed_address: boolean;
  job_title: string | null;
  department: string | null;
  preferred_contact_method: string | null;
  do_not_email: boolean;
  do_not_phone: boolean;
  do_not_text: boolean;
  do_not_voicemail: boolean;
  notes: string | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  phone_count?: number;
  email_count?: number;
  relationship_count?: number;
  note_count?: number;
  roles?: string[];
  staffInvitation?: ContactStaffInvitation | null;
}

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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  portal_visible_at: string | null;
  portal_visible_by: string | null;
  attachments: unknown | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined fields for display
  created_by_first_name?: string;
  created_by_last_name?: string;
  case_number?: string;
  case_title?: string;
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
  attachments?: unknown;
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
}

// ============================================================================
// Contact Role Types
// ============================================================================

export interface ContactRole {
  id: string;
  name: string;
  description?: string | null;
  is_system?: boolean;
}

// ============================================================================
// Helper Constants
// ============================================================================

export const PHONE_LABELS: { value: PhoneLabel; label: string }[] = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'fax', label: 'Fax' },
  { value: 'other', label: 'Other' },
];

export const EMAIL_LABELS: { value: EmailLabel; label: string }[] = [
  { value: 'personal', label: 'Personal' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
];

export const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: 'contact_person', label: 'Contact Person' },
  { value: 'spouse', label: 'Spouse/Partner' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'family_member', label: 'Other Family Member' },
  { value: 'emergency_contact', label: 'Emergency Contact' },
  { value: 'social_worker', label: 'Social Worker' },
  { value: 'caregiver', label: 'Caregiver' },
  { value: 'advocate', label: 'Advocate' },
  { value: 'support_person', label: 'Support Person' },
  { value: 'roommate', label: 'Roommate' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' },
];

export const NOTE_TYPES: { value: ContactNoteType; label: string; icon?: string }[] = [
  { value: 'note', label: 'Note', icon: 'note' },
  { value: 'email', label: 'Email', icon: 'email' },
  { value: 'call', label: 'Phone Call', icon: 'phone' },
  { value: 'meeting', label: 'Meeting', icon: 'people' },
  { value: 'update', label: 'Update', icon: 'update' },
  { value: 'other', label: 'Other', icon: 'more_horiz' },
];

export const PRONOUNS_OPTIONS: string[] = [
  'he/him',
  'she/her',
  'they/them',
  'he/they',
  'she/they',
  'ze/hir',
  'xe/xem',
];

export const GENDER_OPTIONS: string[] = [
  'Male',
  'Female',
  'Non-binary',
  'Genderqueer',
  'Genderfluid',
  'Agender',
  'Two-Spirit',
  'Prefer not to say',
  'Other',
];

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
  portal_visible_at: string | null;
  portal_visible_by: string | null;

  // Audit fields
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;

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

export const DOCUMENT_TYPES: { value: DocumentType; label: string; icon: string }[] = [
  { value: 'identification', label: 'Identification', icon: '🪪' },
  { value: 'legal', label: 'Legal Document', icon: '⚖️' },
  { value: 'medical', label: 'Medical Record', icon: '🏥' },
  { value: 'financial', label: 'Financial Document', icon: '💰' },
  { value: 'correspondence', label: 'Correspondence', icon: '📧' },
  { value: 'photo', label: 'Photo', icon: '📷' },
  { value: 'consent_form', label: 'Consent Form', icon: '✍️' },
  { value: 'assessment', label: 'Assessment', icon: '📋' },
  { value: 'report', label: 'Report', icon: '📊' },
  { value: 'other', label: 'Other', icon: '📄' },
];
