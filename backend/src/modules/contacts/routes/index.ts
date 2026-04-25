import { Router } from 'express';
import { z } from 'zod';
import { optionalStrictBooleanSchema } from '@validations/shared';
import { CONTACT_ROLE_FILTER_VALUES } from '@app-types/contact';
import pool from '@config/database';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { requirePermission } from '@middleware/permissions';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { requireRequestedOrganizationContext } from '@middleware/requireRequestedOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { documentUpload, handleMulterError } from '@middleware/domains/platform';
import {
  bulkUpdateContactsSchema,
  contactEmailSchema,
  contactFilterSchema,
  contactCommunicationsQuerySchema,
  contactLookupQuerySchema,
  contactMergePreviewQuerySchema,
  contactMergeSchema,
  contactNoteSchema,
  contactRelationshipSchema,
  contactPhoneSchema,
  createContactSchema,
  updateContactDocumentSchema,
  updateContactEmailSchema,
  updateContactNoteSchema,
  updateContactRelationshipSchema,
  updateContactPhoneSchema,
  updateContactSchema,
  donorProfileSchema,
  uuidSchema,
} from '@validations/contact';
import { createContactDirectoryController } from '../controllers/directory.controller';
import { createContactDonorProfileController } from '../controllers/donorProfile.controller';
import { followUpController as followUpsController } from '@modules/followUps/controllers/followUps.handlers';
import { createContactCommunicationsController } from '../controllers/communications.controller';
import { createContactNotesController } from '../controllers/notes.controller';
import { createContactPhonesController } from '../controllers/phones.controller';
import { createContactEmailsController } from '../controllers/emails.controller';
import { createContactRelationshipsController } from '../controllers/relationships.controller';
import { createContactDocumentsController } from '../controllers/documents.controller';
import { ContactRepository } from '../repositories/contactRepository';
import { ContactNotesRepository } from '../repositories/contactNotesRepository';
import { ContactPhonesRepository } from '../repositories/contactPhonesRepository';
import { ContactEmailsRepository } from '../repositories/contactEmailsRepository';
import { ContactRelationshipsRepository } from '../repositories/contactRelationshipsRepository';
import { ContactDocumentsRepository } from '../repositories/contactDocumentsRepository';
import { ContactCommunicationsRepository } from '../repositories/contactCommunicationsRepository';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { ContactImportExportUseCase } from '../usecases/contactImportExport.usecase';
import { ContactCommunicationsUseCase } from '../usecases/contactCommunications.usecase';
import { ContactNotesUseCase } from '../usecases/contactNotes.usecase';
import { ContactPhonesUseCase } from '../usecases/contactPhones.usecase';
import { ContactEmailsUseCase } from '../usecases/contactEmails.usecase';
import { ContactRelationshipsUseCase } from '../usecases/contactRelationships.usecase';
import { ContactDocumentsUseCase } from '../usecases/contactDocuments.usecase';
import { DonorProfileService } from '../services/donorProfileService';
import { piiFieldAccessControl } from '@middleware/piiFieldAccessControl';
import { services } from '@container/services';
import { Permission } from '@utils/permissions';

const contactExportSchema = z
  .object({
    format: z.enum(['csv', 'xlsx']),
    ids: z.array(uuidSchema).optional(),
    columns: z.array(z.string().trim().min(1)).optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    role: z.enum(CONTACT_ROLE_FILTER_VALUES).optional(),
    account_id: uuidSchema.optional(),
    is_active: optionalStrictBooleanSchema,
    tags: z.array(z.string().trim().min(1)).optional(),
  })
  .strict();

const importTemplateQuerySchema = z
  .object({
    format: z
      .enum(['csv', 'xlsx', 'xslx'])
      .transform((value) => (value === 'xslx' ? 'xlsx' : value))
      .optional(),
  })
  .strict();

