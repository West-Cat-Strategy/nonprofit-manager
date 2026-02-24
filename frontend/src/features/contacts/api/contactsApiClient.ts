import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
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
import type { ContactMutationPayload, ContactsApiClientPort, ContactsListQuery } from '../types/contracts';

export class ContactsApiClient implements ContactsApiClientPort {
  private buildListParams(query: ContactsListQuery = {}): Record<string, string | number | boolean | undefined> {
    return {
      search: query.search,
      account_id: query.accountId,
      is_active: query.isActive,
      tags: query.tags?.join(','),
      role: query.role,
      page: query.page,
      limit: query.limit,
      sort_by: query.sortBy,
      sort_order: query.sortOrder,
    };
  }

  async listContacts(
    query: ContactsListQuery = {}
  ): Promise<{ data: Contact[]; pagination: { total: number; page: number; limit: number; total_pages: number } }> {
    const response = await api.get<
      ApiEnvelope<{
        data: Contact[];
        pagination: { total: number; page: number; limit: number; total_pages: number };
      }>
    >('/v2/contacts', {
      params: this.buildListParams(query),
    });
    return unwrapApiData(response.data);
  }

  async getContact(contactId: string): Promise<Contact> {
    const response = await api.get<ApiEnvelope<Contact>>(`/v2/contacts/${contactId}`);
    return unwrapApiData(response.data);
  }

  async createContact(payload: ContactMutationPayload): Promise<Contact> {
    const response = await api.post<ApiEnvelope<Contact>>('/v2/contacts', payload);
    return unwrapApiData(response.data);
  }

