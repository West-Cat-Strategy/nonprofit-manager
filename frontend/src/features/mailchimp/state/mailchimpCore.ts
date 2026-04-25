/**
 * Mailchimp Slice
 * Redux state management for email marketing integration
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../../services/api';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import type {
  MailchimpState,
  MailchimpStatus,
  MailchimpList,
  MailchimpTag,
  MailchimpCampaign,
  MailchimpSegment,
  SavedAudience,
  CampaignRun,
  CreateSavedAudienceRequest,
  SyncContactRequest,
  BulkSyncRequest,
  BulkSyncResponse,
  SyncResult,
  CreateCampaignRequest,
  MailchimpCampaignPreview,
} from '../../../types/mailchimp';

const getErrorMessage = (error: unknown, fallbackMessage: string) => formatApiErrorMessageWith(fallbackMessage)(error);

const initialState: MailchimpState = {
  status: null,
  lists: [],
  selectedList: null,
  tags: [],
  campaigns: [],
  savedAudiences: [],
  campaignRuns: [],
  segments: [],
  segmentsListId: null,
  syncResult: null,
  isLoading: false,
  isSyncing: false,
  isLoadingSavedAudiences: false,
  isCreatingSavedAudience: false,
  isArchivingSavedAudience: false,
  savedAudienceMessage: null,
  savedAudienceError: null,
  savedAudienceLoadError: null,
  savedAudienceCreateError: null,
  isLoadingCampaignRuns: false,
  campaignRunsError: null,
  isCreatingCampaign: false,
  isSendingCampaign: false,
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
      const message = getErrorMessage(error, 'Network error');
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
      const message = getErrorMessage(error, 'Failed to fetch lists');
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
      const message = getErrorMessage(error, 'List not found');
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
      const message = getErrorMessage(error, 'Failed to fetch tags');
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
      const message = getErrorMessage(error, 'Failed to fetch segments');
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
      const message = getErrorMessage(error, 'Failed to fetch campaigns');
      return rejectWithValue(message);
    }
  }
);

export const fetchSavedAudiences = createAsyncThunk<SavedAudience[]>(
  'mailchimp/fetchSavedAudiences',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/mailchimp/audiences');
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to fetch saved audiences');
      return rejectWithValue(message);
    }
  }
);

export const createSavedAudience = createAsyncThunk<SavedAudience, CreateSavedAudienceRequest>(
  'mailchimp/createSavedAudience',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/mailchimp/audiences', data);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create saved audience');
      return rejectWithValue(message);
    }
  }
);

export const archiveSavedAudience = createAsyncThunk<SavedAudience, string>(
  'mailchimp/archiveSavedAudience',
  async (audienceId, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/mailchimp/audiences/${audienceId}/archive`);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to archive saved audience');
      return rejectWithValue(message);
    }
  }
);

export const fetchCampaignRuns = createAsyncThunk<CampaignRun[]>(
  'mailchimp/fetchCampaignRuns',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/mailchimp/campaign-runs');
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to fetch campaign run history');
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
      const message = getErrorMessage(error, 'Sync failed');
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
      const message = getErrorMessage(error, 'Bulk sync failed');
      return rejectWithValue(message);
    }
  }
);

/**
 * Create a new campaign
 */
export const createCampaign = createAsyncThunk<MailchimpCampaign, CreateCampaignRequest>(
  'mailchimp/createCampaign',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/mailchimp/campaigns', data);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create campaign');
      return rejectWithValue(message);
    }
  }
);

/**
 * Render a local campaign preview
 */
export const previewCampaign = createAsyncThunk<MailchimpCampaignPreview, CreateCampaignRequest>(
  'mailchimp/previewCampaign',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/mailchimp/campaigns/preview', data);
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to preview campaign');
      return rejectWithValue(message);
    }
  }
);

/**
 * Send a campaign immediately
 */
