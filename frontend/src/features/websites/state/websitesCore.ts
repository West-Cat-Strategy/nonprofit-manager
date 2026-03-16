import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import type { WebsiteEntry } from '../../../types/websiteBuilder';
import { websitesApiClient } from '../api/websitesApiClient';
import type {
  PublishWebsiteSiteRequest,
  WebsiteConversionFunnel,
  UpdateWebsiteSiteRequest,
  WebsiteConversionMetrics,
  WebsiteDeploymentInfo,
  WebsiteEntryCreateRequest,
  WebsiteEntryUpdateRequest,
  WebsiteFormDefinition,
  WebsiteFormOperationalConfig,
  WebsiteIntegrationStatus,
  WebsiteFacebookSettings,
  WebsiteMailchimpSettings,
  WebsiteOverviewSummary,
  WebsiteSearchParams,
  WebsiteSitesResponse,
  WebsiteState,
  WebsiteStripeSettings,
} from '../types/contracts';

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  formatApiErrorMessageWith(fallbackMessage)(error);

const initialState: WebsiteState = {
  sites: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  },
  searchParams: {
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  overview: null,
  funnel: null,
  forms: [],
  integrations: null,
  analytics: null,
  entries: [],
  deployment: null,
  currentSiteId: null,
  isLoading: false,
  isSaving: false,
  error: null,
  funnelLoading: false,
  funnelError: null,
};

export const fetchWebsiteSites = createAsyncThunk<
  WebsiteSitesResponse,
  WebsiteSearchParams | undefined
>('websites/fetchSites', async (params, { getState, rejectWithValue }) => {
  try {
    const state = getState() as { websites: WebsiteState };
    return await websitesApiClient.listSites(params || state.websites.searchParams);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load websites'));
  }
});

export const fetchWebsiteOverview = createAsyncThunk<
  WebsiteOverviewSummary,
  { siteId: string; period?: number }
>('websites/fetchOverview', async ({ siteId, period }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.getOverview(siteId, period);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load website overview'));
  }
});

export const fetchWebsiteForms = createAsyncThunk<WebsiteFormDefinition[], string>(
  'websites/fetchForms',
  async (siteId, { rejectWithValue }) => {
    try {
      return await websitesApiClient.getForms(siteId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load website forms'));
    }
  }
);

export const updateWebsiteForm = createAsyncThunk<
  WebsiteFormDefinition,
  { siteId: string; formKey: string; data: Partial<WebsiteFormOperationalConfig> }
>('websites/updateForm', async ({ siteId, formKey, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateForm(siteId, formKey, data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to update website form'));
  }
});

export const fetchWebsiteIntegrations = createAsyncThunk<WebsiteIntegrationStatus, string>(
  'websites/fetchIntegrations',
  async (siteId, { rejectWithValue }) => {
    try {
      return await websitesApiClient.getIntegrations(siteId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load integrations'));
    }
  }
);

export const updateWebsiteMailchimpIntegration = createAsyncThunk<
  WebsiteIntegrationStatus,
  { siteId: string; data: Partial<WebsiteMailchimpSettings> }
>('websites/updateMailchimpIntegration', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateMailchimp(siteId, data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to update Mailchimp settings'));
  }
});

export const updateWebsiteStripeIntegration = createAsyncThunk<
  WebsiteIntegrationStatus,
  { siteId: string; data: Partial<WebsiteStripeSettings> }
>('websites/updateStripeIntegration', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateStripe(siteId, data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to update Stripe settings'));
  }
});

export const updateWebsiteFacebookIntegration = createAsyncThunk<
  WebsiteIntegrationStatus,
  { siteId: string; data: Partial<WebsiteFacebookSettings> }
>('websites/updateFacebookIntegration', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateFacebook(siteId, data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to update Facebook settings'));
  }
});

export const fetchWebsiteAnalytics = createAsyncThunk<
  WebsiteConversionMetrics,
  { siteId: string; period?: number }
>('websites/fetchAnalytics', async ({ siteId, period }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.getAnalytics(siteId, period);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load analytics summary'));
  }
});

export const fetchWebsiteConversionFunnel = createAsyncThunk<
  WebsiteConversionFunnel,
  { siteId: string; windowDays?: number }
>('websites/fetchConversionFunnel', async ({ siteId, windowDays }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.getConversionFunnel(siteId, windowDays);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load conversion funnel'));
  }
});

export const fetchWebsiteEntries = createAsyncThunk<
  WebsiteEntry[],
  { siteId: string; source?: 'native' | 'mailchimp'; status?: string }
