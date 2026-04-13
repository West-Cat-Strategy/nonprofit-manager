import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { contactsApiClient } from '../api/contactsApiClient';
import type { Contact, ContactsListQuery, ContactRoleFilter } from '../types/contracts';

export interface ContactsListState {
  contacts: Contact[];
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
  availableTags: string[];
}

const initialState: ContactsListState = {
  contacts: [],
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
  availableTags: [],
};

export const fetchContacts = createAsyncThunk(
  'contactsList/fetchContacts',
  async (params: ContactsListQuery) => {
    return await contactsApiClient.listContacts(params);
  }
);

export const fetchContactTags = createAsyncThunk(
  'contactsList/fetchContactTags',
  async () => {
    return await contactsApiClient.listTags();
  }
);

export const bulkUpdateContacts = createAsyncThunk(
  'contactsList/bulkUpdateContacts',
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

const contactsListSlice = createSlice({
  name: 'contactsList',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ContactsListState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.pagination.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
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
      .addCase(fetchContactTags.fulfilled, (state, action) => {
        state.availableTags = action.payload || [];
      })
      .addCase(bulkUpdateContacts.fulfilled, (state, action) => {
        // Handle local update if needed, but usually list is refreshed
      });
  },
});

export const { setFilters, clearFilters } = contactsListSlice.actions;
export default contactsListSlice.reducer;
