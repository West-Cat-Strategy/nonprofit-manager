"use strict";
/**
 * Contact Routes
 * API routes for contact management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const contactController_1 = require("../controllers/contactController");
const notesController = __importStar(require("../controllers/contactNotesController"));
const phonesController = __importStar(require("../controllers/contactPhonesController"));
const emailsController = __importStar(require("../controllers/contactEmailsController"));
const relationshipsController = __importStar(require("../controllers/contactRelationshipsController"));
const documentsController = __importStar(require("../controllers/contactDocumentsController"));
const auth_1 = require("../middleware/auth");
const dataScope_1 = require("../middleware/dataScope");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authenticate);
router.use((0, dataScope_1.loadDataScope)('contacts'));
// ============================================================================
// CONTACT ROUTES
// ============================================================================
/**
 * GET /api/contacts
 * Get all contacts with filtering and pagination
 */
router.get('/', [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('sort_by').optional().isString(),
    (0, express_validator_1.query)('sort_order').optional().isIn(['asc', 'desc']),
    (0, express_validator_1.query)('search').optional().isString(),
    (0, express_validator_1.query)('role').optional().isIn(['staff', 'volunteer', 'board']),
    (0, express_validator_1.query)('account_id').optional().isUUID(),
    (0, express_validator_1.query)('is_active').optional().isBoolean(),
], contactController_1.getContacts);
/**
 * GET /api/contacts/roles
 * Get available contact roles
 */
router.get('/roles', contactController_1.getContactRoles);
/**
 * GET /api/contacts/:id
 * Get contact by ID
 */
router.get('/:id', [(0, express_validator_1.param)('id').isUUID()], contactController_1.getContactById);
/**
 * POST /api/contacts
 * Create new contact
 */
router.post('/', [
    (0, express_validator_1.body)('account_id').optional().isUUID(),
    (0, express_validator_1.body)('first_name').notEmpty().trim().isLength({ min: 1, max: 100 }),
    (0, express_validator_1.body)('last_name').notEmpty().trim().isLength({ min: 1, max: 100 }),
    (0, express_validator_1.body)('middle_name').optional().isString().trim(),
    (0, express_validator_1.body)('salutation').optional().isString().trim(),
    (0, express_validator_1.body)('suffix').optional().isString().trim(),
    (0, express_validator_1.body)('birth_date').optional().isISO8601(),
    (0, express_validator_1.body)('gender').optional().isString().trim(),
    (0, express_validator_1.body)('pronouns').optional().isString().trim(),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail(),
    (0, express_validator_1.body)('phone').optional().isString().trim(),
    (0, express_validator_1.body)('mobile_phone').optional().isString().trim(),
    (0, express_validator_1.body)('address_line1').optional().isString().trim(),
    (0, express_validator_1.body)('address_line2').optional().isString().trim(),
    (0, express_validator_1.body)('city').optional().isString().trim(),
    (0, express_validator_1.body)('state_province').optional().isString().trim(),
    (0, express_validator_1.body)('postal_code').optional().isString().trim(),
    (0, express_validator_1.body)('country').optional().isString().trim(),
    (0, express_validator_1.body)('job_title').optional().isString().trim(),
    (0, express_validator_1.body)('department').optional().isString().trim(),
    (0, express_validator_1.body)('preferred_contact_method').optional().isString().trim(),
    (0, express_validator_1.body)('do_not_email').optional().isBoolean(),
    (0, express_validator_1.body)('do_not_phone').optional().isBoolean(),
    (0, express_validator_1.body)('notes').optional().isString().trim(),
    (0, express_validator_1.body)('roles').optional().isArray(),
    (0, express_validator_1.body)('roles.*').optional().isString().trim(),
], contactController_1.createContact);
/**
 * PUT /api/contacts/:id
 * Update contact
 */
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('account_id').optional().isUUID(),
    (0, express_validator_1.body)('first_name').optional().notEmpty().trim().isLength({ min: 1, max: 100 }),
    (0, express_validator_1.body)('last_name').optional().notEmpty().trim().isLength({ min: 1, max: 100 }),
    (0, express_validator_1.body)('middle_name').optional().isString().trim(),
    (0, express_validator_1.body)('salutation').optional().isString().trim(),
    (0, express_validator_1.body)('suffix').optional().isString().trim(),
    (0, express_validator_1.body)('birth_date').optional({ nullable: true }).isISO8601(),
    (0, express_validator_1.body)('gender').optional({ nullable: true }).isString().trim(),
    (0, express_validator_1.body)('pronouns').optional({ nullable: true }).isString().trim(),
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail(),
    (0, express_validator_1.body)('phone').optional().isString().trim(),
    (0, express_validator_1.body)('mobile_phone').optional().isString().trim(),
    (0, express_validator_1.body)('address_line1').optional().isString().trim(),
    (0, express_validator_1.body)('address_line2').optional().isString().trim(),
    (0, express_validator_1.body)('city').optional().isString().trim(),
    (0, express_validator_1.body)('state_province').optional().isString().trim(),
    (0, express_validator_1.body)('postal_code').optional().isString().trim(),
    (0, express_validator_1.body)('country').optional().isString().trim(),
    (0, express_validator_1.body)('job_title').optional().isString().trim(),
    (0, express_validator_1.body)('department').optional().isString().trim(),
    (0, express_validator_1.body)('preferred_contact_method').optional().isString().trim(),
    (0, express_validator_1.body)('do_not_email').optional().isBoolean(),
    (0, express_validator_1.body)('do_not_phone').optional().isBoolean(),
    (0, express_validator_1.body)('notes').optional().isString().trim(),
    (0, express_validator_1.body)('is_active').optional().isBoolean(),
    (0, express_validator_1.body)('roles').optional().isArray(),
    (0, express_validator_1.body)('roles.*').optional().isString().trim(),
], contactController_1.updateContact);
/**
 * DELETE /api/contacts/:id
 * Soft delete contact
 */
