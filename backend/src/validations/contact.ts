/**
 * Contact Validation Schemas
 * Schemas for contact profiles, relationships, and filtering
 */

import { z } from 'zod';
import { emailSchema, phoneSchema, uuidSchema } from './shared';

// Contact role enum
export const contactRoleSchema = z.enum(['staff', 'volunteer', 'board']);

export type ContactRole = z.infer<typeof contactRoleSchema>;

// Note type enum
export const noteTypeSchema = z.enum(['note', 'email', 'call', 'meeting', 'update', 'other']);

export type NoteType = z.infer<typeof noteTypeSchema>;

// Phone label enum
export const phoneLabelSchema = z.enum(['home', 'work', 'mobile', 'fax', 'other']);

export type PhoneLabel = z.infer<typeof phoneLabelSchema>;

// Email label enum
export const emailLabelSchema = z.enum(['personal', 'work', 'other']);

export type EmailLabel = z.infer<typeof emailLabelSchema>;

// Relationship type enum
export const relationshipTypeSchema = z.enum([
  'contact_person', 'spouse', 'parent', 'child', 'sibling', 'family_member',
  'emergency_contact', 'social_worker', 'caregiver', 'advocate',
  'support_person', 'roommate', 'friend', 'colleague', 'other'
]);

export type RelationshipType = z.infer<typeof relationshipTypeSchema>;

// Document type enum
export const documentTypeSchema = z.enum([
  'identification', 'legal', 'medical', 'financial',
  'correspondence', 'photo', 'consent_form', 'assessment', 'report', 'other'
]);

export type DocumentType = z.infer<typeof documentTypeSchema>;

// Create contact - comprehensive
export const createContactSchema = z.object({
  account_id: uuidSchema.optional(),
  first_name: z.string().min(1).max(100).optional(),
  preferred_name: z.string().max(100).optional(),
  last_name: z.string().min(1).max(100),
  middle_name: z.string().max(100).optional(),
  salutation: z.string().max(50).optional(),
  suffix: z.string().max(50).optional(),
  birth_date: z.coerce.date().optional(),
  gender: z.string().max(50).optional(),
  pronouns: z.string().max(50).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  mobile_phone: phoneSchema.optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  preferred_contact_method: z.string().max(50).optional(),
  no_fixed_address: z.boolean().default(false).optional(),
  do_not_email: z.boolean().default(false).optional(),
  do_not_phone: z.boolean().default(false).optional(),
  do_not_text: z.boolean().default(false).optional(),
  do_not_voicemail: z.boolean().default(false).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  roles: z.array(z.string()).optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

// Update contact - all fields optional
export const updateContactSchema = z.object({
  account_id: uuidSchema.optional(),
  first_name: z.string().min(1).max(100).optional(),
  preferred_name: z.string().max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  middle_name: z.string().max(100).optional(),
  salutation: z.string().max(50).optional(),
  suffix: z.string().max(50).optional(),
  birth_date: z.coerce.date().optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  pronouns: z.string().max(50).optional().nullable(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  mobile_phone: phoneSchema.optional(),
  address_line1: z.string().max(200).optional(),
  address_line2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state_province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  preferred_contact_method: z.string().max(50).optional(),
  no_fixed_address: z.boolean().optional(),
  do_not_email: z.boolean().optional(),
  do_not_phone: z.boolean().optional(),
  do_not_text: z.boolean().optional(),
  do_not_voicemail: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  is_active: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  roles: z.array(z.string()).optional(),
});

export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// Bulk update contacts
export const bulkUpdateContactsSchema = z.object({
  contactIds: z.array(uuidSchema).min(1),
  is_active: z.boolean().optional(),
  tags: z.object({
    add: z.array(z.string().min(1).max(40)).optional(),
    remove: z.array(z.string().min(1).max(40)).optional(),
    replace: z.array(z.string().min(1).max(40)).optional(),
  }).optional(),
});

export type BulkUpdateContactsInput = z.infer<typeof bulkUpdateContactsSchema>;

// Contact filter
export const contactFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  role: contactRoleSchema.optional(),
  account_id: uuidSchema.optional(),
  is_active: z.boolean().optional(),
  tags: z.string().optional(),
});

export type ContactFilterInput = z.infer<typeof contactFilterSchema>;

// Contact note
export const contactNoteSchema = z.object({
  case_id: uuidSchema.optional(),
  note_type: noteTypeSchema.optional(),
  subject: z.string().max(500).optional(),
  content: z.string().min(1),
  is_internal: z.boolean().optional(),
  is_important: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  is_alert: z.boolean().optional(),
});

export type ContactNoteInput = z.infer<typeof contactNoteSchema>;

// Update contact note
export const updateContactNoteSchema = z.object({
  note_type: noteTypeSchema.optional(),
  subject: z.string().max(500).optional(),
  content: z.string().optional(),
  is_internal: z.boolean().optional(),
  is_important: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  is_alert: z.boolean().optional(),
});

export type UpdateContactNoteInput = z.infer<typeof updateContactNoteSchema>;

// Contact phone
export const contactPhoneSchema = z.object({
  phone_number: z.string().min(1).trim(),
  label: phoneLabelSchema.optional(),
  is_primary: z.boolean().optional(),
});

export type ContactPhoneInput = z.infer<typeof contactPhoneSchema>;

// Update contact phone
export const updateContactPhoneSchema = z.object({
  phone_number: z.string().min(1).trim().optional(),
  label: phoneLabelSchema.optional(),
  is_primary: z.boolean().optional(),
});

export type UpdateContactPhoneInput = z.infer<typeof updateContactPhoneSchema>;

// Contact email
export const contactEmailSchema = z.object({
  email_address: emailSchema,
  label: emailLabelSchema.optional(),
  is_primary: z.boolean().optional(),
});

export type ContactEmailInput = z.infer<typeof contactEmailSchema>;

// Update contact email
export const updateContactEmailSchema = z.object({
  email_address: emailSchema.optional(),
  label: emailLabelSchema.optional(),
  is_primary: z.boolean().optional(),
});

export type UpdateContactEmailInput = z.infer<typeof updateContactEmailSchema>;

// Contact relationship
export const contactRelationshipSchema = z.object({
  related_contact_id: uuidSchema,
  relationship_type: relationshipTypeSchema,
  relationship_label: z.string().max(100).optional(),
  is_bidirectional: z.boolean().optional(),
  inverse_relationship_type: relationshipTypeSchema.optional(),
  notes: z.string().max(500).optional(),
});

export type ContactRelationshipInput = z.infer<typeof contactRelationshipSchema>;

// Update contact relationship
export const updateContactRelationshipSchema = z.object({
  relationship_type: relationshipTypeSchema.optional(),
  relationship_label: z.string().max(100).optional(),
  is_bidirectional: z.boolean().optional(),
  inverse_relationship_type: relationshipTypeSchema.optional(),
  notes: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
});

export type UpdateContactRelationshipInput = z.infer<typeof updateContactRelationshipSchema>;

// Contact document
export const contactDocumentSchema = z.object({
  document_type: documentTypeSchema.optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
});

export type ContactDocumentInput = z.infer<typeof contactDocumentSchema>;

// Update contact document
export const updateContactDocumentSchema = z.object({
  document_type: documentTypeSchema.optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
});

export type UpdateContactDocumentInput = z.infer<typeof updateContactDocumentSchema>;

// Re-export shared schemas
export { uuidSchema } from './shared';
