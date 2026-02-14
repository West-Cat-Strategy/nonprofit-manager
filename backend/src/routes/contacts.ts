/**
 * Contact Routes
 * API routes for contact management
 */

import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '@middleware/zodValidation';
import {
  getContacts,
  getContactTags,
  getContactRoles,
  bulkUpdateContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from '@controllers/domains/engagement';
import * as notesController from '@controllers/domains/engagement';
import * as phonesController from '@controllers/domains/engagement';
import * as emailsController from '@controllers/domains/engagement';
import * as relationshipsController from '@controllers/domains/engagement';
import * as documentsController from '@controllers/domains/engagement';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { documentUpload, handleMulterError } from '@middleware/domains/platform';
import {
  createContactSchema,
  updateContactSchema,
  bulkUpdateContactsSchema,
  contactNoteSchema,
  updateContactNoteSchema,
  contactPhoneSchema,
  updateContactPhoneSchema,
  contactEmailSchema,
  updateContactEmailSchema,
  contactRelationshipSchema,
  updateContactRelationshipSchema,
  updateContactDocumentSchema,
  uuidSchema,
} from '@validations/contact';
import { z } from 'zod';

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
  validateQuery(z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    role: z.enum(['staff', 'volunteer', 'board']).optional(),
    account_id: uuidSchema.optional(),
    is_active: z.boolean().optional(),
    tags: z.string().optional(),
  })),
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
  validateBody(bulkUpdateContactsSchema),
  bulkUpdateContacts
);

/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
router.get(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  getContactById
);

/**
 * POST /api/contacts
 * Create new contact
 */
router.post(
  '/',
  validateBody(createContactSchema),
  createContact
);

/**
 * PUT /api/contacts/:id
 * Update contact
 */
router.put(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  validateBody(updateContactSchema),
  updateContact
);

/**
 * DELETE /api/contacts/:id
 * Soft delete contact
 */
router.delete(
  '/:id',
  validateParams(z.object({ id: uuidSchema })),
  deleteContact
);

// ============================================================================
// CONTACT NOTES ROUTES
// ============================================================================

/**
 * GET /api/contacts/:contactId/notes
 * Get all notes for a contact
 */
router.get(
  '/:contactId/notes',
  validateParams(z.object({ contactId: uuidSchema })),
  notesController.getContactNotes
);

/**
 * POST /api/contacts/:contactId/notes
 * Create a new note for a contact
 */
router.post(
  '/:contactId/notes',
  validateParams(z.object({ contactId: uuidSchema })),
  validateBody(contactNoteSchema),
  notesController.createContactNote
);

/**
 * GET /api/contacts/notes/:noteId
 * Get a single note by ID
 */
router.get(
  '/notes/:noteId',
  validateParams(z.object({ noteId: uuidSchema })),
  notesController.getContactNoteById
);

/**
 * PUT /api/contacts/notes/:noteId
 * Update a note
 */
router.put(
  '/notes/:noteId',
  validateParams(z.object({ noteId: uuidSchema })),
  validateBody(updateContactNoteSchema),
  notesController.updateContactNote
);

/**
 * DELETE /api/contacts/notes/:noteId
 * Delete a note
 */
router.delete(
  '/notes/:noteId',
  validateParams(z.object({ noteId: uuidSchema })),
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
  validateParams(z.object({ contactId: uuidSchema })),
  phonesController.getContactPhones
);

/**
 * POST /api/contacts/:contactId/phones
 * Create a new phone number for a contact
 */
router.post(
  '/:contactId/phones',
  validateParams(z.object({ contactId: uuidSchema })),
  validateBody(contactPhoneSchema),
  phonesController.createContactPhone
);

/**
 * GET /api/contacts/phones/:phoneId
 * Get a single phone number by ID
 */
router.get(
  '/phones/:phoneId',
  validateParams(z.object({ phoneId: uuidSchema })),
  phonesController.getContactPhoneById
);

