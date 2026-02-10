/**
 * Contact Routes
 * API routes for contact management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validation';
import {
  getContacts,
  getContactTags,
  getContactRoles,
  bulkUpdateContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from '../controllers/contactController';
import * as notesController from '../controllers/contactNotesController';
import * as phonesController from '../controllers/contactPhonesController';
import * as emailsController from '../controllers/contactEmailsController';
import * as relationshipsController from '../controllers/contactRelationshipsController';
import * as documentsController from '../controllers/contactDocumentsController';
import { authenticate } from '../middleware/auth';
import { loadDataScope } from '../middleware/dataScope';
import { documentUpload, handleMulterError } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(loadDataScope('contacts'));

// ============================================================================
// CONTACT ROUTES
// ============================================================================

/**
 * GET /api/contacts
 * Get all contacts with filtering and pagination
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sort_by').optional().isString(),
    query('sort_order').optional().isIn(['asc', 'desc']),
    query('search').optional().isString(),
    query('role').optional().isIn(['staff', 'volunteer', 'board']),
    query('account_id').optional().isUUID(),
    query('is_active').optional().isBoolean(),
    query('tags').optional().isString(),
    validateRequest,
  ],
  getContacts
);

/**
 * GET /api/contacts/tags
 * Get distinct tags used on contacts
 */
router.get('/tags', getContactTags);

/**
 * GET /api/contacts/roles
 * Get available contact roles
 */
router.get('/roles', getContactRoles);

/**
 * POST /api/contacts/bulk
 * Bulk update contacts (tags and/or active status)
 */
router.post(
  '/bulk',
  [
    body('contactIds').isArray({ min: 1 }),
    body('contactIds.*').isUUID(),
    body('is_active').optional().isBoolean(),
    body('tags').optional().isObject(),
    body('tags.add').optional().isArray(),
    body('tags.add.*').optional().isString().trim().isLength({ min: 1, max: 40 }),
    body('tags.remove').optional().isArray(),
    body('tags.remove.*').optional().isString().trim().isLength({ min: 1, max: 40 }),
    body('tags.replace').optional().isArray(),
    body('tags.replace.*').optional().isString().trim().isLength({ min: 1, max: 40 }),
    validateRequest,
  ],
  bulkUpdateContacts
);

/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
router.get('/:id', [param('id').isUUID(), validateRequest], getContactById);

/**
 * POST /api/contacts
 * Create new contact
 */
router.post(
  '/',
  [
    body('account_id').optional().isUUID(),
    body('first_name').notEmpty().trim().isLength({ min: 1, max: 100 }),
    body('last_name').notEmpty().trim().isLength({ min: 1, max: 100 }),
    body('middle_name').optional().isString().trim(),
    body('salutation').optional().isString().trim(),
    body('suffix').optional().isString().trim(),
    body('birth_date').optional().isISO8601(),
    body('gender').optional().isString().trim(),
    body('pronouns').optional().isString().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isString().trim(),
    body('mobile_phone').optional().isString().trim(),
    body('address_line1').optional().isString().trim(),
    body('address_line2').optional().isString().trim(),
    body('city').optional().isString().trim(),
    body('state_province').optional().isString().trim(),
    body('postal_code').optional().isString().trim(),
    body('country').optional().isString().trim(),
    body('job_title').optional().isString().trim(),
    body('department').optional().isString().trim(),
    body('preferred_contact_method').optional().isString().trim(),
    body('no_fixed_address').optional().isBoolean(),
    body('do_not_email').optional().isBoolean(),
    body('do_not_phone').optional().isBoolean(),
    body('notes').optional().isString().trim(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString().trim().isLength({ min: 1, max: 40 }),
    body('roles').optional().isArray(),
    body('roles.*').optional().isString().trim(),
    validateRequest,
  ],
  createContact
);

/**
 * PUT /api/contacts/:id
 * Update contact
 */
router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('account_id').optional().isUUID(),
    body('first_name').optional().notEmpty().trim().isLength({ min: 1, max: 100 }),
    body('last_name').optional().notEmpty().trim().isLength({ min: 1, max: 100 }),
    body('middle_name').optional().isString().trim(),
    body('salutation').optional().isString().trim(),
    body('suffix').optional().isString().trim(),
    body('birth_date').optional({ nullable: true }).isISO8601(),
    body('gender').optional({ nullable: true }).isString().trim(),
    body('pronouns').optional({ nullable: true }).isString().trim(),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isString().trim(),
    body('mobile_phone').optional().isString().trim(),
    body('address_line1').optional().isString().trim(),
    body('address_line2').optional().isString().trim(),
    body('city').optional().isString().trim(),
    body('state_province').optional().isString().trim(),
    body('postal_code').optional().isString().trim(),
    body('country').optional().isString().trim(),
    body('job_title').optional().isString().trim(),
    body('department').optional().isString().trim(),
    body('preferred_contact_method').optional().isString().trim(),
    body('no_fixed_address').optional().isBoolean(),
    body('do_not_email').optional().isBoolean(),
    body('do_not_phone').optional().isBoolean(),
    body('notes').optional().isString().trim(),
    body('is_active').optional().isBoolean(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString().trim().isLength({ min: 1, max: 40 }),
    body('roles').optional().isArray(),
    body('roles.*').optional().isString().trim(),
    validateRequest,
  ],
  updateContact
);

