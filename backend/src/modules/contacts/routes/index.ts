import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { loadDataScope } from '@middleware/domains/data';
import { requireActiveOrganizationContext } from '@middleware/requireActiveOrganizationContext';
import { validateBody, validateParams, validateQuery } from '@middleware/zodValidation';
import { documentUpload, handleMulterError } from '@middleware/domains/platform';
import {
  bulkUpdateContactsSchema,
  contactEmailSchema,
  contactFilterSchema,
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
  uuidSchema,
} from '@validations/contact';
import { createContactDirectoryController } from '../controllers/directory.controller';
import { createContactNotesController } from '../controllers/notes.controller';
import { createContactPhonesController } from '../controllers/phones.controller';
import { createContactEmailsController } from '../controllers/emails.controller';
import { createContactRelationshipsController } from '../controllers/relationships.controller';
import { createContactDocumentsController } from '../controllers/documents.controller';
import { ResponseMode } from '../mappers/responseMode';
import { ContactRepository } from '../repositories/contactRepository';
import { ContactNotesRepository } from '../repositories/contactNotesRepository';
import { ContactPhonesRepository } from '../repositories/contactPhonesRepository';
import { ContactEmailsRepository } from '../repositories/contactEmailsRepository';
import { ContactRelationshipsRepository } from '../repositories/contactRelationshipsRepository';
import { ContactDocumentsRepository } from '../repositories/contactDocumentsRepository';
import { ContactDirectoryUseCase } from '../usecases/contactDirectory.usecase';
import { ContactNotesUseCase } from '../usecases/contactNotes.usecase';
import { ContactPhonesUseCase } from '../usecases/contactPhones.usecase';
import { ContactEmailsUseCase } from '../usecases/contactEmails.usecase';
import { ContactRelationshipsUseCase } from '../usecases/contactRelationships.usecase';
import { ContactDocumentsUseCase } from '../usecases/contactDocuments.usecase';

