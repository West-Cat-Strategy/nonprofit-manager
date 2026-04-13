import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { contactsApiClient } from '../api/contactsApiClient';
import type {
  ContactRelationship,
  CreateContactRelationshipDTO,
  UpdateContactRelationshipDTO,
} from '../../../types/contact';

export interface ContactRelationshipsState {
  relationships: ContactRelationship[];
  relationshipsLoading: boolean;
  error: string | null;
}

const initialState: ContactRelationshipsState = {
  relationships: [],
  relationshipsLoading: false,
  error: null,
};

export const fetchContactRelationships = createAsyncThunk(
  'contactRelationships/fetchContactRelationships',
  async (contactId: string) => {
    return await contactsApiClient.listRelationships(contactId);
  }
);

export const createContactRelationship = createAsyncThunk(
  'contactRelationships/createContactRelationship',
  async ({ contactId, data }: { contactId: string; data: CreateContactRelationshipDTO }) => {
    return await contactsApiClient.createRelationship(contactId, data);
  }
);

export const updateContactRelationship = createAsyncThunk(
  'contactRelationships/updateContactRelationship',
  async ({ relationshipId, data }: { relationshipId: string; data: UpdateContactRelationshipDTO }) => {
    return await contactsApiClient.updateRelationship(relationshipId, data);
  }
);

export const deleteContactRelationship = createAsyncThunk(
  'contactRelationships/deleteContactRelationship',
  async (relationshipId: string) => {
    await contactsApiClient.deleteRelationship(relationshipId);
    return relationshipId;
  }
);

const contactRelationshipsSlice = createSlice({
  name: 'contactRelationships',
  initialState,
  reducers: {
    clearRelationships: (state) => {
      state.relationships = [];
      state.relationshipsLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContactRelationships.pending, (state) => {
        state.relationshipsLoading = true;
      })
      .addCase(fetchContactRelationships.fulfilled, (state, action) => {
        state.relationshipsLoading = false;
        state.relationships = action.payload;
      })
      .addCase(fetchContactRelationships.rejected, (state, action) => {
        state.relationshipsLoading = false;
        state.error = action.error.message || 'Failed to fetch relationships';
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
      });
  },
});

export const { clearRelationships } = contactRelationshipsSlice.actions;
export default contactRelationshipsSlice.reducer;
