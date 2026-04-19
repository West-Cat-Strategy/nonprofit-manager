import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { WebsiteEntry } from '../../../types/websiteBuilder';
import { websitesApiClient } from '../api/websitesApiClient';
import type {
  CreateWebsiteSiteRequest,
  CreateWebsiteSiteResponse,
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
  WebsiteMauticSettings,
  WebsiteNewsletterListPreset,
  WebsiteNewsletterSettings,
  WebsiteOverviewSummary,
  WebsiteSearchParams,
  WebsiteSitesResponse,
  WebsiteState,
  WebsiteRollbackResult,
  WebsiteVersionHistory,
  WebsiteStripeSettings,
} from '../types/contracts';
import {
  buildInitialWebsitesCoreState,
  getWebsiteErrorMessage,
  mergeWebsiteForm,
  patchWebsiteSiteSummary,
  resolveWebsiteSiteId,
  setWebsiteSavingPending,
  setWebsiteSavingRejected,
  syncCurrentSiteDataFromOverview,
  syncWebsiteForms,
  syncWebsiteIntegrations,
  updateCurrentSiteData,
  type WebsiteCurrentSiteData,
} from './websitesCoreHelpers';

export type WebsitesCoreState = Omit<WebsiteState, 'forms' | 'integrations' | 'analytics'> & {
  currentSiteData: WebsiteCurrentSiteData;
};
const initialState: WebsitesCoreState = buildInitialWebsitesCoreState();

export const createWebsiteSite = createAsyncThunk<
  CreateWebsiteSiteResponse,
  CreateWebsiteSiteRequest
>('websites/createSite', async (payload, { rejectWithValue }) => {
  try {
    return await websitesApiClient.createSite(payload);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to create website'));
  }
});

export const fetchWebsiteSites = createAsyncThunk<
  WebsiteSitesResponse,
  WebsiteSearchParams | undefined
>('websites/fetchSites', async (params, { getState, rejectWithValue }) => {
  try {
    const state = getState() as { websites: WebsitesCoreState };
    return await websitesApiClient.listSites(params || state.websites.searchParams);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load websites'));
  }
});

export const fetchWebsiteOverview = createAsyncThunk<
  WebsiteOverviewSummary,
  { siteId: string; period?: number }
>('websites/fetchOverview', async ({ siteId, period }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.getOverview(siteId, period);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load website overview'));
  }
});

export const fetchWebsiteForms = createAsyncThunk<WebsiteFormDefinition[], string>(
  'websites/fetchForms',
  async (siteId, { rejectWithValue }) => {
    try {
      return await websitesApiClient.getForms(siteId);
    } catch (error) {
      return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load website forms'));
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
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to update website form'));
  }
});

export const fetchWebsiteIntegrations = createAsyncThunk<WebsiteIntegrationStatus, string>(
  'websites/fetchIntegrations',
  async (siteId, { rejectWithValue }) => {
    try {
      return await websitesApiClient.getIntegrations(siteId);
    } catch (error) {
      return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load integrations'));
    }
  }
);

export const fetchWebsiteNewsletterWorkspace = createAsyncThunk<WebsiteIntegrationStatus, string>(
  'websites/fetchNewsletterWorkspace',
  async (siteId, { rejectWithValue }) => {
    try {
      return await websitesApiClient.getNewsletterWorkspace(siteId);
    } catch (error) {
      return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load newsletter workspace'));
    }
  }
);

export const updateWebsiteNewsletterIntegration = createAsyncThunk<
  WebsiteIntegrationStatus,
  {
    siteId: string;
    data: {
      provider?: WebsiteNewsletterSettings['provider'];
      selectedAudienceId?: string | null;
      selectedAudienceName?: string | null;
      selectedPresetId?: string | null;
      listPresets?: WebsiteNewsletterListPreset[];
      lastRefreshedAt?: string | null;
      mailchimp?: Partial<WebsiteMailchimpSettings>;
      mautic?: Partial<WebsiteMauticSettings>;
    };
  }
>('websites/updateNewsletterIntegration', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateNewsletter(siteId, data);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to update newsletter settings'));
  }
});

export const refreshWebsiteNewsletterWorkspace = createAsyncThunk<WebsiteIntegrationStatus, string>(
  'websites/refreshNewsletterWorkspace',
  async (siteId, { rejectWithValue }) => {
    try {
      return await websitesApiClient.refreshNewsletterWorkspace(siteId);
    } catch (error) {
      return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to refresh newsletter workspace'));
    }
  }
);