/**
 * DELETE /api/contacts/:id
 * Soft delete contact
 */
router.delete('/:id', [param('id').isUUID(), validateRequest], deleteContact);

// ============================================================================
// CONTACT NOTES ROUTES
// ============================================================================

/**
 * GET /api/contacts/:contactId/notes
 * Get all notes for a contact
 */
router.get(
  '/:contactId/notes',
  [param('contactId').isUUID()],
  notesController.getContactNotes
);

/**
 * POST /api/contacts/:contactId/notes
 * Create a new note for a contact
 */
router.post(
  '/:contactId/notes',
  [
    param('contactId').isUUID(),
    body('case_id').optional().isUUID(),
    body('note_type').optional().isIn(['note', 'email', 'call', 'meeting', 'update', 'other']),
    body('subject').optional().isString().trim(),
    body('content').notEmpty().isString(),
    body('is_internal').optional().isBoolean(),
    body('is_important').optional().isBoolean(),
    body('is_pinned').optional().isBoolean(),
    body('is_alert').optional().isBoolean(),
  ],
  notesController.createContactNote
);

/**
 * GET /api/contacts/notes/:noteId
 * Get a single note by ID
 */
router.get(
  '/notes/:noteId',
  [param('noteId').isUUID()],
  notesController.getContactNoteById
);

/**
 * PUT /api/contacts/notes/:noteId
 * Update a note
 */
router.put(
  '/notes/:noteId',
  [
    param('noteId').isUUID(),
    body('note_type').optional().isIn(['note', 'email', 'call', 'meeting', 'update', 'other']),
    body('subject').optional().isString().trim(),
    body('content').optional().isString(),
    body('is_internal').optional().isBoolean(),
    body('is_important').optional().isBoolean(),
    body('is_pinned').optional().isBoolean(),
    body('is_alert').optional().isBoolean(),
  ],
  notesController.updateContactNote
);

/**
 * DELETE /api/contacts/notes/:noteId
 * Delete a note
 */
router.delete(
  '/notes/:noteId',
  [param('noteId').isUUID()],
  notesController.deleteContactNote
);

// ============================================================================
// CONTACT PHONE NUMBERS ROUTES
// ============================================================================

/**
 * GET /api/contacts/:contactId/phones
 * Get all phone numbers for a contact
 */
router.get(
  '/:contactId/phones',
  [param('contactId').isUUID()],
  phonesController.getContactPhones
);

/**
 * POST /api/contacts/:contactId/phones
 * Create a new phone number for a contact
 */
router.post(
  '/:contactId/phones',
  [
    param('contactId').isUUID(),
    body('phone_number').notEmpty().isString().trim(),
    body('label').optional().isIn(['home', 'work', 'mobile', 'fax', 'other']),
    body('is_primary').optional().isBoolean(),
  ],
  phonesController.createContactPhone
);

/**
 * GET /api/contacts/phones/:phoneId
 * Get a single phone number by ID
 */
router.get(
  '/phones/:phoneId',
  [param('phoneId').isUUID()],
  phonesController.getContactPhoneById
);

/**
 * PUT /api/contacts/phones/:phoneId
 * Update a phone number
 */
router.put(
  '/phones/:phoneId',
  [
    param('phoneId').isUUID(),
    body('phone_number').optional().isString().trim(),
    body('label').optional().isIn(['home', 'work', 'mobile', 'fax', 'other']),
    body('is_primary').optional().isBoolean(),
  ],
  phonesController.updateContactPhone
);

/**
 * DELETE /api/contacts/phones/:phoneId
 * Delete a phone number
 */
router.delete(
  '/phones/:phoneId',
  [param('phoneId').isUUID()],
  phonesController.deleteContactPhone
);

// ============================================================================
// CONTACT EMAIL ADDRESSES ROUTES
// ============================================================================

/**
 * GET /api/contacts/:contactId/emails
 * Get all email addresses for a contact
 */
router.get(
  '/:contactId/emails',
  [param('contactId').isUUID()],
  emailsController.getContactEmails
);

/**
 * POST /api/contacts/:contactId/emails
 * Create a new email address for a contact
 */
router.post(
  '/:contactId/emails',
  [
    param('contactId').isUUID(),
    body('email_address').notEmpty().isEmail().normalizeEmail(),
    body('label').optional().isIn(['personal', 'work', 'other']),
    body('is_primary').optional().isBoolean(),
  ],
  emailsController.createContactEmail
);

/**
 * GET /api/contacts/emails/:emailId
 * Get a single email address by ID
 */
router.get(
  '/emails/:emailId',
  [param('emailId').isUUID()],
  emailsController.getContactEmailById
);

/**
 * PUT /api/contacts/emails/:emailId
 * Update an email address
 */
