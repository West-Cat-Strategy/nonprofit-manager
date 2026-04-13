import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contactsApiClient } from '../api/contactsApiClient';
import type {
  ContactDocument,
  CreateContactDocumentDTO,
  UpdateContactDocumentDTO,
} from '../../../types/contact';

export interface ContactDocumentsState {
  documents: ContactDocument[];
  documentsLoading: boolean;
  error: string | null;
}

const initialState: ContactDocumentsState = {
  documents: [],
  documentsLoading: false,
  error: null,
};

export const fetchContactDocuments = createAsyncThunk(
  'contactDocuments/fetchContactDocuments',
  async (contactId: string) => {
    return await contactsApiClient.listDocuments(contactId);
  }
);

export const uploadContactDocument = createAsyncThunk(
  'contactDocuments/uploadContactDocument',
  async ({ contactId, file, data }: { contactId: string; file: File; data: CreateContactDocumentDTO }) => {
    return await contactsApiClient.uploadDocument(contactId, data, file);
  }
);

export const updateContactDocument = createAsyncThunk(
  'contactDocuments/updateContactDocument',
  async ({ documentId, data }: { documentId: string; data: UpdateContactDocumentDTO }) => {
    return await contactsApiClient.updateDocument(documentId, data);
  }
);

export const deleteContactDocument = createAsyncThunk(
  'contactDocuments/deleteContactDocument',
  async (documentId: string) => {
    await contactsApiClient.deleteDocument(documentId);
    return documentId;
  }
);

const contactDocumentsSlice = createSlice({
  name: 'contactDocuments',
  initialState,
  reducers: {
    clearDocuments: (state) => {
      state.documents = [];
      state.documentsLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContactDocuments.pending, (state) => {
        state.documentsLoading = true;
      })
      .addCase(fetchContactDocuments.fulfilled, (state, action) => {
        state.documentsLoading = false;
        state.documents = action.payload;
      })
      .addCase(fetchContactDocuments.rejected, (state, action) => {
        state.documentsLoading = false;
        state.error = action.error.message || 'Failed to fetch documents';
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

export const { clearDocuments } = contactDocumentsSlice.actions;
export default contactDocumentsSlice.reducer;