export const createWebsiteNewsletterListPreset = createAsyncThunk<
  WebsiteIntegrationStatus,
  {
    siteId: string;
    data: {
      name: string;
      provider?: WebsiteNewsletterSettings['provider'];
      audienceId: string;
      audienceName?: string | null;
      notes?: string | null;
      defaultTags?: string[];
      syncEnabled?: boolean;
    };
  }
>('websites/createNewsletterListPreset', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.createNewsletterListPreset(siteId, data);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to create newsletter list'));
  }
});

export const updateWebsiteNewsletterListPreset = createAsyncThunk<
  WebsiteIntegrationStatus,
  {
    siteId: string;
    listId: string;
    data: {
      name?: string;
      provider?: WebsiteNewsletterSettings['provider'];
      audienceId?: string;
      audienceName?: string | null;
      notes?: string | null;
      defaultTags?: string[];
      syncEnabled?: boolean;
    };
  }
>('websites/updateNewsletterListPreset', async ({ siteId, listId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateNewsletterListPreset(siteId, listId, data);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to update newsletter list'));
  }
});

export const deleteWebsiteNewsletterListPreset = createAsyncThunk<
  WebsiteIntegrationStatus,
  { siteId: string; listId: string }
>('websites/deleteNewsletterListPreset', async ({ siteId, listId }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.deleteNewsletterListPreset(siteId, listId);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to delete newsletter list'));
  }
});

export const updateWebsiteMailchimpIntegration = createAsyncThunk<
  WebsiteIntegrationStatus,
  { siteId: string; data: Partial<WebsiteMailchimpSettings> }
>('websites/updateMailchimpIntegration', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateMailchimp(siteId, data);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to update Mailchimp settings'));
  }
});

export const updateWebsiteStripeIntegration = createAsyncThunk<
  WebsiteIntegrationStatus,
  { siteId: string; data: Partial<WebsiteStripeSettings> }
>('websites/updateStripeIntegration', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateStripe(siteId, data);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to update Stripe settings'));
  }
});

export const updateWebsiteFacebookIntegration = createAsyncThunk<
  WebsiteIntegrationStatus,
  { siteId: string; data: Partial<WebsiteFacebookSettings> }
>('websites/updateFacebookIntegration', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateFacebook(siteId, data);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to update Facebook settings'));
  }
});

export const fetchWebsiteAnalytics = createAsyncThunk<
  WebsiteConversionMetrics,
  { siteId: string; period?: number }
>('websites/fetchAnalytics', async ({ siteId, period }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.getAnalytics(siteId, period);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load analytics summary'));
  }
});

export const fetchWebsiteConversionFunnel = createAsyncThunk<
  WebsiteConversionFunnel,
  { siteId: string; windowDays?: number }
>('websites/fetchConversionFunnel', async ({ siteId, windowDays }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.getConversionFunnel(siteId, windowDays);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load conversion funnel'));
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
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load website content'));
  }
});

export const createWebsiteEntry = createAsyncThunk<
  WebsiteEntry,
  { siteId: string; data: WebsiteEntryCreateRequest }
>('websites/createEntry', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.createEntry(siteId, data);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to create website entry'));
  }
});

export const updateWebsiteEntry = createAsyncThunk<
  WebsiteEntry,
  { siteId: string; entryId: string; data: WebsiteEntryUpdateRequest }
>('websites/updateEntry', async ({ siteId, entryId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateEntry(siteId, entryId, data);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to update website entry'));
  }
});

export const deleteWebsiteEntry = createAsyncThunk<string, { siteId: string; entryId: string }>(
  'websites/deleteEntry',
  async ({ siteId, entryId }, { rejectWithValue }) => {
    try {
      await websitesApiClient.deleteEntry(siteId, entryId);
      return entryId;
    } catch (error) {
      return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to delete website entry'));
    }
  }
);

export const syncWebsiteMailchimpEntries = createAsyncThunk<
  WebsiteEntry[],
  { siteId: string; listId?: string }
>('websites/syncMailchimpEntries', async ({ siteId, listId }, { rejectWithValue }) => {
  try {
    const result = await websitesApiClient.syncMailchimpEntries(siteId, listId);
    return result.items;
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to sync Mailchimp entries'));
  }
});

