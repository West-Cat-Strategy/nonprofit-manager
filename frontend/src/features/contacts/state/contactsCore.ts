/**
 * Contacts Redux Slice
 * State management for contact operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { contactsApiClient } from '../api/contactsApiClient';
import type { ContactsListQuery } from '../types/contracts';
import type {
  Contact,
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
} from '../../../types/contact';
import type { ContactRoleFilter } from '../types/contracts';
export type { Contact };

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
    role: '' | ContactRoleFilter;
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
  async (params: ContactsListQuery) => {
    return await contactsApiClient.listContacts(params);
  }
);

export const fetchContactById = createAsyncThunk(
  'contacts/fetchContactById',
  async (contactId: string) => {
    return await contactsApiClient.getContact(contactId);
  }
);

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData: ContactInput) => {
    return await contactsApiClient.createContact(contactData as any);
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ contactId, data }: { contactId: string; data: ContactInput }) => {
    return await contactsApiClient.updateContact(contactId, data as any);
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (contactId: string) => {
    await contactsApiClient.deleteContact(contactId);
    return contactId;
  }
);

export const fetchContactTags = createAsyncThunk(
  'contacts/fetchContactTags',
  async () => {
    return await contactsApiClient.listTags();
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
    return await contactsApiClient.bulkUpdate(payload);
  }
);

// ============================================================================
// PHONE NUMBER THUNKS
// ============================================================================

export const fetchContactPhones = createAsyncThunk(
  'contacts/fetchContactPhones',
  async (contactId: string) => {
    return await contactsApiClient.listPhones(contactId);
  }
);

export const createContactPhone = createAsyncThunk(
  'contacts/createContactPhone',
  async ({ contactId, data }: { contactId: string; data: CreateContactPhoneDTO }) => {
    return await contactsApiClient.createPhone(contactId, data);
  }
);

export const updateContactPhone = createAsyncThunk(
  'contacts/updateContactPhone',
  async ({ phoneId, data }: { phoneId: string; data: UpdateContactPhoneDTO }) => {
    return await contactsApiClient.updatePhone(phoneId, data);
  }
);

export const deleteContactPhone = createAsyncThunk(
  'contacts/deleteContactPhone',
  async (phoneId: string) => {
    await contactsApiClient.deletePhone(phoneId);
    return phoneId;
  }
);

// ============================================================================
// EMAIL ADDRESS THUNKS
// ============================================================================

export const fetchContactEmails = createAsyncThunk(
  'contacts/fetchContactEmails',
  async (contactId: string) => {
    return await contactsApiClient.listEmails(contactId);
  }
);

export const createContactEmail = createAsyncThunk(
  'contacts/createContactEmail',
  async ({ contactId, data }: { contactId: string; data: CreateContactEmailDTO }) => {
    return await contactsApiClient.createEmail(contactId, data);
  }
);

export const updateContactEmail = createAsyncThunk(
  'contacts/updateContactEmail',
  async ({ emailId, data }: { emailId: string; data: UpdateContactEmailDTO }) => {
    return await contactsApiClient.updateEmail(emailId, data);
  }
);

export const deleteContactEmail = createAsyncThunk(
  'contacts/deleteContactEmail',
  async (emailId: string) => {
    await contactsApiClient.deleteEmail(emailId);
    return emailId;
  }
);

// ============================================================================
// RELATIONSHIP THUNKS
// ============================================================================

export const fetchContactRelationships = createAsyncThunk(
  'contacts/fetchContactRelationships',
  async (contactId: string) => {
    return await contactsApiClient.listRelationships(contactId);
  }
);

export const createContactRelationship = createAsyncThunk(
  'contacts/createContactRelationship',
  async ({ contactId, data }: { contactId: string; data: CreateContactRelationshipDTO }) => {
    return await contactsApiClient.createRelationship(contactId, data);
  }
);

export const updateContactRelationship = createAsyncThunk(
  'contacts/updateContactRelationship',
  async ({ relationshipId, data }: { relationshipId: string; data: UpdateContactRelationshipDTO }) => {
    return await contactsApiClient.updateRelationship(relationshipId, data);
  }
);

export const deleteContactRelationship = createAsyncThunk(
  'contacts/deleteContactRelationship',
  async (relationshipId: string) => {
    await contactsApiClient.deleteRelationship(relationshipId);
    return relationshipId;
  }
);

// ============================================================================
// CONTACT NOTE THUNKS
// ============================================================================

export const fetchContactNotes = createAsyncThunk(
  'contacts/fetchContactNotes',
  async (contactId: string) => {
    const result = await contactsApiClient.listNotes(contactId);
    return result.notes;
  }
);

export const createContactNote = createAsyncThunk(
  'contacts/createContactNote',
  async ({ contactId, data }: { contactId: string; data: CreateContactNoteDTO }) => {
    return await contactsApiClient.createNote(contactId, data);
  }
);

export const updateContactNote = createAsyncThunk(
  'contacts/updateContactNote',
  async ({ noteId, data }: { noteId: string; data: UpdateContactNoteDTO }) => {
    return await contactsApiClient.updateNote(noteId, data);
  }
);

export const deleteContactNote = createAsyncThunk(
  'contacts/deleteContactNote',
  async (noteId: string) => {
    await contactsApiClient.deleteNote(noteId);
    return noteId;
  }
);

// ============================================================================
// CONTACT DOCUMENT THUNKS
// ============================================================================

export const fetchContactDocuments = createAsyncThunk(
  'contacts/fetchContactDocuments',
  async (contactId: string) => {
    return await contactsApiClient.listDocuments(contactId);
  }
);

export const uploadContactDocument = createAsyncThunk(
  'contacts/uploadContactDocument',
  async ({ contactId, file, data }: { contactId: string; file: File; data: CreateContactDocumentDTO }) => {
    return await contactsApiClient.uploadDocument(contactId, data, file);
  }
);

export const updateContactDocument = createAsyncThunk(
  'contacts/updateContactDocument',
  async ({ documentId, data }: { documentId: string; data: UpdateContactDocumentDTO }) => {
    return await contactsApiClient.updateDocument(documentId, data);
  }
);

export const deleteContactDocument = createAsyncThunk(
  'contacts/deleteContactDocument',
  async (documentId: string) => {
    await contactsApiClient.deleteDocument(documentId);
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
        state['contacts'] = action.payload.data;
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
        state['contacts'].unshift(action.payload);
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
        const index = state['contacts'].findIndex(
          (contact) => contact.contact_id === action.payload.contact_id
        );
        if (index !== -1) {
          state['contacts'][index] = action.payload;
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
        state['contacts'] = state['contacts'].filter((contact) => contact.contact_id !== action.payload);
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
        state.relationships = action.payload;
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
        state.contactNotes = action.payload;
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