/**
 * PUT /api/contacts/phones/:phoneId
 * Update a phone number
 */
router.put(
  '/phones/:phoneId',
  validateParams(z.object({ phoneId: uuidSchema })),
  validateBody(updateContactPhoneSchema),
  phonesController.updateContactPhone
);

/**
 * DELETE /api/contacts/phones/:phoneId
 * Delete a phone number
 */
router.delete(
  '/phones/:phoneId',
  validateParams(z.object({ phoneId: uuidSchema })),
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
  validateParams(z.object({ contactId: uuidSchema })),
  emailsController.getContactEmails
);

/**
 * POST /api/contacts/:contactId/emails
 * Create a new email address for a contact
 */
router.post(
  '/:contactId/emails',
  validateParams(z.object({ contactId: uuidSchema })),
  validateBody(contactEmailSchema),
  emailsController.createContactEmail
);

/**
 * GET /api/contacts/emails/:emailId
 * Get a single email address by ID
 */
router.get(
  '/emails/:emailId',
  validateParams(z.object({ emailId: uuidSchema })),
  emailsController.getContactEmailById
);

/**
 * PUT /api/contacts/emails/:emailId
 * Update an email address
 */
router.put(
  '/emails/:emailId',
  validateParams(z.object({ emailId: uuidSchema })),
  validateBody(updateContactEmailSchema),
  emailsController.updateContactEmail
);

/**
 * DELETE /api/contacts/emails/:emailId
 * Delete an email address
 */
router.delete(
  '/emails/:emailId',
  validateParams(z.object({ emailId: uuidSchema })),
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
  validateParams(z.object({ contactId: uuidSchema })),
  relationshipsController.getContactRelationships
);

/**
 * POST /api/contacts/:contactId/relationships
 * Create a new relationship
 */
router.post(
  '/:contactId/relationships',
  validateParams(z.object({ contactId: uuidSchema })),
  validateBody(contactRelationshipSchema),
  relationshipsController.createContactRelationship
);

/**
 * GET /api/contacts/relationships/:relationshipId
 * Get a single relationship by ID
 */
router.get(
  '/relationships/:relationshipId',
  validateParams(z.object({ relationshipId: uuidSchema })),
  relationshipsController.getContactRelationshipById
);

/**
 * PUT /api/contacts/relationships/:relationshipId
 * Update a relationship
 */
router.put(
  '/relationships/:relationshipId',
  validateParams(z.object({ relationshipId: uuidSchema })),
  validateBody(updateContactRelationshipSchema),
  relationshipsController.updateContactRelationship
);

/**
 * DELETE /api/contacts/relationships/:relationshipId
 * Soft delete a relationship
 */
router.delete(
  '/relationships/:relationshipId',
  validateParams(z.object({ relationshipId: uuidSchema })),
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
  validateParams(z.object({ contactId: uuidSchema })),
  documentsController.getContactDocuments
);

/**
 * POST /api/contacts/:contactId/documents
 * Upload a new document for a contact
 */
router.post(
  '/:contactId/documents',
  validateParams(z.object({ contactId: uuidSchema })),
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
  validateParams(z.object({ documentId: uuidSchema })),
  documentsController.getDocumentById
);

/**
 * GET /api/contacts/documents/:documentId/download
 * Download a document file
 */
router.get(
  '/documents/:documentId/download',
  validateParams(z.object({ documentId: uuidSchema })),
  documentsController.downloadDocument
);

/**
 * PUT /api/contacts/documents/:documentId
 * Update document metadata
 */
router.put(
  '/documents/:documentId',
  validateParams(z.object({ documentId: uuidSchema })),
  validateBody(updateContactDocumentSchema),
  documentsController.updateDocument
);

/**
 * DELETE /api/contacts/documents/:documentId
 * Delete a document (soft delete)
 */
router.delete(
  '/documents/:documentId',
  validateParams(z.object({ documentId: uuidSchema })),
  documentsController.deleteDocument
);

export default router;
