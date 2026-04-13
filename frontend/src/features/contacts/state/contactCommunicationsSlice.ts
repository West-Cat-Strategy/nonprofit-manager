import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contactsApiClient } from '../api/contactsApiClient';
import type {
  ContactPhoneNumber,
  ContactEmailAddress,
  CreateContactPhoneDTO,
  UpdateContactPhoneDTO,
  CreateContactEmailDTO,
  UpdateContactEmailDTO,
} from '../../../types/contact';

export interface ContactCommunicationsState {
  phones: ContactPhoneNumber[];
  emails: ContactEmailAddress[];
  phonesLoading: boolean;
  emailsLoading: boolean;
  error: string | null;
}

const initialState: ContactCommunicationsState = {
  phones: [],
  emails: [],
  phonesLoading: false,
  emailsLoading: false,
  error: null,
};

// Phone Thunks
export const fetchContactPhones = createAsyncThunk(
  'contactComms/fetchContactPhones',
  async (contactId: string) => {
    return await contactsApiClient.listPhones(contactId);
  }
);

export const createContactPhone = createAsyncThunk(
  'contactComms/createContactPhone',
  async ({ contactId, data }: { contactId: string; data: CreateContactPhoneDTO }) => {
    return await contactsApiClient.createPhone(contactId, data);
  }
);

export const updateContactPhone = createAsyncThunk(
  'contactComms/updateContactPhone',
  async ({ phoneId, data }: { phoneId: string; data: UpdateContactPhoneDTO }) => {
    return await contactsApiClient.updatePhone(phoneId, data);
  }
);

export const deleteContactPhone = createAsyncThunk(
  'contactComms/deleteContactPhone',
  async (phoneId: string) => {
    await contactsApiClient.deletePhone(phoneId);
    return phoneId;
  }
);

// Email Thunks
export const fetchContactEmails = createAsyncThunk(
  'contactComms/fetchContactEmails',
  async (contactId: string) => {
    return await contactsApiClient.listEmails(contactId);
  }
);

export const createContactEmail = createAsyncThunk(
  'contactComms/createContactEmail',
  async ({ contactId, data }: { contactId: string; data: CreateContactEmailDTO }) => {
    return await contactsApiClient.createEmail(contactId, data);
  }
);

export const updateContactEmail = createAsyncThunk(
  'contactComms/updateContactEmail',
  async ({ emailId, data }: { emailId: string; data: UpdateContactEmailDTO }) => {
    return await contactsApiClient.updateEmail(emailId, data);
  }
);

export const deleteContactEmail = createAsyncThunk(
  'contactComms/deleteContactEmail',
  async (emailId: string) => {
    await contactsApiClient.deleteEmail(emailId);
    return emailId;
  }
);

const contactCommunicationsSlice = createSlice({
  name: 'contactComms',
  initialState,
  reducers: {
    clearComms: (state) => {
      state.phones = [];
      state.emails = [];
      state.phonesLoading = false;
      state.emailsLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Phones
      .addCase(fetchContactPhones.pending, (state) => {
        state.phonesLoading = true;
      })
      .addCase(fetchContactPhones.fulfilled, (state, action) => {
        state.phonesLoading = false;
        state.phones = action.payload;
      })
      .addCase(fetchContactPhones.rejected, (state, action) => {
        state.phonesLoading = false;
        state.error = action.error.message || 'Failed to fetch phones';
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
      // Emails
      .addCase(fetchContactEmails.pending, (state) => {
        state.emailsLoading = true;
      })
      .addCase(fetchContactEmails.fulfilled, (state, action) => {
        state.emailsLoading = false;
        state.emails = action.payload;
      })
      .addCase(fetchContactEmails.rejected, (state, action) => {
        state.emailsLoading = false;
        state.error = action.error.message || 'Failed to fetch emails';
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
      });
  },
});

export const { clearComms } = contactCommunicationsSlice.actions;
export default contactCommunicationsSlice.reducer;