export const sendCampaign = createAsyncThunk<void, string>(
  'mailchimp/sendCampaign',
  async (campaignId, { rejectWithValue }) => {
    try {
      await api.post(`/mailchimp/campaigns/${campaignId}/send`);
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to send campaign');
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
      state.savedAudienceError = null;
      state.savedAudienceLoadError = null;
      state.savedAudienceCreateError = null;
      state.campaignRunsError = null;
    },
    clearSyncResult: (state) => {
      state.syncResult = null;
    },
    setSelectedList: (state, action) => {
      state.selectedList = action.payload;
    },
    clearSavedAudienceMessage: (state) => {
      state.savedAudienceMessage = null;
      state.savedAudienceError = null;
      state.savedAudienceCreateError = null;
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
      .addCase(fetchListSegments.pending, (state, action) => {
        state.isLoading = true;
        state.segments = [];
        state.segmentsListId = action.meta.arg;
      })
      .addCase(fetchListSegments.fulfilled, (state, action) => {
        state.isLoading = false;
        if (state.segmentsListId === action.meta.arg) {
          state.segments = action.payload;
        }
      })
      .addCase(fetchListSegments.rejected, (state, action) => {
        state.isLoading = false;
        if (state.segmentsListId === action.meta.arg) {
          state.segments = [];
        }
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

    builder
      .addCase(fetchSavedAudiences.pending, (state) => {
        state.isLoadingSavedAudiences = true;
        state.savedAudienceError = null;
        state.savedAudienceLoadError = null;
      })
      .addCase(fetchSavedAudiences.fulfilled, (state, action) => {
        state.isLoadingSavedAudiences = false;
        state.savedAudiences = action.payload;
      })
      .addCase(fetchSavedAudiences.rejected, (state, action) => {
        state.isLoadingSavedAudiences = false;
        state.savedAudienceLoadError = action.payload as string;
        state.savedAudienceError = action.payload as string;
      })
      .addCase(createSavedAudience.pending, (state) => {
        state.isCreatingSavedAudience = true;
        state.savedAudienceMessage = null;
        state.savedAudienceError = null;
        state.savedAudienceCreateError = null;
      })
      .addCase(createSavedAudience.fulfilled, (state, action) => {
        state.isCreatingSavedAudience = false;
        state.savedAudiences.unshift(action.payload);
        state.savedAudienceMessage = `Saved "${action.payload.name}" for future campaigns.`;
      })
      .addCase(createSavedAudience.rejected, (state, action) => {
        state.isCreatingSavedAudience = false;
        state.savedAudienceCreateError = action.payload as string;
        state.savedAudienceError = action.payload as string;
      })
      .addCase(archiveSavedAudience.pending, (state) => {
        state.isArchivingSavedAudience = true;
        state.savedAudienceMessage = null;
        state.savedAudienceError = null;
      })
      .addCase(archiveSavedAudience.fulfilled, (state, action) => {
        state.isArchivingSavedAudience = false;
        state.savedAudiences = state.savedAudiences.filter(
          (audience) => audience.id !== action.payload.id
        );
        state.savedAudienceMessage = `Archived "${action.payload.name}".`;
      })
      .addCase(archiveSavedAudience.rejected, (state, action) => {
        state.isArchivingSavedAudience = false;
        state.savedAudienceError = action.payload as string;
      })
      .addCase(fetchCampaignRuns.pending, (state) => {
        state.isLoadingCampaignRuns = true;
        state.campaignRunsError = null;
      })
      .addCase(fetchCampaignRuns.fulfilled, (state, action) => {
        state.isLoadingCampaignRuns = false;
        state.campaignRuns = action.payload;
      })
      .addCase(fetchCampaignRuns.rejected, (state, action) => {
        state.isLoadingCampaignRuns = false;
        state.campaignRunsError = action.payload as string;
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

    // Create campaign
    builder
      .addCase(createCampaign.pending, (state) => {
        state.isLoading = true;
        state.isCreatingCampaign = true;
        state.error = null;
      })
      .addCase(createCampaign.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isCreatingCampaign = false;
        state.campaigns.unshift(action.payload);
      })
      .addCase(createCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.isCreatingCampaign = false;
        state.error = action.payload as string;
      });

    // Send campaign
    builder
      .addCase(sendCampaign.pending, (state) => {
        state.isLoading = true;
        state.isSendingCampaign = true;
        state.error = null;
      })
      .addCase(sendCampaign.fulfilled, (state) => {
        state.isLoading = false;
        state.isSendingCampaign = false;
      })
      .addCase(sendCampaign.rejected, (state, action) => {
        state.isLoading = false;
        state.isSendingCampaign = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearMailchimpError,
  clearSyncResult,
  clearSavedAudienceMessage,
  setSelectedList,
} = mailchimpSlice.actions;

export default mailchimpSlice.reducer;
