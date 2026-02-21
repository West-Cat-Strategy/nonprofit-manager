import type {
  Contact,
  ContactDocument,
  ContactEmailAddress,
  ContactFilters,
  ContactNote,
  ContactRelationship,
  ContactRole,
  ContactPhoneNumber,
  CreateContactDTO,
  CreateContactEmailDTO,
  CreateContactNoteDTO,
  CreateContactRelationshipDTO,
  CreateContactPhoneDTO,
  CreateContactDocumentDTO,
  PaginationParams,
  PaginatedContacts,
  UpdateContactDTO,
  UpdateContactEmailDTO,
  UpdateContactNoteDTO,
  UpdateContactRelationshipDTO,
  UpdateContactPhoneDTO,
  UpdateContactDocumentDTO,
} from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';

export interface ContactDirectoryPort {
  getContacts(
    filters?: ContactFilters,
    pagination?: PaginationParams,
    scope?: DataScopeFilter
  ): Promise<PaginatedContacts>;
  getContactTags(scope?: DataScopeFilter): Promise<string[]>;
  getContactRoles(): Promise<ContactRole[]>;
  getRolesForContact(contactId: string): Promise<ContactRole[]>;
  setRolesForContact(contactId: string, roles: string[], assignedBy?: string): Promise<ContactRole[]>;
  getContactById(contactId: string): Promise<Contact | null>;
  getContactByIdWithScope(contactId: string, scope: DataScopeFilter): Promise<Contact | null>;
  createContact(payload: CreateContactDTO, userId: string): Promise<Contact>;
  updateContact(contactId: string, payload: UpdateContactDTO, userId: string): Promise<Contact | null>;
  bulkUpdateContacts(
    contactIds: string[],
    payload: {
      is_active?: boolean;
      tags?: {
        add?: string[];
        remove?: string[];
        replace?: string[];
      };
    },
    userId: string
  ): Promise<number>;
  deleteContact(contactId: string, userId: string): Promise<boolean>;
  findContactIdentity(contactId: string): Promise<{
    email: string | null;
    firstName: string;
    lastName: string;
  } | null>;
  findUserByEmail(email: string): Promise<{ id: string; role: string } | null>;
  updateUserRole(userId: string, role: string): Promise<void>;
}

export interface ContactNotesPort {
  list(contactId: string, limit?: number, offset?: number): Promise<{ notes: ContactNote[]; total: number }>;
  getById(noteId: string): Promise<ContactNote | null>;
  create(contactId: string, payload: CreateContactNoteDTO, userId: string): Promise<ContactNote>;
  update(noteId: string, payload: UpdateContactNoteDTO, userId?: string): Promise<ContactNote | null>;
  delete(noteId: string): Promise<boolean>;
}

export interface ContactPhonesPort {
  list(contactId: string): Promise<ContactPhoneNumber[]>;
  getById(phoneId: string): Promise<ContactPhoneNumber | null>;
  create(contactId: string, payload: CreateContactPhoneDTO, userId: string): Promise<ContactPhoneNumber>;
  update(phoneId: string, payload: UpdateContactPhoneDTO, userId: string): Promise<ContactPhoneNumber | null>;
  delete(phoneId: string): Promise<boolean>;
}

export interface ContactEmailsPort {
  list(contactId: string): Promise<ContactEmailAddress[]>;
  getById(emailId: string): Promise<ContactEmailAddress | null>;
  create(contactId: string, payload: CreateContactEmailDTO, userId: string): Promise<ContactEmailAddress>;
  update(emailId: string, payload: UpdateContactEmailDTO, userId: string): Promise<ContactEmailAddress | null>;
  delete(emailId: string): Promise<boolean>;
}

export interface ContactRelationshipsPort {
  list(contactId: string): Promise<ContactRelationship[]>;
  getById(relationshipId: string): Promise<ContactRelationship | null>;
  create(
    contactId: string,
    payload: CreateContactRelationshipDTO,
    userId: string
  ): Promise<ContactRelationship>;
  update(
    relationshipId: string,
    payload: UpdateContactRelationshipDTO,
    userId: string
  ): Promise<ContactRelationship | null>;
  delete(relationshipId: string): Promise<boolean>;
}

export interface ContactDocumentsPort {
  list(contactId: string): Promise<ContactDocument[]>;
  getById(documentId: string): Promise<ContactDocument | null>;
  getByIdWithScope(documentId: string, scope: DataScopeFilter): Promise<ContactDocument | null>;
  create(
    contactId: string,
    file: Express.Multer.File,
    payload: CreateContactDocumentDTO,
    userId: string
  ): Promise<ContactDocument>;
  update(documentId: string, payload: UpdateContactDocumentDTO, userId?: string): Promise<ContactDocument | null>;
  delete(documentId: string): Promise<boolean>;
  resolveFilePath(document: ContactDocument): string | null;
}