router.delete('/:id', [(0, express_validator_1.param)('id').isUUID()], contactController_1.deleteContact);
// ============================================================================
// CONTACT NOTES ROUTES
// ============================================================================
/**
 * GET /api/contacts/:contactId/notes
 * Get all notes for a contact
 */
router.get('/:contactId/notes', [(0, express_validator_1.param)('contactId').isUUID()], notesController.getContactNotes);
/**
 * POST /api/contacts/:contactId/notes
 * Create a new note for a contact
 */
router.post('/:contactId/notes', [
    (0, express_validator_1.param)('contactId').isUUID(),
    (0, express_validator_1.body)('case_id').optional().isUUID(),
    (0, express_validator_1.body)('note_type').optional().isIn(['note', 'email', 'call', 'meeting', 'update', 'other']),
    (0, express_validator_1.body)('subject').optional().isString().trim(),
    (0, express_validator_1.body)('content').notEmpty().isString(),
    (0, express_validator_1.body)('is_internal').optional().isBoolean(),
    (0, express_validator_1.body)('is_important').optional().isBoolean(),
    (0, express_validator_1.body)('is_pinned').optional().isBoolean(),
], notesController.createContactNote);
/**
 * GET /api/contacts/notes/:noteId
 * Get a single note by ID
 */
router.get('/notes/:noteId', [(0, express_validator_1.param)('noteId').isUUID()], notesController.getContactNoteById);
/**
 * PUT /api/contacts/notes/:noteId
 * Update a note
 */
router.put('/notes/:noteId', [
    (0, express_validator_1.param)('noteId').isUUID(),
    (0, express_validator_1.body)('note_type').optional().isIn(['note', 'email', 'call', 'meeting', 'update', 'other']),
    (0, express_validator_1.body)('subject').optional().isString().trim(),
    (0, express_validator_1.body)('content').optional().isString(),
    (0, express_validator_1.body)('is_internal').optional().isBoolean(),
    (0, express_validator_1.body)('is_important').optional().isBoolean(),
    (0, express_validator_1.body)('is_pinned').optional().isBoolean(),
], notesController.updateContactNote);
/**
 * DELETE /api/contacts/notes/:noteId
 * Delete a note
 */
router.delete('/notes/:noteId', [(0, express_validator_1.param)('noteId').isUUID()], notesController.deleteContactNote);
// ============================================================================
// CONTACT PHONE NUMBERS ROUTES
// ============================================================================
/**
 * GET /api/contacts/:contactId/phones
 * Get all phone numbers for a contact
 */
