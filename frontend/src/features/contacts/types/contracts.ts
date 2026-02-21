import type {
  Contact,
  ContactDocument,
  ContactEmailAddress,
  ContactNote,
  ContactRelationship,
  ContactRole,
  ContactPhoneNumber,
  CreateContactDocumentDTO,
  CreateContactEmailDTO,
  CreateContactNoteDTO,
  CreateContactRelationshipDTO,
  CreateContactPhoneDTO,
  UpdateContactDocumentDTO,
  UpdateContactEmailDTO,
  UpdateContactNoteDTO,
  UpdateContactRelationshipDTO,
  UpdateContactPhoneDTO,
} from '../../../types/contact';

export interface ContactsListQuery {
  search?: string;
  accountId?: string;
  isActive?: boolean;
  tags?: string[];
  role?: 'staff' | 'volunteer' | 'board';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactMutationPayload {
  [key: string]: unknown;
}

export interface ContactsApiClientPort {
  listContacts(query?: ContactsListQuery): Promise<{ data: Contact[]; pagination: { total: number; page: number; limit: number; total_pages: number } }>;
  getContact(contactId: string): Promise<Contact>;
  createContact(payload: ContactMutationPayload): Promise<Contact>;
  updateContact(contactId: string, payload: ContactMutationPayload): Promise<Contact>;
  deleteContact(contactId: string): Promise<void>;
  listTags(): Promise<string[]>;
  listRoles(): Promise<ContactRole[]>;
  bulkUpdate(payload: {
    contactIds: string[];
    is_active?: boolean;
    tags?: {
      add?: string[];
      remove?: string[];
      replace?: string[];
    };
  }): Promise<{ updated: number; contact_ids: string[] }>;
  listNotes(contactId: string): Promise<{ notes: ContactNote[]; total: number }>;
  getNote(noteId: string): Promise<ContactNote>;
  createNote(contactId: string, payload: CreateContactNoteDTO): Promise<ContactNote>;
  updateNote(noteId: string, payload: UpdateContactNoteDTO): Promise<ContactNote>;
  deleteNote(noteId: string): Promise<void>;
  listPhones(contactId: string): Promise<ContactPhoneNumber[]>;
  getPhone(phoneId: string): Promise<ContactPhoneNumber>;
  createPhone(contactId: string, payload: CreateContactPhoneDTO): Promise<ContactPhoneNumber>;
  updatePhone(phoneId: string, payload: UpdateContactPhoneDTO): Promise<ContactPhoneNumber>;
  deletePhone(phoneId: string): Promise<void>;
  listEmails(contactId: string): Promise<ContactEmailAddress[]>;
  getEmail(emailId: string): Promise<ContactEmailAddress>;
  createEmail(contactId: string, payload: CreateContactEmailDTO): Promise<ContactEmailAddress>;
  updateEmail(emailId: string, payload: UpdateContactEmailDTO): Promise<ContactEmailAddress>;
  deleteEmail(emailId: string): Promise<void>;
  listRelationships(contactId: string): Promise<ContactRelationship[]>;
  getRelationship(relationshipId: string): Promise<ContactRelationship>;
  createRelationship(contactId: string, payload: CreateContactRelationshipDTO): Promise<ContactRelationship>;
  updateRelationship(relationshipId: string, payload: UpdateContactRelationshipDTO): Promise<ContactRelationship>;
  deleteRelationship(relationshipId: string): Promise<void>;
  listDocuments(contactId: string): Promise<ContactDocument[]>;
  getDocument(documentId: string): Promise<ContactDocument>;
  updateDocument(documentId: string, payload: UpdateContactDocumentDTO): Promise<ContactDocument>;
  deleteDocument(documentId: string): Promise<void>;
  uploadDocument(contactId: string, payload: CreateContactDocumentDTO, file?: File): Promise<ContactDocument>;
}