>('websites/fetchEntries', async ({ siteId, source, status }, { rejectWithValue }) => {
  try {
    const result = await websitesApiClient.listEntries(siteId, source, status);
    return result.items;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load website content'));
  }
});

export const createWebsiteEntry = createAsyncThunk<
  WebsiteEntry,
  { siteId: string; data: WebsiteEntryCreateRequest }
>('websites/createEntry', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.createEntry(siteId, data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to create website entry'));
  }
});

export const updateWebsiteEntry = createAsyncThunk<
  WebsiteEntry,
  { siteId: string; entryId: string; data: WebsiteEntryUpdateRequest }
>('websites/updateEntry', async ({ siteId, entryId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateEntry(siteId, entryId, data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to update website entry'));
  }
});

export const deleteWebsiteEntry = createAsyncThunk<
  string,
  { siteId: string; entryId: string }
>('websites/deleteEntry', async ({ siteId, entryId }, { rejectWithValue }) => {
  try {
    await websitesApiClient.deleteEntry(siteId, entryId);
    return entryId;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to delete website entry'));
  }
});

export const syncWebsiteMailchimpEntries = createAsyncThunk<
  WebsiteEntry[],
  { siteId: string; listId?: string }
>('websites/syncMailchimpEntries', async ({ siteId, listId }, { rejectWithValue }) => {
  try {
    const result = await websitesApiClient.syncMailchimpEntries(siteId, listId);
    return result.items;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to sync Mailchimp entries'));
  }
});

export const fetchWebsiteDeployment = createAsyncThunk<WebsiteDeploymentInfo, string>(
  'websites/fetchDeployment',
  async (siteId, { rejectWithValue }) => {
    try {
      return await websitesApiClient.getDeployment(siteId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load publishing status'));
    }
  }
);

export const updateWebsiteSite = createAsyncThunk<
  WebsiteOverviewSummary['site'],
  { siteId: string; data: UpdateWebsiteSiteRequest }
>('websites/updateSite', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateSite(siteId, data);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to update website settings'));
  }
});

export const publishWebsiteSite = createAsyncThunk<
  Awaited<ReturnType<typeof websitesApiClient.publishSite>>,
  PublishWebsiteSiteRequest