  async updateContact(contactId: string, payload: ContactMutationPayload): Promise<Contact> {
    const response = await api.put<ApiEnvelope<Contact>>(`/v2/contacts/${contactId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteContact(contactId: string): Promise<void> {
    await api.delete(`/v2/contacts/${contactId}`);
  }

  async listTags(): Promise<string[]> {
    const response = await api.get<ApiEnvelope<string[]>>('/v2/contacts/tags');
    return unwrapApiData(response.data);
  }

  async listRoles(): Promise<ContactRole[]> {
    const response = await api.get<ApiEnvelope<ContactRole[]>>('/v2/contacts/roles');
    return unwrapApiData(response.data);
  }

  async bulkUpdate(payload: {
    contactIds: string[];
    is_active?: boolean;
    tags?: {
      add?: string[];
      remove?: string[];
      replace?: string[];
    };
  }): Promise<{ updated: number; contact_ids: string[] }> {
    const response = await api.post<ApiEnvelope<{ updated: number; contact_ids: string[] }>>(
      '/v2/contacts/bulk',
      payload
    );
    return unwrapApiData(response.data);
  }

  async listNotes(contactId: string): Promise<{ notes: ContactNote[]; total: number }> {
    const response = await api.get<ApiEnvelope<{ notes: ContactNote[]; total: number }>>(`/v2/contacts/${contactId}/notes`);
    return unwrapApiData(response.data);
  }

  async getNote(noteId: string): Promise<ContactNote> {
    const response = await api.get<ApiEnvelope<ContactNote>>(`/v2/contacts/notes/${noteId}`);
    return unwrapApiData(response.data);
  }

  async createNote(contactId: string, payload: CreateContactNoteDTO): Promise<ContactNote> {
    const response = await api.post<ApiEnvelope<ContactNote>>(`/v2/contacts/${contactId}/notes`, payload);
    return unwrapApiData(response.data);
  }

  async updateNote(noteId: string, payload: UpdateContactNoteDTO): Promise<ContactNote> {
    const response = await api.put<ApiEnvelope<ContactNote>>(`/v2/contacts/notes/${noteId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteNote(noteId: string): Promise<void> {
    await api.delete(`/v2/contacts/notes/${noteId}`);
  }

  async listPhones(contactId: string): Promise<ContactPhoneNumber[]> {
    const response = await api.get<ApiEnvelope<ContactPhoneNumber[]>>(`/v2/contacts/${contactId}/phones`);
    return unwrapApiData(response.data);
  }

  async getPhone(phoneId: string): Promise<ContactPhoneNumber> {
    const response = await api.get<ApiEnvelope<ContactPhoneNumber>>(`/v2/contacts/phones/${phoneId}`);
    return unwrapApiData(response.data);
  }

  async createPhone(contactId: string, payload: CreateContactPhoneDTO): Promise<ContactPhoneNumber> {
    const response = await api.post<ApiEnvelope<ContactPhoneNumber>>(`/v2/contacts/${contactId}/phones`, payload);
    return unwrapApiData(response.data);
  }

  async updatePhone(phoneId: string, payload: UpdateContactPhoneDTO): Promise<ContactPhoneNumber> {
    const response = await api.put<ApiEnvelope<ContactPhoneNumber>>(`/v2/contacts/phones/${phoneId}`, payload);
    return unwrapApiData(response.data);
  }

  async deletePhone(phoneId: string): Promise<void> {
    await api.delete(`/v2/contacts/phones/${phoneId}`);
  }

  async listEmails(contactId: string): Promise<ContactEmailAddress[]> {
    const response = await api.get<ApiEnvelope<ContactEmailAddress[]>>(`/v2/contacts/${contactId}/emails`);
    return unwrapApiData(response.data);
  }

  async getEmail(emailId: string): Promise<ContactEmailAddress> {
    const response = await api.get<ApiEnvelope<ContactEmailAddress>>(`/v2/contacts/emails/${emailId}`);
    return unwrapApiData(response.data);
  }

  async createEmail(contactId: string, payload: CreateContactEmailDTO): Promise<ContactEmailAddress> {
    const response = await api.post<ApiEnvelope<ContactEmailAddress>>(`/v2/contacts/${contactId}/emails`, payload);
    return unwrapApiData(response.data);
  }

  async updateEmail(emailId: string, payload: UpdateContactEmailDTO): Promise<ContactEmailAddress> {
    const response = await api.put<ApiEnvelope<ContactEmailAddress>>(`/v2/contacts/emails/${emailId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteEmail(emailId: string): Promise<void> {
    await api.delete(`/v2/contacts/emails/${emailId}`);
  }

  async listRelationships(contactId: string): Promise<ContactRelationship[]> {
    const response = await api.get<ApiEnvelope<ContactRelationship[]>>(`/v2/contacts/${contactId}/relationships`);
    return unwrapApiData(response.data);
  }

  async getRelationship(relationshipId: string): Promise<ContactRelationship> {
    const response = await api.get<ApiEnvelope<ContactRelationship>>(`/v2/contacts/relationships/${relationshipId}`);
    return unwrapApiData(response.data);
  }

  async createRelationship(
    contactId: string,
    payload: CreateContactRelationshipDTO
  ): Promise<ContactRelationship> {
    const response = await api.post<ApiEnvelope<ContactRelationship>>(
      `/v2/contacts/${contactId}/relationships`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async updateRelationship(
    relationshipId: string,
    payload: UpdateContactRelationshipDTO
  ): Promise<ContactRelationship> {
    const response = await api.put<ApiEnvelope<ContactRelationship>>(
      `/v2/contacts/relationships/${relationshipId}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    await api.delete(`/v2/contacts/relationships/${relationshipId}`);
  }

  async listDocuments(contactId: string): Promise<ContactDocument[]> {
    const response = await api.get<ApiEnvelope<ContactDocument[]>>(`/v2/contacts/${contactId}/documents`);
    return unwrapApiData(response.data);
  }

  async getDocument(documentId: string): Promise<ContactDocument> {
    const response = await api.get<ApiEnvelope<ContactDocument>>(`/v2/contacts/documents/${documentId}`);
    return unwrapApiData(response.data);
  }

  async updateDocument(documentId: string, payload: UpdateContactDocumentDTO): Promise<ContactDocument> {
    const response = await api.put<ApiEnvelope<ContactDocument>>(`/v2/contacts/documents/${documentId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/v2/contacts/documents/${documentId}`);
  }

  async uploadDocument(
    contactId: string,
    payload: CreateContactDocumentDTO,
    file?: File
  ): Promise<ContactDocument> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    const response = await api.post<ApiEnvelope<ContactDocument>>(`/v2/contacts/${contactId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return unwrapApiData(response.data);
  }
}

export const contactsApiClient = new ContactsApiClient();