router.put(
  '/emails/:emailId',
  [
    param('emailId').isUUID(),
    body('email_address').optional().isEmail().normalizeEmail(),
    body('label').optional().isIn(['personal', 'work', 'other']),
    body('is_primary').optional().isBoolean(),
  ],
  emailsController.updateContactEmail
);

/**
 * DELETE /api/contacts/emails/:emailId
 * Delete an email address
 */
router.delete(
  '/emails/:emailId',
  [param('emailId').isUUID()],
  emailsController.deleteContactEmail
);

// ============================================================================
// CONTACT RELATIONSHIPS ROUTES
// ============================================================================

/**
 * GET /api/contacts/:contactId/relationships
 * Get all relationships for a contact
 */
router.get(
  '/:contactId/relationships',
  [param('contactId').isUUID()],
  relationshipsController.getContactRelationships
);

/**
 * POST /api/contacts/:contactId/relationships
 * Create a new relationship
 */
router.post(
  '/:contactId/relationships',
  [
    param('contactId').isUUID(),
    body('related_contact_id').notEmpty().isUUID(),
    body('relationship_type').notEmpty().isIn([
      'contact_person', 'spouse', 'parent', 'child', 'sibling', 'family_member',
      'emergency_contact', 'social_worker', 'caregiver', 'advocate',
      'support_person', 'roommate', 'friend', 'colleague', 'other'
    ]),
    body('relationship_label').optional().isString().trim(),
    body('is_bidirectional').optional().isBoolean(),
    body('inverse_relationship_type').optional().isIn([
      'contact_person', 'spouse', 'parent', 'child', 'sibling', 'family_member',
      'emergency_contact', 'social_worker', 'caregiver', 'advocate',
      'support_person', 'roommate', 'friend', 'colleague', 'other'
    ]),
    body('notes').optional().isString().trim(),
  ],
  relationshipsController.createContactRelationship
);

/**
 * GET /api/contacts/relationships/:relationshipId
 * Get a single relationship by ID
 */
router.get(
  '/relationships/:relationshipId',
  [param('relationshipId').isUUID()],
  relationshipsController.getContactRelationshipById
);

/**
 * PUT /api/contacts/relationships/:relationshipId
 * Update a relationship
 */
router.put(
  '/relationships/:relationshipId',
  [
    param('relationshipId').isUUID(),
    body('relationship_type').optional().isIn([
      'contact_person', 'spouse', 'parent', 'child', 'sibling', 'family_member',
      'emergency_contact', 'social_worker', 'caregiver', 'advocate',
      'support_person', 'roommate', 'friend', 'colleague', 'other'
    ]),
    body('relationship_label').optional().isString().trim(),
    body('is_bidirectional').optional().isBoolean(),
    body('inverse_relationship_type').optional().isIn([
      'contact_person', 'spouse', 'parent', 'child', 'sibling', 'family_member',
      'emergency_contact', 'social_worker', 'caregiver', 'advocate',
      'support_person', 'roommate', 'friend', 'colleague', 'other'
    ]),
    body('notes').optional().isString().trim(),
    body('is_active').optional().isBoolean(),
  ],
  relationshipsController.updateContactRelationship
);

/**
 * DELETE /api/contacts/relationships/:relationshipId
 * Soft delete a relationship
 */
router.delete(
  '/relationships/:relationshipId',
  [param('relationshipId').isUUID()],
  relationshipsController.deleteContactRelationship
);

// ============================================================================
// CONTACT DOCUMENTS ROUTES
// ============================================================================

/**
 * GET /api/contacts/:contactId/documents
 * Get all documents for a contact
 */
router.get(
  '/:contactId/documents',
  [param('contactId').isUUID()],
  documentsController.getContactDocuments
);

/**
 * POST /api/contacts/:contactId/documents
 * Upload a new document for a contact
 */
router.post(
  '/:contactId/documents',
  [param('contactId').isUUID()],
  documentUpload.single('file'),
  handleMulterError,
  documentsController.uploadDocument
);

/**
 * GET /api/contacts/documents/:documentId
 * Get a single document by ID
 */
router.get(
  '/documents/:documentId',
  [param('documentId').isUUID()],
  documentsController.getDocumentById
);

/**
 * GET /api/contacts/documents/:documentId/download
 * Download a document file
 */
router.get(
  '/documents/:documentId/download',
  [param('documentId').isUUID()],
  documentsController.downloadDocument
);

/**
 * PUT /api/contacts/documents/:documentId
 * Update document metadata
 */
router.put(
  '/documents/:documentId',
  [
    param('documentId').isUUID(),
    body('document_type').optional().isIn([
      'identification', 'legal', 'medical', 'financial',
      'correspondence', 'photo', 'consent_form', 'assessment', 'report', 'other'
    ]),
    body('title').optional().isString().trim(),
    body('description').optional().isString().trim(),
  ],
  documentsController.updateDocument
);

/**
 * DELETE /api/contacts/documents/:documentId
 * Delete a document (soft delete)
 */
router.delete(
  '/documents/:documentId',
  [param('documentId').isUUID()],
  documentsController.deleteDocument
);

export default router;