export const fetchWebsiteDeployment = createAsyncThunk<WebsiteDeploymentInfo, string>(
  'websites/fetchDeployment',
  async (siteId, { rejectWithValue }) => {
    try {
      return await websitesApiClient.getDeployment(siteId);
    } catch (error) {
      return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load publishing status'));
    }
  }
);

export const fetchWebsiteVersions = createAsyncThunk<
  WebsiteVersionHistory,
  { siteId: string; limit?: number }
>('websites/fetchVersions', async ({ siteId, limit }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.getVersionHistory(siteId, limit);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to load website versions'));
  }
});

export const updateWebsiteSite = createAsyncThunk<
  WebsiteOverviewSummary['site'],
  { siteId: string; data: UpdateWebsiteSiteRequest }
>('websites/updateSite', async ({ siteId, data }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.updateSite(siteId, data);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to update website settings'));
  }
});

export const publishWebsiteSite = createAsyncThunk<
  Awaited<ReturnType<typeof websitesApiClient.publishSite>>,
  PublishWebsiteSiteRequest
>('websites/publishSite', async (payload, { rejectWithValue }) => {
  try {
    return await websitesApiClient.publishSite(payload);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to publish website'));
  }
});

export const rollbackWebsiteVersion = createAsyncThunk<
  WebsiteRollbackResult,
  { siteId: string; version: string }
>('websites/rollbackVersion', async ({ siteId, version }, { rejectWithValue }) => {
  try {
    return await websitesApiClient.rollbackVersion(siteId, version);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to roll back website version'));
  }
});

export const unpublishWebsiteSite = createAsyncThunk<WebsiteOverviewSummary['site'], string>(
  'websites/unpublishSite',
  async (siteId, { rejectWithValue }) => {
    try {
      return await websitesApiClient.unpublishSite(siteId);
    } catch (error) {
      return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to unpublish website'));
    }
  }
);

export const invalidateWebsiteCache = createAsyncThunk<
  { invalidated: boolean; siteId: string },
  string
