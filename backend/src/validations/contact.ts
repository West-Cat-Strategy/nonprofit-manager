/**
 * Contact Validation Schemas
 * Schemas for contact profiles, relationships, and filtering
 */

import { z } from 'zod';
import { interactionOutcomeImpactItemSchema } from './outcomeImpact';
import { CONTACT_ROLE_FILTER_VALUES } from '@app-types/contact';
import { emailSchema, optionalNullablePhnSchema, optionalPhnSchema, phoneSchema, uuidSchema } from './shared';

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return value;
}, z.boolean().optional());

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be in YYYY-MM-DD format');

const nullableEmailSchema = z.preprocess((value) => {
  if (value === '') {
    return null;
  }
  return value;
}, emailSchema.nullable().optional());

const nullablePhoneSchema = z.preprocess((value) => {
  if (value === '') {
    return null;
  }
  return value;
}, z
  .string()
  .regex(/^[\d\s\-+()]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .nullable()
  .optional());

const normalizePhoneForComparison = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
};

const STAFF_ACCOUNT_REQUIRED_ROLES = new Set(['Staff', 'Executive Director']);

// Contact role enum
export const contactRoleSchema = z.enum(CONTACT_ROLE_FILTER_VALUES);

export type ContactRole = z.infer<typeof contactRoleSchema>;

// Note type enum
export const noteTypeSchema = z.enum(['note', 'email', 'call', 'meeting', 'update', 'other']);
const outcomesModeSchema = z.enum(['replace', 'merge']);

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
  'correspondence', 'photo', 'consent_form', 'assessment', 'report', 'form_response', 'form_attachment', 'other'
]);

export type DocumentType = z.infer<typeof documentTypeSchema>;

// Create contact - comprehensive
export const createContactSchema = z
  .object({
    account_id: uuidSchema.optional(),
    first_name: z.string().trim().min(1).max(100),
    preferred_name: z.string().max(100).optional(),
    last_name: z.string().min(1).max(100),
    middle_name: z.string().max(100).optional(),
    salutation: z.string().max(50).optional(),
    suffix: z.string().max(50).optional(),
    birth_date: dateOnlySchema.optional(),
    gender: z.string().max(50).optional(),
    pronouns: z.string().max(50).optional(),
    phn: optionalPhnSchema,
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
  })
  .superRefine((value, ctx) => {
    const normalizedPhone = normalizePhoneForComparison(value.phone);
    const normalizedMobilePhone = normalizePhoneForComparison(value.mobile_phone);

    if (
      normalizedPhone &&
      normalizedMobilePhone &&
      normalizedPhone === normalizedMobilePhone
    ) {
      const message = 'Phone and mobile phone must be different';
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message,
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mobile_phone'],
        message,
      });
    }

    const normalizedRoles = Array.isArray(value.roles)
      ? value.roles.map((role) => role.trim()).filter(Boolean)
      : [];
    const requiresEmail = normalizedRoles.some((role) => STAFF_ACCOUNT_REQUIRED_ROLES.has(role));

    if (requiresEmail && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Email is required when assigning Staff or Executive Director roles',
      });
    }
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
  birth_date: z.preprocess((value) => {
    if (value === '') {
      return null;
    }
    return value;
  }, dateOnlySchema.nullable().optional()),
  gender: z.string().max(50).optional().nullable(),
  pronouns: z.string().max(50).optional().nullable(),
  phn: optionalNullablePhnSchema,
  email: nullableEmailSchema,
  phone: nullablePhoneSchema,
  mobile_phone: nullablePhoneSchema,
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

export const donorProfileSchema = z
  .object({
    receipt_frequency: z.enum(['per_gift', 'annual', 'none']),
    receipt_each_gift: z.boolean().optional(),
    email_gift_statement: z.boolean().optional(),
    anonymous_donor: z.boolean().optional(),
    no_solicitations: z.boolean().optional(),
    notes: z.preprocess((value) => {
      if (value === '') {
        return null;
      }
      return value;
    }, z.string().trim().max(2000).nullable().optional()),
  })
  .strict();

export type DonorProfileInput = z.infer<typeof donorProfileSchema>;

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
  is_active: booleanQuerySchema,
  tags: z.string().optional(),
});

export type ContactFilterInput = z.infer<typeof contactFilterSchema>;

// Contact lookup query for lightweight navigation search
export const contactLookupQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  is_active: booleanQuerySchema.transform((value) => value ?? true),
});

export type ContactLookupQueryInput = z.infer<typeof contactLookupQuerySchema>;

export const contactMergePreviewQuerySchema = z
  .object({
    target_contact_id: uuidSchema,
  })
  .strict();

export type ContactMergePreviewQueryInput = z.infer<typeof contactMergePreviewQuerySchema>;

export const contactMergeSchema = z
  .object({
    target_contact_id: uuidSchema,
    resolutions: z.record(z.string(), z.enum(['source', 'target'])).default({}),
  })
  .strict();

export type ContactMergeInput = z.infer<typeof contactMergeSchema>;

export const contactCommunicationsQuerySchema = z
  .object({
    channel: z.enum(['email', 'sms']).optional(),
    source_type: z.enum(['appointment_reminder', 'event_reminder']).optional(),
    delivery_status: z.enum(['sent', 'failed', 'skipped']).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  })
  .strict();

export type ContactCommunicationsQueryInput = z.infer<typeof contactCommunicationsQuerySchema>;

// Contact note
export const contactNoteSchema = z
  .object({
    case_id: uuidSchema.optional(),
    note_type: noteTypeSchema.optional(),
    subject: z.string().max(500).optional(),
    content: z.string().min(1),
    is_internal: z.boolean().optional(),
    is_important: z.boolean().optional(),
    is_pinned: z.boolean().optional(),
    is_alert: z.boolean().optional(),
    is_portal_visible: z.boolean().optional(),
    outcome_impacts: z.array(interactionOutcomeImpactItemSchema).optional(),
    outcomes_mode: outcomesModeSchema.optional(),
  })
  .superRefine((payload, ctx) => {
    const hasOutcomePayload = payload.outcome_impacts !== undefined || payload.outcomes_mode !== undefined;
    if (hasOutcomePayload && !payload.case_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'case_id is required when outcome_impacts are provided',
        path: ['case_id'],
      });
    }
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
  is_portal_visible: z.boolean().optional(),
  outcome_impacts: z.array(interactionOutcomeImpactItemSchema).optional(),
  outcomes_mode: outcomesModeSchema.optional(),
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
  is_portal_visible: z.boolean().optional(),
});

export type ContactDocumentInput = z.infer<typeof contactDocumentSchema>;

// Update contact document
export const updateContactDocumentSchema = z.object({
  document_type: documentTypeSchema.optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  is_portal_visible: z.boolean().optional(),
});

export type UpdateContactDocumentInput = z.infer<typeof updateContactDocumentSchema>;

// Re-export shared schemas
export { uuidSchema } from './shared';