>('websites/publishSite', async (payload, { rejectWithValue }) => {
  try {
    return await websitesApiClient.publishSite(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to publish website'));
  }
});

export const unpublishWebsiteSite = createAsyncThunk<
  WebsiteOverviewSummary['site'],
  string
>('websites/unpublishSite', async (siteId, { rejectWithValue }) => {
  try {
    return await websitesApiClient.unpublishSite(siteId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to unpublish website'));
  }
});

export const invalidateWebsiteCache = createAsyncThunk<
  { invalidated: boolean; siteId: string },
  string
>('websites/invalidateCache', async (siteId, { rejectWithValue }) => {
  try {
    return await websitesApiClient.invalidateCache(siteId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to refresh website cache'));
  }
});

const websitesSlice = createSlice({
  name: 'websites',
  initialState,
  reducers: {
    clearWebsitesError: (state) => {
      state.error = null;
    },
    setWebsiteSearchParams: (state, action: PayloadAction<Partial<WebsiteSearchParams>>) => {
      state.searchParams = {
        ...state.searchParams,
        ...action.payload,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWebsiteSites.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWebsiteSites.fulfilled, (state, action) => {
        state.isLoading = false;
        state.sites = action.payload.sites;
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          limit: action.payload.limit,
          totalPages: action.payload.totalPages,
        };
      })
      .addCase(fetchWebsiteSites.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchWebsiteOverview.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWebsiteOverview.fulfilled, (state, action) => {
        state.isLoading = false;
        state.overview = action.payload;
        state.currentSiteId = action.payload.site.id;
        state.forms = action.payload.forms;
        state.integrations = action.payload.integrations;
        state.analytics = action.payload.conversionMetrics;
      })
      .addCase(fetchWebsiteOverview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchWebsiteForms.fulfilled, (state, action) => {
        state.forms = action.payload;
      })
      .addCase(updateWebsiteForm.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateWebsiteForm.fulfilled, (state, action) => {
        state.isSaving = false;
        state.forms = state.forms.map((form) =>
          form.formKey === action.payload.formKey ? action.payload : form
        );
        if (state.overview) {
          state.overview.forms = state.overview.forms.map((form) =>
            form.formKey === action.payload.formKey ? action.payload : form
          );
        }
      })
      .addCase(updateWebsiteForm.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchWebsiteIntegrations.fulfilled, (state, action) => {
        state.integrations = action.payload;
      })
      .addCase(updateWebsiteMailchimpIntegration.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateWebsiteMailchimpIntegration.fulfilled, (state, action) => {
        state.isSaving = false;
        state.integrations = action.payload;
        if (state.overview) {
          state.overview.integrations = action.payload;
        }
      })
      .addCase(updateWebsiteMailchimpIntegration.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(updateWebsiteStripeIntegration.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateWebsiteStripeIntegration.fulfilled, (state, action) => {
        state.isSaving = false;
        state.integrations = action.payload;
        if (state.overview) {
          state.overview.integrations = action.payload;
        }
      })
      .addCase(updateWebsiteStripeIntegration.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(updateWebsiteFacebookIntegration.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateWebsiteFacebookIntegration.fulfilled, (state, action) => {
        state.isSaving = false;
        state.integrations = action.payload;
        if (state.overview) {
          state.overview.integrations = action.payload;
        }
      })
      .addCase(updateWebsiteFacebookIntegration.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });

    builder.addCase(fetchWebsiteAnalytics.fulfilled, (state, action) => {
      state.analytics = action.payload;
      if (state.overview) {
        state.overview.conversionMetrics = action.payload;
      }
    });

    builder
      .addCase(fetchWebsiteConversionFunnel.pending, (state) => {
        state.funnelLoading = true;
        state.funnelError = null;
      })
      .addCase(fetchWebsiteConversionFunnel.fulfilled, (state, action) => {
        state.funnelLoading = false;
        state.funnel = action.payload;
      })
      .addCase(fetchWebsiteConversionFunnel.rejected, (state, action) => {
        state.funnelLoading = false;
        state.funnelError = action.payload as string;
      });

    builder
      .addCase(fetchWebsiteEntries.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWebsiteEntries.fulfilled, (state, action) => {
        state.isLoading = false;
        state.entries = action.payload;
      })
      .addCase(fetchWebsiteEntries.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createWebsiteEntry.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(createWebsiteEntry.fulfilled, (state, action) => {
        state.isSaving = false;
        state.entries = [action.payload, ...state.entries];
      })
      .addCase(createWebsiteEntry.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(updateWebsiteEntry.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateWebsiteEntry.fulfilled, (state, action) => {
        state.isSaving = false;
        state.entries = state.entries.map((entry) =>
          entry.id === action.payload.id ? action.payload : entry
        );
      })
      .addCase(updateWebsiteEntry.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(deleteWebsiteEntry.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(deleteWebsiteEntry.fulfilled, (state, action) => {
        state.isSaving = false;
        state.entries = state.entries.filter((entry) => entry.id !== action.payload);
      })
      .addCase(deleteWebsiteEntry.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(syncWebsiteMailchimpEntries.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(syncWebsiteMailchimpEntries.fulfilled, (state, action) => {
        state.isSaving = false;
        state.entries = action.payload;
      })
      .addCase(syncWebsiteMailchimpEntries.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });

    builder.addCase(fetchWebsiteDeployment.fulfilled, (state, action) => {
      state.deployment = action.payload;
    });

    builder
      .addCase(updateWebsiteSite.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(updateWebsiteSite.fulfilled, (state, action) => {
        state.isSaving = false;
        if (state.overview?.site.id === action.payload.id) {
          state.overview.site = {
            ...state.overview.site,
            ...action.payload,
          };
        }
        state.sites = state.sites.map((site) =>
          site.id === action.payload.id ? { ...site, ...action.payload } : site
        );
      })
      .addCase(updateWebsiteSite.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(publishWebsiteSite.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(publishWebsiteSite.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(publishWebsiteSite.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(unpublishWebsiteSite.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(unpublishWebsiteSite.fulfilled, (state, action) => {
        state.isSaving = false;
        if (state.overview?.site.id === action.payload.id) {
          state.overview.site = {
            ...state.overview.site,
            ...action.payload,
          };
        }
        state.sites = state.sites.map((site) =>
          site.id === action.payload.id ? { ...site, ...action.payload } : site
        );
      })
      .addCase(unpublishWebsiteSite.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
      .addCase(invalidateWebsiteCache.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(invalidateWebsiteCache.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(invalidateWebsiteCache.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearWebsitesError, setWebsiteSearchParams } = websitesSlice.actions;

export default websitesSlice.reducer;