>('websites/invalidateCache', async (siteId, { rejectWithValue }) => {
  try {
    return await websitesApiClient.invalidateCache(siteId);
  } catch (error) {
    return rejectWithValue(getWebsiteErrorMessage(error, 'Failed to refresh website cache'));
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
      .addCase(createWebsiteSite.pending, (state) => {
        state.isSaving = true;
        state.error = null;
      })
      .addCase(createWebsiteSite.fulfilled, (state, action) => {
        state.isSaving = false;
        state.currentSiteId = action.payload.id;
      })
      .addCase(createWebsiteSite.rejected, (state, action) => {
        state.isSaving = false;
        state.error = action.payload as string;
      })
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
        syncCurrentSiteDataFromOverview(state, action.payload);
      })
      .addCase(fetchWebsiteOverview.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchWebsiteForms.fulfilled, (state, action) => {
        syncWebsiteForms(state, action.meta.arg, action.payload);
      })
      .addCase(updateWebsiteForm.pending, (state) => {
        setWebsiteSavingPending(state);
      })
      .addCase(updateWebsiteForm.fulfilled, (state, action) => {
        state.isSaving = false;
        mergeWebsiteForm(state, action.meta.arg.siteId, action.payload);
      })
      .addCase(updateWebsiteForm.rejected, (state, action) => {
        setWebsiteSavingRejected(state, action.payload as string | undefined);
      });

    builder
      .addCase(fetchWebsiteIntegrations.fulfilled, (state, action) => {
        syncWebsiteIntegrations(state, action.meta.arg, action.payload);
      })
      .addCase(fetchWebsiteNewsletterWorkspace.fulfilled, (state, action) => {
        syncWebsiteIntegrations(state, action.meta.arg, action.payload);
      });

    builder.addCase(fetchWebsiteAnalytics.fulfilled, (state, action) => {
      updateCurrentSiteData(state, action.meta.arg.siteId, { analytics: action.payload });
      if (state.overview?.site.id === action.meta.arg.siteId) {
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
      .addCase(fetchWebsiteVersions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWebsiteVersions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.versions = action.payload;
      })
      .addCase(fetchWebsiteVersions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(updateWebsiteSite.pending, (state) => {
        setWebsiteSavingPending(state);
      })
      .addCase(updateWebsiteSite.fulfilled, (state, action) => {
        state.isSaving = false;
        patchWebsiteSiteSummary(state, action.payload);
      })
      .addCase(updateWebsiteSite.rejected, (state, action) => {
        setWebsiteSavingRejected(state, action.payload as string | undefined);
      })
      .addCase(publishWebsiteSite.pending, (state) => {
        setWebsiteSavingPending(state);
      })
      .addCase(publishWebsiteSite.fulfilled, (state, action) => {
        state.isSaving = false;
        state.lastPublishResult = action.payload;
      })
      .addCase(publishWebsiteSite.rejected, (state, action) => {
        setWebsiteSavingRejected(state, action.payload as string | undefined);
      })
      .addCase(rollbackWebsiteVersion.pending, (state) => {
        setWebsiteSavingPending(state);
      })
      .addCase(rollbackWebsiteVersion.fulfilled, (state, action) => {
        state.isSaving = false;
        if (state.versions) {
          state.versions.currentVersion = action.payload.currentVersion;
          state.versions.versions = state.versions.versions.map((version) => ({
            ...version,
            isCurrent: version.version === action.payload.currentVersion,
          }));
        }
        if (state.overview?.site.id === action.payload.siteId) {
          state.overview.site = {
            ...state.overview.site,
            publishedVersion: action.payload.currentVersion,
            publishedAt: action.payload.rolledBackAt,
          };
        }
      })
      .addCase(rollbackWebsiteVersion.rejected, (state, action) => {
        setWebsiteSavingRejected(state, action.payload as string | undefined);
      })
      .addCase(unpublishWebsiteSite.pending, (state) => {
        setWebsiteSavingPending(state);
      })
      .addCase(unpublishWebsiteSite.fulfilled, (state, action) => {
        state.isSaving = false;
        patchWebsiteSiteSummary(state, action.payload);
      })
      .addCase(unpublishWebsiteSite.rejected, (state, action) => {
        setWebsiteSavingRejected(state, action.payload as string | undefined);
      })
      .addCase(invalidateWebsiteCache.pending, (state) => {
        setWebsiteSavingPending(state);
      })
      .addCase(invalidateWebsiteCache.fulfilled, (state) => {
        state.isSaving = false;
      })
      .addCase(invalidateWebsiteCache.rejected, (state, action) => {
        setWebsiteSavingRejected(state, action.payload as string | undefined);
      });

    builder.addMatcher(
      isAnyOf(
        updateWebsiteNewsletterIntegration.pending,
        refreshWebsiteNewsletterWorkspace.pending,
        createWebsiteNewsletterListPreset.pending,
        updateWebsiteNewsletterListPreset.pending,
        deleteWebsiteNewsletterListPreset.pending,
        updateWebsiteMailchimpIntegration.pending,
        updateWebsiteStripeIntegration.pending,
        updateWebsiteFacebookIntegration.pending
      ),
      (state) => {
        setWebsiteSavingPending(state);
      }
    );

    builder.addMatcher(
      isAnyOf(
        updateWebsiteNewsletterIntegration.fulfilled,
        refreshWebsiteNewsletterWorkspace.fulfilled,
        createWebsiteNewsletterListPreset.fulfilled,
        updateWebsiteNewsletterListPreset.fulfilled,
        deleteWebsiteNewsletterListPreset.fulfilled,
        updateWebsiteMailchimpIntegration.fulfilled,
        updateWebsiteStripeIntegration.fulfilled,
        updateWebsiteFacebookIntegration.fulfilled
      ),
      (state, action) => {
        state.isSaving = false;
        syncWebsiteIntegrations(state, resolveWebsiteSiteId(action.meta.arg), action.payload);
      }
    );

    builder.addMatcher(
      isAnyOf(
        updateWebsiteNewsletterIntegration.rejected,
        refreshWebsiteNewsletterWorkspace.rejected,
        createWebsiteNewsletterListPreset.rejected,
        updateWebsiteNewsletterListPreset.rejected,
        deleteWebsiteNewsletterListPreset.rejected,
        updateWebsiteMailchimpIntegration.rejected,
        updateWebsiteStripeIntegration.rejected,
        updateWebsiteFacebookIntegration.rejected
      ),
      (state, action) => {
        setWebsiteSavingRejected(state, action.payload as string | undefined);
      }
    );
  },
});

export const { clearWebsitesError, setWebsiteSearchParams } = websitesSlice.actions;

export default websitesSlice.reducer;