export const createContactsRoutes = (mode: ResponseMode = 'v2'): Router => {
  const router = Router();

  const directoryRepository = new ContactRepository();
  const notesRepository = new ContactNotesRepository();
  const phonesRepository = new ContactPhonesRepository();
  const emailsRepository = new ContactEmailsRepository();
  const relationshipsRepository = new ContactRelationshipsRepository();
  const documentsRepository = new ContactDocumentsRepository();

  const directoryUseCase = new ContactDirectoryUseCase(directoryRepository);

  const directoryController = createContactDirectoryController(directoryUseCase, mode);
  const notesController = createContactNotesController(new ContactNotesUseCase(notesRepository), mode);
  const phonesController = createContactPhonesController(new ContactPhonesUseCase(phonesRepository), mode);
  const emailsController = createContactEmailsController(new ContactEmailsUseCase(emailsRepository), mode);
  const relationshipsController = createContactRelationshipsController(
    new ContactRelationshipsUseCase(relationshipsRepository),
    mode
  );
  const documentsController = createContactDocumentsController(
    new ContactDocumentsUseCase(documentsRepository),
    directoryUseCase,
    mode
  );

  router.use(authenticate);
  router.use(requireActiveOrganizationContext);
  router.use(loadDataScope('contacts'));

  router.get('/', validateQuery(contactFilterSchema), directoryController.getContacts);
  router.get('/tags', directoryController.getContactTags);
  router.get('/roles', directoryController.getContactRoles);
  router.post('/bulk', validateBody(bulkUpdateContactsSchema), directoryController.bulkUpdateContacts);

  router.get('/:id', validateParams(z.object({ id: uuidSchema })), directoryController.getContactById);
  router.post('/', validateBody(createContactSchema), directoryController.createContact);
  router.put(
    '/:id',
    validateParams(z.object({ id: uuidSchema })),
    validateBody(updateContactSchema),
    directoryController.updateContact
  );
  router.delete('/:id', validateParams(z.object({ id: uuidSchema })), directoryController.deleteContact);

  router.get(
    '/:contactId/notes',
    validateParams(z.object({ contactId: uuidSchema })),
    notesController.getContactNotes
  );
  router.post(
    '/:contactId/notes',
    validateParams(z.object({ contactId: uuidSchema })),
    validateBody(contactNoteSchema),
    notesController.createContactNote
  );
  router.get(
    '/notes/:noteId',
    validateParams(z.object({ noteId: uuidSchema })),
    notesController.getContactNoteById
  );
  router.put(
    '/notes/:noteId',
    validateParams(z.object({ noteId: uuidSchema })),
    validateBody(updateContactNoteSchema),
    notesController.updateContactNote
  );
  router.delete(
    '/notes/:noteId',
    validateParams(z.object({ noteId: uuidSchema })),
    notesController.deleteContactNote
  );

  router.get(
    '/:contactId/phones',
    validateParams(z.object({ contactId: uuidSchema })),
    phonesController.getContactPhones
  );
  router.post(
    '/:contactId/phones',
    validateParams(z.object({ contactId: uuidSchema })),
    validateBody(contactPhoneSchema),
    phonesController.createContactPhone
  );
  router.get(
    '/phones/:phoneId',
    validateParams(z.object({ phoneId: uuidSchema })),
    phonesController.getContactPhoneById
  );
  router.put(
    '/phones/:phoneId',
    validateParams(z.object({ phoneId: uuidSchema })),
    validateBody(updateContactPhoneSchema),
    phonesController.updateContactPhone
  );
  router.delete(
    '/phones/:phoneId',
    validateParams(z.object({ phoneId: uuidSchema })),
    phonesController.deleteContactPhone
  );

  router.get(
    '/:contactId/emails',
    validateParams(z.object({ contactId: uuidSchema })),
    emailsController.getContactEmails
  );
  router.post(
    '/:contactId/emails',
    validateParams(z.object({ contactId: uuidSchema })),
    validateBody(contactEmailSchema),
    emailsController.createContactEmail
  );
  router.get(
    '/emails/:emailId',
    validateParams(z.object({ emailId: uuidSchema })),
    emailsController.getContactEmailById
  );
  router.put(
    '/emails/:emailId',
    validateParams(z.object({ emailId: uuidSchema })),
    validateBody(updateContactEmailSchema),
    emailsController.updateContactEmail
  );
  router.delete(
    '/emails/:emailId',
    validateParams(z.object({ emailId: uuidSchema })),
    emailsController.deleteContactEmail
  );

  router.get(
    '/:contactId/relationships',
    validateParams(z.object({ contactId: uuidSchema })),
    relationshipsController.getContactRelationships
  );
  router.post(
    '/:contactId/relationships',
    validateParams(z.object({ contactId: uuidSchema })),
    validateBody(contactRelationshipSchema),
    relationshipsController.createContactRelationship
  );
  router.get(
    '/relationships/:relationshipId',
    validateParams(z.object({ relationshipId: uuidSchema })),
    relationshipsController.getContactRelationshipById
  );
  router.put(
    '/relationships/:relationshipId',
    validateParams(z.object({ relationshipId: uuidSchema })),
    validateBody(updateContactRelationshipSchema),
    relationshipsController.updateContactRelationship
  );
  router.delete(
    '/relationships/:relationshipId',
    validateParams(z.object({ relationshipId: uuidSchema })),
    relationshipsController.deleteContactRelationship
  );

  router.get(
    '/:contactId/documents',
    validateParams(z.object({ contactId: uuidSchema })),
    documentsController.getContactDocuments
  );
  router.post(
    '/:contactId/documents',
    validateParams(z.object({ contactId: uuidSchema })),
    documentUpload.single('file'),
    handleMulterError,
    documentsController.uploadDocument
  );
  router.get(
    '/documents/:documentId',
    validateParams(z.object({ documentId: uuidSchema })),
    documentsController.getDocumentById
  );
  router.get(
    '/documents/:documentId/download',
    validateParams(z.object({ documentId: uuidSchema })),
    documentsController.downloadDocument
  );
  router.put(
    '/documents/:documentId',
    validateParams(z.object({ documentId: uuidSchema })),
    validateBody(updateContactDocumentSchema),
    documentsController.updateDocument
  );
  router.delete(
    '/documents/:documentId',
    validateParams(z.object({ documentId: uuidSchema })),
    documentsController.deleteDocument
  );

  return router;
};

export const contactsV2Routes = createContactsRoutes('v2');
