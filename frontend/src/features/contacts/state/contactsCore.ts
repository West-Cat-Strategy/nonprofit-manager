import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contactsApiClient } from '../api/contactsApiClient';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import type { Contact, ContactMergePreview, ContactMergeRequest } from '../../../types/contact';
import type { ContactMutationPayload } from '../types/contracts';

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  formatApiErrorMessageWith(fallbackMessage)(error);

export interface ContactsCoreState {
  currentContact: Contact | null;
  loading: boolean;
  error: string | null;
}

const initialState: ContactsCoreState = {
  currentContact: null,
  loading: false,
  error: null,
};

export const fetchContactById = createAsyncThunk<Contact, string, { rejectValue: string }>(
  'contactsCore/fetchContactById',
  async (contactId: string, { rejectWithValue }) => {
    try {
      return await contactsApiClient.getContact(contactId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch contact'));
    }
  }
);

export const createContact = createAsyncThunk<Contact, Partial<Contact>, { rejectValue: string }>(
  'contactsCore/createContact',
  async (contactData: Partial<Contact>, { rejectWithValue }) => {
    try {
      return await contactsApiClient.createContact(contactData as ContactMutationPayload);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to create contact'));
    }
  }
);

export const updateContact = createAsyncThunk<
  Contact,
  { contactId: string; data: Partial<Contact> },
  { rejectValue: string }
>(
  'contactsCore/updateContact',
  async ({ contactId, data }: { contactId: string; data: Partial<Contact> }, { rejectWithValue }) => {
    try {
      return await contactsApiClient.updateContact(contactId, data as ContactMutationPayload);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to update contact'));
    }
  }
);

export const deleteContact = createAsyncThunk(
  'contactsCore/deleteContact',
  async (contactId: string) => {
    await contactsApiClient.deleteContact(contactId);
    return contactId;
  }
);

export const mergeContact = createAsyncThunk(
  'contactsCore/mergeContact',
  async ({ contactId, payload }: { contactId: string; payload: ContactMergeRequest }) => {
    return await contactsApiClient.mergeContact(contactId, payload);
  }
);

export const searchContactsForMerge = createAsyncThunk(
  'contactsCore/searchContactsForMerge',
  async (query: { search: string; limit?: number }): Promise<Contact[]> => {
    return await contactsApiClient.searchContactsForMerge(query);
  }
);

export const fetchContactMergePreview = createAsyncThunk(
  'contactsCore/fetchContactMergePreview',
  async ({
    contactId,
    targetContactId,
  }: {
    contactId: string;
    targetContactId: string;
  }): Promise<ContactMergePreview> => {
    return await contactsApiClient.getContactMergePreview(contactId, targetContactId);
  }
);

const contactsCoreSlice = createSlice({
  name: 'contactsCore',
  initialState,
  reducers: {
    clearCurrentContact: (state) => {
      state.currentContact = null;
      state.loading = false;
      state.error = null;
    },
    clearCoreError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
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
        state.error = action.payload || action.error.message || 'Failed to fetch contact';
      })
      .addCase(createContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createContact.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || 'Failed to create contact';
      })
      .addCase(updateContact.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        if (state.currentContact?.contact_id === action.payload.contact_id) {
          state.currentContact = action.payload;
        }
      })
      .addCase(updateContact.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message || 'Failed to update contact';
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        if (state.currentContact?.contact_id === action.payload) {
          state.currentContact = null;
        }
      });
  },
});

export const { clearCurrentContact, clearCoreError } = contactsCoreSlice.actions;
export default contactsCoreSlice.reducer;
