/**
 * Contacts Redux Slice
 * State management for contact operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  ContactPhoneNumber,
  ContactEmailAddress,
  ContactRelationship,
  ContactNote,
  ContactDocument,
  CreateContactPhoneDTO,
  UpdateContactPhoneDTO,
  CreateContactEmailDTO,
  UpdateContactEmailDTO,
  CreateContactRelationshipDTO,
  UpdateContactRelationshipDTO,
  CreateContactNoteDTO,
  UpdateContactNoteDTO,
  CreateContactDocumentDTO,
  UpdateContactDocumentDTO,
} from '../../types/contact';

export interface Contact {
  contact_id: string;
  account_id: string | null;
  account_name?: string;
  first_name: string;
  preferred_name?: string | null;
  last_name: string;
  middle_name: string | null;
  salutation: string | null;
  suffix: string | null;
  birth_date: string | null;
  gender: string | null;
  pronouns: string | null;
  email: string | null;
  phone: string | null;
  mobile_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state_province: string | null;
  postal_code: string | null;
  country: string | null;
  no_fixed_address: boolean;
  job_title: string | null;
  department: string | null;
  preferred_contact_method: string | null;
  do_not_email: boolean;
  do_not_phone: boolean;
  do_not_text: boolean;
  do_not_voicemail: boolean;
  notes: string | null;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Related data counts
  phone_count?: number;
  email_count?: number;
  relationship_count?: number;
  note_count?: number;
  roles?: string[];
}

export interface ContactsState {
  contacts: Contact[];
  currentContact: Contact | null;
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  filters: {
    search: string;
    account_id: string;
    is_active: boolean | null;
    tags: string[];
    role: '' | 'staff' | 'volunteer' | 'board';
    sort_by: string;
    sort_order: 'asc' | 'desc';
  };
  // Sub-resources for current contact
  phones: ContactPhoneNumber[];
  emails: ContactEmailAddress[];
  relationships: ContactRelationship[];
  contactNotes: ContactNote[];
  documents: ContactDocument[];
  phonesLoading: boolean;
  emailsLoading: boolean;
  relationshipsLoading: boolean;
  notesLoading: boolean;
  documentsLoading: boolean;
  availableTags: string[];
}

type ContactInput = Partial<Contact>;

const initialState: ContactsState = {
  contacts: [],
  currentContact: null,
  loading: false,
  error: null,
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  },
  filters: {
    search: '',
    account_id: '',
    is_active: null,
    tags: [],
    role: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  },
  // Sub-resources
  phones: [],
  emails: [],
  relationships: [],
  contactNotes: [],
  documents: [],
  phonesLoading: false,
  emailsLoading: false,
  relationshipsLoading: false,
  notesLoading: false,
  documentsLoading: false,
  availableTags: [],
};

// ============================================================================
// CONTACT THUNKS
// ============================================================================

export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (params: {
    page?: number;
    limit?: number;
    search?: string;
    account_id?: string;
    is_active?: boolean;
    tags?: string[];
    role?: 'staff' | 'volunteer' | 'board';
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) => {
    const response = await api.get('/contacts', {
      params: {
        ...params,
        tags: params.tags?.length ? params.tags.join(',') : undefined,
      },
    });
    return response.data;
  }
);

export const fetchContactById = createAsyncThunk(
  'contacts/fetchContactById',
  async (contactId: string) => {
    const response = await api.get(`/contacts/${contactId}`);
    return response.data;
  }
);

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData: ContactInput) => {
    const response = await api.post('/contacts', contactData);
    return response.data;
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ contactId, data }: { contactId: string; data: ContactInput }) => {
    const response = await api.put(`/contacts/${contactId}`, data);
    return response.data;
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (contactId: string) => {
    await api.delete(`/contacts/${contactId}`);
    return contactId;
  }
);

export const fetchContactTags = createAsyncThunk(
  'contacts/fetchContactTags',
  async () => {
    const response = await api.get('/contacts/tags');
    return response.data.tags as string[];
  }
);

export const bulkUpdateContacts = createAsyncThunk(
  'contacts/bulkUpdateContacts',
  async (payload: {
    contactIds: string[];
    is_active?: boolean;
    tags?: {
      add?: string[];
      remove?: string[];
      replace?: string[];
    };
  }) => {
    const response = await api.post('/contacts/bulk', payload);
    return response.data as { updated: number; contact_ids: string[] };
  }
);

// ============================================================================
// PHONE NUMBER THUNKS
// ============================================================================

export const fetchContactPhones = createAsyncThunk(
  'contacts/fetchContactPhones',
  async (contactId: string) => {
    const response = await api.get(`/contacts/${contactId}/phones`);
    return response.data;
  }
);

export const createContactPhone = createAsyncThunk(
  'contacts/createContactPhone',
  async ({ contactId, data }: { contactId: string; data: CreateContactPhoneDTO }) => {
    const response = await api.post(`/contacts/${contactId}/phones`, data);
    return response.data;
  }
);

export const updateContactPhone = createAsyncThunk(
  'contacts/updateContactPhone',
  async ({ phoneId, data }: { phoneId: string; data: UpdateContactPhoneDTO }) => {
    const response = await api.put(`/contacts/phones/${phoneId}`, data);
    return response.data;
  }
);

export const deleteContactPhone = createAsyncThunk(
  'contacts/deleteContactPhone',
  async (phoneId: string) => {
    await api.delete(`/contacts/phones/${phoneId}`);
    return phoneId;
  }
);

// ============================================================================
// EMAIL ADDRESS THUNKS
// ============================================================================

export const fetchContactEmails = createAsyncThunk(
  'contacts/fetchContactEmails',
  async (contactId: string) => {
    const response = await api.get(`/contacts/${contactId}/emails`);
    return response.data;
  }
);

export const createContactEmail = createAsyncThunk(
  'contacts/createContactEmail',
  async ({ contactId, data }: { contactId: string; data: CreateContactEmailDTO }) => {
    const response = await api.post(`/contacts/${contactId}/emails`, data);
    return response.data;
  }
);

export const updateContactEmail = createAsyncThunk(
  'contacts/updateContactEmail',
  async ({ emailId, data }: { emailId: string; data: UpdateContactEmailDTO }) => {
    const response = await api.put(`/contacts/emails/${emailId}`, data);
    return response.data;
  }
);

export const deleteContactEmail = createAsyncThunk(
  'contacts/deleteContactEmail',
  async (emailId: string) => {
    await api.delete(`/contacts/emails/${emailId}`);
    return emailId;
  }
);

// ============================================================================
// RELATIONSHIP THUNKS
// ============================================================================

export const fetchContactRelationships = createAsyncThunk(
  'contacts/fetchContactRelationships',
  async (contactId: string) => {
    const response = await api.get(`/contacts/${contactId}/relationships`);
    return response.data;
  }
);

export const createContactRelationship = createAsyncThunk(
  'contacts/createContactRelationship',
  async ({ contactId, data }: { contactId: string; data: CreateContactRelationshipDTO }) => {
    const response = await api.post(`/contacts/${contactId}/relationships`, data);
    return response.data;
  }
);

export const updateContactRelationship = createAsyncThunk(
  'contacts/updateContactRelationship',
  async ({ relationshipId, data }: { relationshipId: string; data: UpdateContactRelationshipDTO }) => {
    const response = await api.put(`/contacts/relationships/${relationshipId}`, data);
    return response.data;
  }
);

export const deleteContactRelationship = createAsyncThunk(
  'contacts/deleteContactRelationship',
  async (relationshipId: string) => {
    await api.delete(`/contacts/relationships/${relationshipId}`);
    return relationshipId;
  }
);

// ============================================================================
// CONTACT NOTE THUNKS
// ============================================================================

export const fetchContactNotes = createAsyncThunk(
  'contacts/fetchContactNotes',
  async (contactId: string) => {
    const response = await api.get(`/contacts/${contactId}/notes`);
    return response.data;
  }
);

export const createContactNote = createAsyncThunk(
  'contacts/createContactNote',
  async ({ contactId, data }: { contactId: string; data: CreateContactNoteDTO }) => {
    const response = await api.post(`/contacts/${contactId}/notes`, data);
    return response.data;
  }
);

export const updateContactNote = createAsyncThunk(
  'contacts/updateContactNote',
  async ({ noteId, data }: { noteId: string; data: UpdateContactNoteDTO }) => {
    const response = await api.put(`/contacts/notes/${noteId}`, data);
    return response.data;
  }
);

export const deleteContactNote = createAsyncThunk(
  'contacts/deleteContactNote',
  async (noteId: string) => {
    await api.delete(`/contacts/notes/${noteId}`);
    return noteId;
  }
);

// ============================================================================
// CONTACT DOCUMENT THUNKS
// ============================================================================

export const fetchContactDocuments = createAsyncThunk(
  'contacts/fetchContactDocuments',
  async (contactId: string) => {
    const response = await api.get(`/contacts/${contactId}/documents`);
    return response.data;
  }
);

export const uploadContactDocument = createAsyncThunk(
  'contacts/uploadContactDocument',
  async ({ contactId, file, data }: { contactId: string; file: File; data: CreateContactDocumentDTO }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (data.case_id) formData.append('case_id', data.case_id);
    if (data.document_type) formData.append('document_type', data.document_type);
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (typeof data.is_portal_visible === 'boolean') {
      formData.append('is_portal_visible', String(data.is_portal_visible));
    }

    const response = await api.post(`/contacts/${contactId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
);

export const updateContactDocument = createAsyncThunk(
  'contacts/updateContactDocument',
  async ({ documentId, data }: { documentId: string; data: UpdateContactDocumentDTO }) => {
    const response = await api.put(`/contacts/documents/${documentId}`, data);
    return response.data;
  }
);

export const deleteContactDocument = createAsyncThunk(
  'contacts/deleteContactDocument',
  async (documentId: string) => {
    await api.delete(`/contacts/documents/${documentId}`);
    return documentId;
  }
);

// ============================================================================
// SLICE
// ============================================================================

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ContactsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
    clearCurrentContact: (state) => {
      state.currentContact = null;
      state.phones = [];
      state.emails = [];
      state.relationships = [];
      state.contactNotes = [];
      state.documents = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ========== CONTACTS ==========
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contacts';
      })
      .addCase(fetchContactById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContactById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentContact = action.payload;
      })
      .addCase(fetchContactById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contact';
      })
      .addCase(createContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts.unshift(action.payload);
      })
      .addCase(createContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create contact';
      })
      .addCase(updateContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.contacts.findIndex(
          (contact) => contact.contact_id === action.payload.contact_id
        );
        if (index !== -1) {
          state.contacts[index] = action.payload;
        }
        if (state.currentContact?.contact_id === action.payload.contact_id) {
          state.currentContact = action.payload;
        }
      })
      .addCase(updateContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update contact';
      })
      .addCase(deleteContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = state.contacts.filter((contact) => contact.contact_id !== action.payload);
      })
      .addCase(deleteContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete contact';
      })
      .addCase(fetchContactTags.fulfilled, (state, action) => {
        state.availableTags = action.payload || [];
      })

      // ========== PHONES ==========
      .addCase(fetchContactPhones.pending, (state) => {
        state.phonesLoading = true;
      })
      .addCase(fetchContactPhones.fulfilled, (state, action) => {
        state.phonesLoading = false;
        state.phones = action.payload;
      })
      .addCase(fetchContactPhones.rejected, (state) => {
        state.phonesLoading = false;
      })
      .addCase(createContactPhone.fulfilled, (state, action) => {
        state.phones.push(action.payload);
      })
      .addCase(updateContactPhone.fulfilled, (state, action) => {
        const index = state.phones.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.phones[index] = action.payload;
        }
      })
      .addCase(deleteContactPhone.fulfilled, (state, action) => {
        state.phones = state.phones.filter((p) => p.id !== action.payload);
      })

      // ========== EMAILS ==========
      .addCase(fetchContactEmails.pending, (state) => {
        state.emailsLoading = true;
      })
      .addCase(fetchContactEmails.fulfilled, (state, action) => {
        state.emailsLoading = false;
        state.emails = action.payload;
      })
      .addCase(fetchContactEmails.rejected, (state) => {
        state.emailsLoading = false;
      })
      .addCase(createContactEmail.fulfilled, (state, action) => {
        state.emails.push(action.payload);
      })
      .addCase(updateContactEmail.fulfilled, (state, action) => {
        const index = state.emails.findIndex((e) => e.id === action.payload.id);
        if (index !== -1) {
          state.emails[index] = action.payload;
        }
      })
      .addCase(deleteContactEmail.fulfilled, (state, action) => {
        state.emails = state.emails.filter((e) => e.id !== action.payload);
      })

      // ========== RELATIONSHIPS ==========
      .addCase(fetchContactRelationships.pending, (state) => {
        state.relationshipsLoading = true;
      })
      .addCase(fetchContactRelationships.fulfilled, (state, action) => {
        state.relationshipsLoading = false;
        state.relationships = Array.isArray(action.payload)
          ? action.payload
          : (action.payload?.relationships || []);
      })
      .addCase(fetchContactRelationships.rejected, (state) => {
        state.relationshipsLoading = false;
      })
      .addCase(createContactRelationship.fulfilled, (state, action) => {
        state.relationships.push(action.payload);
      })
      .addCase(updateContactRelationship.fulfilled, (state, action) => {
        const index = state.relationships.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.relationships[index] = action.payload;
        }
      })
      .addCase(deleteContactRelationship.fulfilled, (state, action) => {
        state.relationships = state.relationships.filter((r) => r.id !== action.payload);
      })

      // ========== NOTES ==========
      .addCase(fetchContactNotes.pending, (state) => {
        state.notesLoading = true;
      })
      .addCase(fetchContactNotes.fulfilled, (state, action) => {
        state.notesLoading = false;
        state.contactNotes = Array.isArray(action.payload)
          ? action.payload
          : (action.payload?.data || []);
      })
      .addCase(fetchContactNotes.rejected, (state) => {
        state.notesLoading = false;
      })
      .addCase(createContactNote.fulfilled, (state, action) => {
        state.contactNotes.unshift(action.payload);
      })
      .addCase(updateContactNote.fulfilled, (state, action) => {
        const index = state.contactNotes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.contactNotes[index] = action.payload;
        }
      })
      .addCase(deleteContactNote.fulfilled, (state, action) => {
        state.contactNotes = state.contactNotes.filter((n) => n.id !== action.payload);
      })

      // ========== DOCUMENTS ==========
      .addCase(fetchContactDocuments.pending, (state) => {
        state.documentsLoading = true;
      })
      .addCase(fetchContactDocuments.fulfilled, (state, action) => {
        state.documentsLoading = false;
        state.documents = action.payload;
      })
      .addCase(fetchContactDocuments.rejected, (state) => {
        state.documentsLoading = false;
      })
      .addCase(uploadContactDocument.fulfilled, (state, action) => {
        state.documents.unshift(action.payload);
      })
      .addCase(updateContactDocument.fulfilled, (state, action) => {
        const index = state.documents.findIndex((d) => d.id === action.payload.id);
        if (index !== -1) {
          state.documents[index] = action.payload;
        }
      })
      .addCase(deleteContactDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter((d) => d.id !== action.payload);
      });
  },
});

export const { setFilters, clearFilters, clearCurrentContact, clearError } = contactsSlice.actions;
export default contactsSlice.reducer;
