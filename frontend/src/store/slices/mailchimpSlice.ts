/**
 * Mailchimp Slice
 * Redux state management for email marketing integration
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';
import type {
  MailchimpState,
  MailchimpStatus,
  MailchimpList,
  MailchimpTag,
  MailchimpCampaign,
  MailchimpSegment,
  SyncContactRequest,
  BulkSyncRequest,
  BulkSyncResponse,
  SyncResult,
} from '../../types/mailchimp';

const initialState: MailchimpState = {
  status: null,
  lists: [],
  selectedList: null,
  tags: [],
  campaigns: [],
  segments: [],
  syncResult: null,
  isLoading: false,
  isSyncing: false,
  error: null,
};

/**
 * Fetch Mailchimp status
 */
export const fetchMailchimpStatus = createAsyncThunk<MailchimpStatus>(
  'mailchimp/fetchStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/mailchimp/status');
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch Mailchimp status';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch all Mailchimp lists
 */
export const fetchMailchimpLists = createAsyncThunk<MailchimpList[]>(
  'mailchimp/fetchLists',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/mailchimp/lists');
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch Mailchimp lists';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch a specific list
 */
export const fetchMailchimpList = createAsyncThunk<MailchimpList, string>(
  'mailchimp/fetchList',
  async (listId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/mailchimp/lists/${listId}`);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch Mailchimp list';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch tags for a list
 */
export const fetchListTags = createAsyncThunk<MailchimpTag[], string>(
  'mailchimp/fetchListTags',
  async (listId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/mailchimp/lists/${listId}/tags`);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch list tags';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch segments for a list
 */
export const fetchListSegments = createAsyncThunk<MailchimpSegment[], string>(
  'mailchimp/fetchListSegments',
  async (listId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/mailchimp/lists/${listId}/segments`);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch list segments';
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch campaigns
 */
export const fetchCampaigns = createAsyncThunk<MailchimpCampaign[], string | undefined>(
  'mailchimp/fetchCampaigns',
  async (listId, { rejectWithValue }) => {
    try {
      const url = listId ? `/mailchimp/campaigns?listId=${listId}` : '/mailchimp/campaigns';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch campaigns';
      return rejectWithValue(message);
    }
  }
);

/**
 * Sync a single contact
 */
export const syncContact = createAsyncThunk<SyncResult, SyncContactRequest>(
  'mailchimp/syncContact',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/mailchimp/sync/contact', data);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync contact';
      return rejectWithValue(message);
    }
  }
);

/**
 * Bulk sync contacts
 */
export const bulkSyncContacts = createAsyncThunk<BulkSyncResponse, BulkSyncRequest>(
  'mailchimp/bulkSync',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/mailchimp/sync/bulk', data);
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk sync contacts';
      return rejectWithValue(message);
    }
  }
);

const mailchimpSlice = createSlice({
  name: 'mailchimp',
  initialState,
  reducers: {
    clearMailchimpError: (state) => {
      state.error = null;
    },
    clearSyncResult: (state) => {
      state.syncResult = null;
    },
    setSelectedList: (state, action) => {
      state.selectedList = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch status
    builder
      .addCase(fetchMailchimpStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMailchimpStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.status = action.payload;
      })
      .addCase(fetchMailchimpStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch lists
    builder
      .addCase(fetchMailchimpLists.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMailchimpLists.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lists = action.payload;
      })
      .addCase(fetchMailchimpLists.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch single list
    builder
      .addCase(fetchMailchimpList.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMailchimpList.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedList = action.payload;
      })
      .addCase(fetchMailchimpList.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch tags
    builder
      .addCase(fetchListTags.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchListTags.fulfilled, (state, action) => {
        state.isLoading = false;
        state.tags = action.payload;
      })
      .addCase(fetchListTags.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch segments
    builder
      .addCase(fetchListSegments.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchListSegments.fulfilled, (state, action) => {
        state.isLoading = false;
        state.segments = action.payload;
      })
      .addCase(fetchListSegments.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch campaigns
    builder
      .addCase(fetchCampaigns.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCampaigns.fulfilled, (state, action) => {
        state.isLoading = false;
        state.campaigns = action.payload;
      })
      .addCase(fetchCampaigns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Sync contact
    builder
      .addCase(syncContact.pending, (state) => {
        state.isSyncing = true;
        state.error = null;
      })
      .addCase(syncContact.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.syncResult = {
          total: 1,
          added: action.payload.action === 'added' ? 1 : 0,
          updated: action.payload.action === 'updated' ? 1 : 0,
          skipped: action.payload.action === 'skipped' ? 1 : 0,
          errors: action.payload.success ? 0 : 1,
          results: [action.payload],
        };
      })
      .addCase(syncContact.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.payload as string;
      });

    // Bulk sync
    builder
      .addCase(bulkSyncContacts.pending, (state) => {
        state.isSyncing = true;
        state.error = null;
        state.syncResult = null;
      })
      .addCase(bulkSyncContacts.fulfilled, (state, action) => {
        state.isSyncing = false;
        state.syncResult = action.payload;
      })
      .addCase(bulkSyncContacts.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearMailchimpError,
  clearSyncResult,
  setSelectedList,
} = mailchimpSlice.actions;

export default mailchimpSlice.reducer;