router.get('/:contactId/phones', [(0, express_validator_1.param)('contactId').isUUID()], phonesController.getContactPhones);
/**
 * POST /api/contacts/:contactId/phones
 * Create a new phone number for a contact
 */
router.post('/:contactId/phones', [
    (0, express_validator_1.param)('contactId').isUUID(),
    (0, express_validator_1.body)('phone_number').notEmpty().isString().trim(),
    (0, express_validator_1.body)('label').optional().isIn(['home', 'work', 'mobile', 'fax', 'other']),
    (0, express_validator_1.body)('is_primary').optional().isBoolean(),
], phonesController.createContactPhone);
/**
 * GET /api/contacts/phones/:phoneId
 * Get a single phone number by ID
 */
router.get('/phones/:phoneId', [(0, express_validator_1.param)('phoneId').isUUID()], phonesController.getContactPhoneById);
/**
 * PUT /api/contacts/phones/:phoneId
 * Update a phone number
 */
router.put('/phones/:phoneId', [
    (0, express_validator_1.param)('phoneId').isUUID(),
    (0, express_validator_1.body)('phone_number').optional().isString().trim(),
    (0, express_validator_1.body)('label').optional().isIn(['home', 'work', 'mobile', 'fax', 'other']),
    (0, express_validator_1.body)('is_primary').optional().isBoolean(),
], phonesController.updateContactPhone);
/**
 * DELETE /api/contacts/phones/:phoneId
 * Delete a phone number
 */
router.delete('/phones/:phoneId', [(0, express_validator_1.param)('phoneId').isUUID()], phonesController.deleteContactPhone);
// ============================================================================
// CONTACT EMAIL ADDRESSES ROUTES
// ============================================================================
/**
 * GET /api/contacts/:contactId/emails
 * Get all email addresses for a contact
 */
router.get('/:contactId/emails', [(0, express_validator_1.param)('contactId').isUUID()], emailsController.getContactEmails);
/**
 * POST /api/contacts/:contactId/emails
 * Create a new email address for a contact
 */
router.post('/:contactId/emails', [
    (0, express_validator_1.param)('contactId').isUUID(),
    (0, express_validator_1.body)('email_address').notEmpty().isEmail().normalizeEmail(),
    (0, express_validator_1.body)('label').optional().isIn(['personal', 'work', 'other']),
    (0, express_validator_1.body)('is_primary').optional().isBoolean(),
], emailsController.createContactEmail);
/**
 * GET /api/contacts/emails/:emailId
 * Get a single email address by ID
 */
router.get('/emails/:emailId', [(0, express_validator_1.param)('emailId').isUUID()], emailsController.getContactEmailById);
/**
 * PUT /api/contacts/emails/:emailId
 * Update an email address
 */
router.put('/emails/:emailId', [
    (0, express_validator_1.param)('emailId').isUUID(),
    (0, express_validator_1.body)('email_address').optional().isEmail().normalizeEmail(),
    (0, express_validator_1.body)('label').optional().isIn(['personal', 'work', 'other']),
    (0, express_validator_1.body)('is_primary').optional().isBoolean(),
], emailsController.updateContactEmail);
/**
 * DELETE /api/contacts/emails/:emailId
 * Delete an email address
 */
router.delete('/emails/:emailId', [(0, express_validator_1.param)('emailId').isUUID()], emailsController.deleteContactEmail);
// ============================================================================
// CONTACT RELATIONSHIPS ROUTES
// ============================================================================
/**
 * GET /api/contacts/:contactId/relationships
 * Get all relationships for a contact
 */
router.get('/:contactId/relationships', [(0, express_validator_1.param)('contactId').isUUID()], relationshipsController.getContactRelationships);
/**
 * POST /api/contacts/:contactId/relationships
 * Create a new relationship
 */