export const createContactsRoutes = (): Router => {
  const router = Router();
  const scopedRouter = Router();

  const directoryRepository = new ContactRepository();
  const notesRepository = new ContactNotesRepository();
  const phonesRepository = new ContactPhonesRepository();
  const emailsRepository = new ContactEmailsRepository();
  const relationshipsRepository = new ContactRelationshipsRepository();
  const documentsRepository = new ContactDocumentsRepository();
  const communicationsRepository = new ContactCommunicationsRepository();

  const directoryUseCase = new ContactDirectoryUseCase(directoryRepository);

  const directoryController = createContactDirectoryController(
    directoryUseCase,
    new ContactImportExportUseCase(pool)
  );
  const notesController = createContactNotesController(new ContactNotesUseCase(notesRepository));
  const phonesController = createContactPhonesController(new ContactPhonesUseCase(phonesRepository));
  const emailsController = createContactEmailsController(new ContactEmailsUseCase(emailsRepository));
  const relationshipsController = createContactRelationshipsController(
    new ContactRelationshipsUseCase(relationshipsRepository)
  );
  const documentsController = createContactDocumentsController(
    new ContactDocumentsUseCase(documentsRepository),
    directoryUseCase
  );
  const communicationsController = createContactCommunicationsController(
    new ContactCommunicationsUseCase(communicationsRepository),
    directoryUseCase
  );
  const donorProfileController = createContactDonorProfileController(
    directoryUseCase,
    new DonorProfileService(pool)
  );
  const requireContactsDataScope = loadDataScope('contacts');

  router.use(authenticate);

  scopedRouter.use(requireActiveOrganizationContext);
  scopedRouter.use(requireContactsDataScope);

  scopedRouter.post(
    '/export',
    requireRequestedOrganizationContext,
    validateBody(contactExportSchema),
    directoryController.exportContacts
  );
  scopedRouter.get(
    '/import/template',
    requireRequestedOrganizationContext,
    validateQuery(importTemplateQuerySchema),
    directoryController.downloadImportTemplate
  );
  scopedRouter.post(
    '/import/preview',
    requireRequestedOrganizationContext,
    documentUpload.single('file'),
    handleMulterError,
    directoryController.previewImport
  );
  scopedRouter.post(
    '/import/commit',
    requireRequestedOrganizationContext,
    documentUpload.single('file'),
    handleMulterError,
    requirePermission(Permission.CONTACT_CREATE),
    directoryController.commitImport
  );

  scopedRouter.get(
    '/',
    validateQuery(contactFilterSchema),
    piiFieldAccessControl(services.pii, 'contacts'),
    directoryController.getContacts
  );
  scopedRouter.get(
    '/lookup',
    validateQuery(contactLookupQuerySchema),
    directoryController.lookupContacts
  );
  scopedRouter.get('/tags', directoryController.getContactTags);
  scopedRouter.get('/roles', directoryController.getContactRoles);
  scopedRouter.post(
    '/bulk',
    validateBody(bulkUpdateContactsSchema),
    requirePermission(Permission.CONTACT_EDIT),
    directoryController.bulkUpdateContacts
  );

  scopedRouter.get(
    '/:id',
    validateParams(z.object({ id: uuidSchema })),
    piiFieldAccessControl(services.pii, 'contacts'),
    directoryController.getContactById
  );
  scopedRouter.get(
    '/:id/donor-profile',
    validateParams(z.object({ id: uuidSchema })),
    requirePermission(Permission.CONTACT_VIEW),
    donorProfileController.getDonorProfile
  );
  scopedRouter.put(
    '/:id/donor-profile',
    validateParams(z.object({ id: uuidSchema })),
    validateBody(donorProfileSchema),
    requirePermission(Permission.CONTACT_EDIT),
    donorProfileController.updateDonorProfile
  );
  scopedRouter.get(
    '/:id/merge-preview',
    validateParams(z.object({ id: uuidSchema })),
    validateQuery(contactMergePreviewQuerySchema),
    requirePermission(Permission.CONTACT_EDIT),
    piiFieldAccessControl(services.pii, 'contacts'),
    directoryController.getContactMergePreview
  );
  scopedRouter.post(
    '/:id/merge',
    validateParams(z.object({ id: uuidSchema })),
    validateBody(contactMergeSchema),
    requirePermission(Permission.CONTACT_EDIT),
    piiFieldAccessControl(services.pii, 'contacts'),
    directoryController.mergeContact
  );
  scopedRouter.post(
    '/',
    validateBody(createContactSchema),
    requirePermission(Permission.CONTACT_CREATE),
    piiFieldAccessControl(services.pii, 'contacts'),
    directoryController.createContact
  );
  scopedRouter.put(
    '/:id',
    validateParams(z.object({ id: uuidSchema })),
    validateBody(updateContactSchema),
    requirePermission(Permission.CONTACT_EDIT),
    piiFieldAccessControl(services.pii, 'contacts'),
    directoryController.updateContact
  );
  scopedRouter.delete(
    '/:id',
    validateParams(z.object({ id: uuidSchema })),
    requirePermission(Permission.CONTACT_DELETE),
    directoryController.deleteContact
  );
  scopedRouter.get(
    '/:id/follow-ups',
    validateParams(z.object({ id: uuidSchema })),
    followUpsController.getContactFollowUps
  );
  scopedRouter.get(
    '/:id/communications',
    validateParams(z.object({ id: uuidSchema })),
    validateQuery(contactCommunicationsQuerySchema),
    communicationsController.getContactCommunications
  );

  scopedRouter.get(
    '/:contactId/notes/timeline',
    validateParams(z.object({ contactId: uuidSchema })),
    notesController.getContactNotesTimeline
  );
  scopedRouter.get(
    '/:contactId/notes',
    validateParams(z.object({ contactId: uuidSchema })),
    notesController.getContactNotes
  );
  scopedRouter.post(
    '/:contactId/notes',
    validateParams(z.object({ contactId: uuidSchema })),
    validateBody(contactNoteSchema),
    requirePermission(Permission.CONTACT_EDIT),
    notesController.createContactNote
  );
  scopedRouter.get(
    '/notes/:noteId',
    validateParams(z.object({ noteId: uuidSchema })),
    notesController.getContactNoteById
  );
  scopedRouter.put(
    '/notes/:noteId',
    validateParams(z.object({ noteId: uuidSchema })),
    validateBody(updateContactNoteSchema),
    requirePermission(Permission.CONTACT_EDIT),
    notesController.updateContactNote
  );
  scopedRouter.delete(
    '/notes/:noteId',
    validateParams(z.object({ noteId: uuidSchema })),
    requirePermission(Permission.CONTACT_EDIT),
    notesController.deleteContactNote
  );

  scopedRouter.get(
    '/:contactId/phones',
    validateParams(z.object({ contactId: uuidSchema })),
    phonesController.getContactPhones
  );
  scopedRouter.post(
    '/:contactId/phones',
    validateParams(z.object({ contactId: uuidSchema })),
    validateBody(contactPhoneSchema),
    requirePermission(Permission.CONTACT_EDIT),
    phonesController.createContactPhone
  );
  scopedRouter.get(
    '/phones/:phoneId',
    validateParams(z.object({ phoneId: uuidSchema })),
    phonesController.getContactPhoneById
  );
  scopedRouter.put(
    '/phones/:phoneId',
    validateParams(z.object({ phoneId: uuidSchema })),
    validateBody(updateContactPhoneSchema),
    requirePermission(Permission.CONTACT_EDIT),
    phonesController.updateContactPhone
  );
  scopedRouter.delete(
    '/phones/:phoneId',
    validateParams(z.object({ phoneId: uuidSchema })),
    requirePermission(Permission.CONTACT_EDIT),
    phonesController.deleteContactPhone
  );

  scopedRouter.get(
    '/:contactId/emails',
    validateParams(z.object({ contactId: uuidSchema })),
    emailsController.getContactEmails
  );
  scopedRouter.post(
    '/:contactId/emails',
    validateParams(z.object({ contactId: uuidSchema })),
    validateBody(contactEmailSchema),
    requirePermission(Permission.CONTACT_EDIT),
    emailsController.createContactEmail
  );
  scopedRouter.get(
    '/emails/:emailId',
    validateParams(z.object({ emailId: uuidSchema })),
    emailsController.getContactEmailById
  );
  scopedRouter.put(
    '/emails/:emailId',
    validateParams(z.object({ emailId: uuidSchema })),
    validateBody(updateContactEmailSchema),
    requirePermission(Permission.CONTACT_EDIT),
    emailsController.updateContactEmail
  );
  scopedRouter.delete(
    '/emails/:emailId',
    validateParams(z.object({ emailId: uuidSchema })),
    requirePermission(Permission.CONTACT_EDIT),
    emailsController.deleteContactEmail
  );

  scopedRouter.get(
    '/:contactId/relationships',
    validateParams(z.object({ contactId: uuidSchema })),
    relationshipsController.getContactRelationships
  );
  scopedRouter.post(
    '/:contactId/relationships',
    validateParams(z.object({ contactId: uuidSchema })),
    validateBody(contactRelationshipSchema),
    requirePermission(Permission.CONTACT_EDIT),
    relationshipsController.createContactRelationship
  );
  scopedRouter.get(
    '/relationships/:relationshipId',
    validateParams(z.object({ relationshipId: uuidSchema })),
    relationshipsController.getContactRelationshipById
  );
  scopedRouter.put(
    '/relationships/:relationshipId',
    validateParams(z.object({ relationshipId: uuidSchema })),
    validateBody(updateContactRelationshipSchema),
    requirePermission(Permission.CONTACT_EDIT),
    relationshipsController.updateContactRelationship
  );
  scopedRouter.delete(
    '/relationships/:relationshipId',
    validateParams(z.object({ relationshipId: uuidSchema })),
    requirePermission(Permission.CONTACT_EDIT),
    relationshipsController.deleteContactRelationship
  );

  scopedRouter.get(
    '/:contactId/documents',
    validateParams(z.object({ contactId: uuidSchema })),
    documentsController.getContactDocuments
  );
  scopedRouter.post(
    '/:contactId/documents',
    validateParams(z.object({ contactId: uuidSchema })),
    documentUpload.single('file'),
    handleMulterError,
    requirePermission(Permission.CONTACT_EDIT),
    documentsController.uploadDocument
  );
  scopedRouter.get(
    '/documents/:documentId',
    validateParams(z.object({ documentId: uuidSchema })),
    documentsController.getDocumentById
  );
  scopedRouter.get(
    '/documents/:documentId/download',
    validateParams(z.object({ documentId: uuidSchema })),
    documentsController.downloadDocument
  );
  scopedRouter.put(
    '/documents/:documentId',
    validateParams(z.object({ documentId: uuidSchema })),
    validateBody(updateContactDocumentSchema),
    requirePermission(Permission.CONTACT_EDIT),
    documentsController.updateDocument
  );
  scopedRouter.delete(
    '/documents/:documentId',
    validateParams(z.object({ documentId: uuidSchema })),
    requirePermission(Permission.CONTACT_EDIT),
    documentsController.deleteDocument
  );

  router.use(scopedRouter);

  return router;
};

export const contactsV2Routes = createContactsRoutes();
