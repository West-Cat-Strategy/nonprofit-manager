import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  Contact,
  ContactCommunicationsResult,
  ContactSuppressionEvidence,
  ContactSuppressionEvidenceResult,
  ContactDocument,
  ContactEmailAddress,
  ContactNote,
  ContactNotesTimelineResponse,
  ContactMergePreview,
  ContactMergeRequest,
  ContactMergeResult,
  ContactRelationship,
  ContactRole,
  ContactPhoneNumber,
  DonorProfile,
  CreateContactDocumentDTO,
  CreateContactEmailDTO,
  CreateContactNoteDTO,
  CreateContactRelationshipDTO,
  CreateContactPhoneDTO,
  CreateContactSuppressionEvidenceDTO,
  UpdateDonorProfileDTO,
  UpdateContactDocumentDTO,
  UpdateContactEmailDTO,
  UpdateContactNoteDTO,
  UpdateContactRelationshipDTO,
  UpdateContactPhoneDTO,
  UpdateContactSuppressionEvidenceDTO,
} from '../../../types/contact';
import type {
  ContactCommunicationQuery,
  ContactLookupItem,
  ContactMutationPayload,
  ContactsApiClientPort,
  ContactsListQuery,
  ContactsLookupQuery,
} from '../types/contracts';

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
    >('/contacts', {
      params: this.buildListParams(query),
    });
    return unwrapApiData(response.data);
  }

  async lookupContacts(
    query: ContactsLookupQuery,
    options?: { signal?: AbortSignal }
  ): Promise<{ items: ContactLookupItem[] }> {
    const response = await api.get<ApiEnvelope<{ items: ContactLookupItem[] }>>('/contacts/lookup', {
      params: {
        q: query.q,
        limit: query.limit,
        is_active: query.isActive,
      },
      signal: options?.signal,
    });
    return unwrapApiData(response.data);
  }

  async getContact(contactId: string): Promise<Contact> {
    const response = await api.get<ApiEnvelope<Contact>>(`/contacts/${contactId}`);
    return unwrapApiData(response.data);
  }

  async getDonorProfile(contactId: string): Promise<DonorProfile> {
    const response = await api.get<ApiEnvelope<DonorProfile>>(`/contacts/${contactId}/donor-profile`);
    return unwrapApiData(response.data);
  }

  async updateDonorProfile(
    contactId: string,
    payload: UpdateDonorProfileDTO
  ): Promise<DonorProfile> {
    const response = await api.put<ApiEnvelope<DonorProfile>>(
      `/contacts/${contactId}/donor-profile`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async searchContactsForMerge(query: { search: string; limit?: number }): Promise<Contact[]> {
    const response = await this.listContacts({
      search: query.search,
      limit: query.limit ?? 10,
    });
    return response.data;
  }

  async getContactMergePreview(contactId: string, targetContactId: string): Promise<ContactMergePreview> {
    const response = await api.get<ApiEnvelope<ContactMergePreview>>(`/contacts/${contactId}/merge-preview`, {
      params: {
        target_contact_id: targetContactId,
      },
    });
    return unwrapApiData(response.data);
  }

  async mergeContact(contactId: string, payload: ContactMergeRequest): Promise<ContactMergeResult> {
    const response = await api.post<ApiEnvelope<ContactMergeResult>>(`/contacts/${contactId}/merge`, payload);
    return unwrapApiData(response.data);
  }

  async createContact(payload: ContactMutationPayload): Promise<Contact> {
    const response = await api.post<ApiEnvelope<Contact>>('/contacts', payload);
    return unwrapApiData(response.data);
  }

  async updateContact(contactId: string, payload: ContactMutationPayload): Promise<Contact> {
    const response = await api.put<ApiEnvelope<Contact>>(`/contacts/${contactId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteContact(contactId: string): Promise<void> {
    await api.delete(`/contacts/${contactId}`);
  }

  async listTags(): Promise<string[]> {
    const response = await api.get<ApiEnvelope<string[]>>('/contacts/tags');
    return unwrapApiData(response.data);
  }

  async listRoles(): Promise<ContactRole[]> {
    const response = await api.get<ApiEnvelope<ContactRole[]>>('/contacts/roles');
    const payload = unwrapApiData(response.data);
    return Array.isArray(payload) ? payload : [];
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
      '/contacts/bulk',
      payload
    );
    return unwrapApiData(response.data);
  }

  async listCommunications(
    contactId: string,
    query: ContactCommunicationQuery = {}
  ): Promise<ContactCommunicationsResult> {
    const response = await api.get<ApiEnvelope<ContactCommunicationsResult>>(
      `/contacts/${contactId}/communications`,
      {
        params: {
          channel: query.channel,
          source_type: query.source_type,
          delivery_status: query.delivery_status,
          limit: query.limit,
        },
      }
    );
    return unwrapApiData(response.data);
  }

  async listSuppressions(contactId: string): Promise<ContactSuppressionEvidenceResult> {
    const response = await api.get<ApiEnvelope<ContactSuppressionEvidenceResult>>(
      `/contacts/${contactId}/suppressions`
    );
    return unwrapApiData(response.data);
  }

  async createSuppression(
    contactId: string,
    payload: CreateContactSuppressionEvidenceDTO
  ): Promise<ContactSuppressionEvidence> {
    const response = await api.post<ApiEnvelope<ContactSuppressionEvidence>>(
      `/contacts/${contactId}/suppressions/staff-dnc`,
      {
        channel: payload.channel,
        reason: payload.reason,
        evidence_summary: payload.evidence,
        source_reference: payload.notes,
        starts_at: payload.starts_at,
        expires_at: payload.expires_at,
      }
    );
    return unwrapApiData(response.data);
  }

  async updateSuppression(
    contactId: string,
    suppressionId: string,
    payload: UpdateContactSuppressionEvidenceDTO
  ): Promise<ContactSuppressionEvidence> {
    const response = await api.patch<ApiEnvelope<ContactSuppressionEvidence>>(
      `/contacts/${contactId}/suppressions/${suppressionId}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async listNotes(contactId: string): Promise<{ notes: ContactNote[]; total: number }> {
    const response = await api.get<ApiEnvelope<{ notes: ContactNote[]; total: number }>>(`/contacts/${contactId}/notes`);
    return unwrapApiData(response.data);
  }

  async listNoteTimeline(contactId: string): Promise<ContactNotesTimelineResponse> {
    const response = await api.get<ApiEnvelope<ContactNotesTimelineResponse>>(
      `/contacts/${contactId}/notes/timeline`
    );
    return unwrapApiData(response.data);
  }

  async getNote(noteId: string): Promise<ContactNote> {
    const response = await api.get<ApiEnvelope<ContactNote>>(`/contacts/notes/${noteId}`);
    return unwrapApiData(response.data);
  }

  async createNote(contactId: string, payload: CreateContactNoteDTO): Promise<ContactNote> {
    const response = await api.post<ApiEnvelope<ContactNote>>(`/contacts/${contactId}/notes`, payload);
    return unwrapApiData(response.data);
  }

  async updateNote(noteId: string, payload: UpdateContactNoteDTO): Promise<ContactNote> {
    const response = await api.put<ApiEnvelope<ContactNote>>(`/contacts/notes/${noteId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteNote(noteId: string): Promise<void> {
    await api.delete(`/contacts/notes/${noteId}`);
  }

  async listPhones(contactId: string): Promise<ContactPhoneNumber[]> {
    const response = await api.get<ApiEnvelope<ContactPhoneNumber[]>>(`/contacts/${contactId}/phones`);
    return unwrapApiData(response.data);
  }

  async getPhone(phoneId: string): Promise<ContactPhoneNumber> {
    const response = await api.get<ApiEnvelope<ContactPhoneNumber>>(`/contacts/phones/${phoneId}`);
    return unwrapApiData(response.data);
  }

  async createPhone(contactId: string, payload: CreateContactPhoneDTO): Promise<ContactPhoneNumber> {
    const response = await api.post<ApiEnvelope<ContactPhoneNumber>>(`/contacts/${contactId}/phones`, payload);
    return unwrapApiData(response.data);
  }

  async updatePhone(phoneId: string, payload: UpdateContactPhoneDTO): Promise<ContactPhoneNumber> {
    const response = await api.put<ApiEnvelope<ContactPhoneNumber>>(`/contacts/phones/${phoneId}`, payload);
    return unwrapApiData(response.data);
  }

  async deletePhone(phoneId: string): Promise<void> {
    await api.delete(`/contacts/phones/${phoneId}`);
  }

  async listEmails(contactId: string): Promise<ContactEmailAddress[]> {
    const response = await api.get<ApiEnvelope<ContactEmailAddress[]>>(`/contacts/${contactId}/emails`);
    return unwrapApiData(response.data);
  }

  async getEmail(emailId: string): Promise<ContactEmailAddress> {
    const response = await api.get<ApiEnvelope<ContactEmailAddress>>(`/contacts/emails/${emailId}`);
    return unwrapApiData(response.data);
  }

  async createEmail(contactId: string, payload: CreateContactEmailDTO): Promise<ContactEmailAddress> {
    const response = await api.post<ApiEnvelope<ContactEmailAddress>>(`/contacts/${contactId}/emails`, payload);
    return unwrapApiData(response.data);
  }

  async updateEmail(emailId: string, payload: UpdateContactEmailDTO): Promise<ContactEmailAddress> {
    const response = await api.put<ApiEnvelope<ContactEmailAddress>>(`/contacts/emails/${emailId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteEmail(emailId: string): Promise<void> {
    await api.delete(`/contacts/emails/${emailId}`);
  }

  async listRelationships(contactId: string): Promise<ContactRelationship[]> {
    const response = await api.get<ApiEnvelope<ContactRelationship[]>>(`/contacts/${contactId}/relationships`);
    return unwrapApiData(response.data);
  }

  async getRelationship(relationshipId: string): Promise<ContactRelationship> {
    const response = await api.get<ApiEnvelope<ContactRelationship>>(`/contacts/relationships/${relationshipId}`);
    return unwrapApiData(response.data);
  }

  async createRelationship(
    contactId: string,
    payload: CreateContactRelationshipDTO
  ): Promise<ContactRelationship> {
    const response = await api.post<ApiEnvelope<ContactRelationship>>(
      `/contacts/${contactId}/relationships`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async updateRelationship(
    relationshipId: string,
    payload: UpdateContactRelationshipDTO
  ): Promise<ContactRelationship> {
    const response = await api.put<ApiEnvelope<ContactRelationship>>(
      `/contacts/relationships/${relationshipId}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async deleteRelationship(relationshipId: string): Promise<void> {
    await api.delete(`/contacts/relationships/${relationshipId}`);
  }

  async listDocuments(contactId: string): Promise<ContactDocument[]> {
    const response = await api.get<ApiEnvelope<ContactDocument[]>>(`/contacts/${contactId}/documents`);
    return unwrapApiData(response.data);
  }

  async getDocument(documentId: string): Promise<ContactDocument> {
    const response = await api.get<ApiEnvelope<ContactDocument>>(`/contacts/documents/${documentId}`);
    return unwrapApiData(response.data);
  }

  async updateDocument(documentId: string, payload: UpdateContactDocumentDTO): Promise<ContactDocument> {
    const response = await api.put<ApiEnvelope<ContactDocument>>(`/contacts/documents/${documentId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteDocument(documentId: string): Promise<void> {
    await api.delete(`/contacts/documents/${documentId}`);
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

    const response = await api.post<ApiEnvelope<ContactDocument>>(`/contacts/${contactId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return unwrapApiData(response.data);
  }
}

export const contactsApiClient = new ContactsApiClient();