router.post('/:contactId/relationships', [
    (0, express_validator_1.param)('contactId').isUUID(),
    (0, express_validator_1.body)('related_contact_id').notEmpty().isUUID(),
    (0, express_validator_1.body)('relationship_type').notEmpty().isIn([
        'contact_person', 'spouse', 'parent', 'child', 'sibling', 'family_member',
        'emergency_contact', 'social_worker', 'caregiver', 'advocate',
        'support_person', 'roommate', 'friend', 'colleague', 'other'
    ]),
    (0, express_validator_1.body)('relationship_label').optional().isString().trim(),
    (0, express_validator_1.body)('is_bidirectional').optional().isBoolean(),
    (0, express_validator_1.body)('inverse_relationship_type').optional().isIn([
        'contact_person', 'spouse', 'parent', 'child', 'sibling', 'family_member',
        'emergency_contact', 'social_worker', 'caregiver', 'advocate',
        'support_person', 'roommate', 'friend', 'colleague', 'other'
    ]),
    (0, express_validator_1.body)('notes').optional().isString().trim(),
], relationshipsController.createContactRelationship);
/**
 * GET /api/contacts/relationships/:relationshipId
 * Get a single relationship by ID
 */
router.get('/relationships/:relationshipId', [(0, express_validator_1.param)('relationshipId').isUUID()], relationshipsController.getContactRelationshipById);
/**
 * PUT /api/contacts/relationships/:relationshipId
 * Update a relationship
 */
router.put('/relationships/:relationshipId', [
    (0, express_validator_1.param)('relationshipId').isUUID(),
    (0, express_validator_1.body)('relationship_type').optional().isIn([
        'contact_person', 'spouse', 'parent', 'child', 'sibling', 'family_member',
        'emergency_contact', 'social_worker', 'caregiver', 'advocate',
        'support_person', 'roommate', 'friend', 'colleague', 'other'
    ]),
    (0, express_validator_1.body)('relationship_label').optional().isString().trim(),
    (0, express_validator_1.body)('is_bidirectional').optional().isBoolean(),
    (0, express_validator_1.body)('inverse_relationship_type').optional().isIn([
        'contact_person', 'spouse', 'parent', 'child', 'sibling', 'family_member',
        'emergency_contact', 'social_worker', 'caregiver', 'advocate',
        'support_person', 'roommate', 'friend', 'colleague', 'other'
    ]),
    (0, express_validator_1.body)('notes').optional().isString().trim(),
    (0, express_validator_1.body)('is_active').optional().isBoolean(),
], relationshipsController.updateContactRelationship);
/**
 * DELETE /api/contacts/relationships/:relationshipId
 * Soft delete a relationship
 */
router.delete('/relationships/:relationshipId', [(0, express_validator_1.param)('relationshipId').isUUID()], relationshipsController.deleteContactRelationship);
// ============================================================================
// CONTACT DOCUMENTS ROUTES
// ============================================================================
/**
 * GET /api/contacts/:contactId/documents
 * Get all documents for a contact
 */
router.get('/:contactId/documents', [(0, express_validator_1.param)('contactId').isUUID()], documentsController.getContactDocuments);
/**
 * POST /api/contacts/:contactId/documents
 * Upload a new document for a contact
 */
router.post('/:contactId/documents', [(0, express_validator_1.param)('contactId').isUUID()], upload_1.documentUpload.single('file'), upload_1.handleMulterError, documentsController.uploadDocument);
/**
 * GET /api/contacts/documents/:documentId
 * Get a single document by ID
 */
router.get('/documents/:documentId', [(0, express_validator_1.param)('documentId').isUUID()], documentsController.getDocumentById);
/**
 * GET /api/contacts/documents/:documentId/download
 * Download a document file
 */
router.get('/documents/:documentId/download', [(0, express_validator_1.param)('documentId').isUUID()], documentsController.downloadDocument);
/**
 * PUT /api/contacts/documents/:documentId
 * Update document metadata
 */
router.put('/documents/:documentId', [
    (0, express_validator_1.param)('documentId').isUUID(),
    (0, express_validator_1.body)('document_type').optional().isIn([
        'identification', 'legal', 'medical', 'financial',
        'correspondence', 'photo', 'consent_form', 'assessment', 'report', 'other'
    ]),
    (0, express_validator_1.body)('title').optional().isString().trim(),
    (0, express_validator_1.body)('description').optional().isString().trim(),
], documentsController.updateDocument);
/**
 * DELETE /api/contacts/documents/:documentId
 * Delete a document (soft delete)
 */
router.delete('/documents/:documentId', [(0, express_validator_1.param)('documentId').isUUID()], documentsController.deleteDocument);
exports.default = router;
//# sourceMappingURL=contacts.js.map