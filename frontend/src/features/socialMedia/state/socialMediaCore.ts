import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import { socialMediaApiClient } from '../api/socialMediaApiClient';
import { websitesApiClient } from '../../websites/api/websitesApiClient';
import type {
  WebsiteFacebookSettings,
  WebsiteIntegrationStatus,
  WebsiteSiteSummary,
} from '../../websites/types/contracts';
import type {
  SocialMediaSettingsPatch,
  SocialMediaSiteMapping,
  SocialMediaState,
  SocialMediaTrackedPage,
  SocialMediaTestResult,
} from '../types/contracts';

const getErrorMessage = (error: unknown, fallbackMessage: string) =>
  formatApiErrorMessageWith(fallbackMessage)(error);

const toSiteMapping = (
  site: WebsiteSiteSummary,
  integrations: WebsiteIntegrationStatus
): SocialMediaSiteMapping => ({
  siteId: site.id,
  siteName: site.name,
  primaryUrl: site.primaryUrl,
  publishStatus: integrations.publishStatus,
  blocked: integrations.blocked,
  trackedPageId: integrations.social.facebook.trackedPageId ?? null,
  trackedPageName: integrations.social.facebook.trackedPageName ?? null,
  syncEnabled: integrations.social.facebook.syncEnabled ?? false,
  lastSyncAt: integrations.social.facebook.lastSyncAt ?? null,
  lastSyncError: integrations.social.facebook.lastSyncError ?? null,
});

const applyTrackedPageToMappings = (
  siteMappings: SocialMediaSiteMapping[],
  page: SocialMediaTrackedPage
): SocialMediaSiteMapping[] =>
  siteMappings.map((mapping) =>
    mapping.trackedPageId === page.id
      ? {
          ...mapping,
          trackedPageName: page.pageName,
          lastSyncAt: page.lastSyncAt,
          lastSyncError: page.lastSyncError,
        }
      : mapping
  );

const loadAllSites = async (): Promise<WebsiteSiteSummary[]> => {
  const sites: WebsiteSiteSummary[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await websitesApiClient.listSites({
      page,
      limit: 100,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    sites.push(...response.sites);
    totalPages = response.totalPages;
    page += 1;
  } while (page <= totalPages);

  return sites;
};

const initialState: SocialMediaState = {
  settings: null,
  pages: [],
  siteMappings: [],
  snapshotsByPageId: {},
  settingsLoading: false,
  pagesLoading: false,
  siteMappingsLoading: false,
  isSavingSettings: false,
  isTestingSettings: false,
  isDiscoveringPages: false,
  pageSyncingIds: {},
  siteSavingIds: {},
  snapshotLoadingByPageId: {},
  testResult: null,
  error: null,
};

export const fetchFacebookSettings = createAsyncThunk('socialMedia/fetchFacebookSettings', async (_, { rejectWithValue }) => {
  try {
    return await socialMediaApiClient.getFacebookSettings();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load Facebook settings'));
  }
});

export const updateFacebookSettings = createAsyncThunk(
  'socialMedia/updateFacebookSettings',
  async ({ data }: { data: SocialMediaSettingsPatch }, { rejectWithValue }) => {
    try {
      return await socialMediaApiClient.updateFacebookSettings(data);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to save Facebook settings'));
    }
  }
);

export const testFacebookSettings = createAsyncThunk<SocialMediaTestResult, void>(
  'socialMedia/testFacebookSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await socialMediaApiClient.testFacebookSettings();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to test Facebook settings'));
    }
  }
);

export const fetchFacebookPages = createAsyncThunk('socialMedia/fetchFacebookPages', async (_, { rejectWithValue }) => {
  try {
    return await socialMediaApiClient.listFacebookPages();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load Facebook pages'));
  }
});

export const discoverFacebookPages = createAsyncThunk(
  'socialMedia/discoverFacebookPages',
  async (_, { rejectWithValue }) => {
    try {
      return await socialMediaApiClient.discoverFacebookPages();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to discover Facebook pages'));
    }
  }
);

export const fetchFacebookPageSnapshots = createAsyncThunk(
  'socialMedia/fetchFacebookPageSnapshots',
  async ({ pageId, limit = 30 }: { pageId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const snapshots = await socialMediaApiClient.getFacebookPageSnapshots(pageId, limit);
      return { pageId, snapshots };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load Facebook history'));
    }
  }
);

export const syncFacebookPage = createAsyncThunk(
  'socialMedia/syncFacebookPage',
  async (pageId: string, { rejectWithValue }) => {
    try {
      return await socialMediaApiClient.syncFacebookPage(pageId);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to sync Facebook page'));
    }
  }
);

export const fetchSocialMediaSiteMappings = createAsyncThunk(
  'socialMedia/fetchSiteMappings',
  async (_, { rejectWithValue }) => {
    try {
      const sites = await loadAllSites();
      const mappings = await Promise.all(
        sites.map(async (site) => {
          const integrations = await websitesApiClient.getIntegrations(site.id);
          return toSiteMapping(site, integrations);
        })
      );
      return mappings;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load website mappings'));
    }
  }
);

export const updateWebsiteFacebookMapping = createAsyncThunk(
  'socialMedia/updateWebsiteFacebookMapping',
  async (
    {
      siteId,
      data,
    }: {
      siteId: string;
      data: Partial<WebsiteFacebookSettings>;
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const integrations = await websitesApiClient.updateFacebook(siteId, data);
      const state = getState() as { socialMedia: SocialMediaState };
      const currentMapping = state.socialMedia.siteMappings.find((mapping) => mapping.siteId === siteId);

      if (!currentMapping) {
        throw new Error('Website mapping not found');
      }

      return {
        ...currentMapping,
        trackedPageId: integrations.social.facebook.trackedPageId ?? null,
        trackedPageName: integrations.social.facebook.trackedPageName ?? null,
        syncEnabled: integrations.social.facebook.syncEnabled ?? false,
        lastSyncAt: integrations.social.facebook.lastSyncAt ?? null,
        lastSyncError: integrations.social.facebook.lastSyncError ?? null,
        publishStatus: integrations.publishStatus,
        blocked: integrations.blocked,
      } satisfies SocialMediaSiteMapping;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, 'Failed to save website Facebook mapping'));
    }
  }
);

const socialMediaSlice = createSlice({
  name: 'socialMedia',
  initialState,
  reducers: {
    clearSocialMediaError: (state) => {
      state.error = null;
    },
    clearSocialMediaFeedback: (state) => {
      state.error = null;
      state.testResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFacebookSettings.pending, (state) => {
        state.settingsLoading = true;
        state.error = null;
      })
      .addCase(fetchFacebookSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        state.settings = action.payload;
      })
      .addCase(fetchFacebookSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateFacebookSettings.pending, (state) => {
        state.isSavingSettings = true;
        state.error = null;
      })
      .addCase(updateFacebookSettings.fulfilled, (state, action) => {
        state.isSavingSettings = false;
        state.settings = action.payload;
      })
      .addCase(updateFacebookSettings.rejected, (state, action) => {
        state.isSavingSettings = false;
        state.error = action.payload as string;
      })
      .addCase(testFacebookSettings.pending, (state) => {
        state.isTestingSettings = true;
        state.error = null;
      })
      .addCase(testFacebookSettings.fulfilled, (state, action) => {
        state.isTestingSettings = false;
        state.testResult = action.payload;
      })
      .addCase(testFacebookSettings.rejected, (state, action) => {
        state.isTestingSettings = false;
        state.error = action.payload as string;
      })
      .addCase(fetchFacebookPages.pending, (state) => {
        state.pagesLoading = true;
        state.error = null;
      })
      .addCase(fetchFacebookPages.fulfilled, (state, action) => {
        state.pagesLoading = false;
        state.pages = action.payload;
      })
      .addCase(fetchFacebookPages.rejected, (state, action) => {
        state.pagesLoading = false;
        state.error = action.payload as string;
      })
      .addCase(discoverFacebookPages.pending, (state) => {
        state.isDiscoveringPages = true;
        state.error = null;
      })
      .addCase(discoverFacebookPages.fulfilled, (state, action) => {
        state.isDiscoveringPages = false;
        state.pages = action.payload;
      })
      .addCase(discoverFacebookPages.rejected, (state, action) => {
        state.isDiscoveringPages = false;
        state.error = action.payload as string;
      })
      .addCase(fetchFacebookPageSnapshots.pending, (state, action) => {
        state.snapshotLoadingByPageId[action.meta.arg.pageId] = true;
      })
      .addCase(fetchFacebookPageSnapshots.fulfilled, (state, action) => {
        state.snapshotLoadingByPageId[action.payload.pageId] = false;
        state.snapshotsByPageId[action.payload.pageId] = action.payload.snapshots;
      })
      .addCase(fetchFacebookPageSnapshots.rejected, (state, action) => {
        state.snapshotLoadingByPageId[action.meta.arg.pageId] = false;
        state.error = action.payload as string;
      })
      .addCase(syncFacebookPage.pending, (state, action) => {
        state.pageSyncingIds[action.meta.arg] = true;
        state.error = null;
      })
      .addCase(syncFacebookPage.fulfilled, (state, action) => {
        state.pageSyncingIds[action.payload.id] = false;
        state.pages = state.pages.map((page) => (page.id === action.payload.id ? action.payload : page));
        state.siteMappings = applyTrackedPageToMappings(state.siteMappings, action.payload);
      })
      .addCase(syncFacebookPage.rejected, (state, action) => {
        state.pageSyncingIds[action.meta.arg] = false;
        state.error = action.payload as string;
      })
      .addCase(fetchSocialMediaSiteMappings.pending, (state) => {
        state.siteMappingsLoading = true;
        state.error = null;
      })
      .addCase(fetchSocialMediaSiteMappings.fulfilled, (state, action) => {
        state.siteMappingsLoading = false;
        state.siteMappings = action.payload;
      })
      .addCase(fetchSocialMediaSiteMappings.rejected, (state, action) => {
        state.siteMappingsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(updateWebsiteFacebookMapping.pending, (state, action) => {
        state.siteSavingIds[action.meta.arg.siteId] = true;
        state.error = null;
      })
      .addCase(updateWebsiteFacebookMapping.fulfilled, (state, action) => {
        state.siteSavingIds[action.payload.siteId] = false;
        state.siteMappings = state.siteMappings.map((mapping) =>
          mapping.siteId === action.payload.siteId ? action.payload : mapping
        );
      })
      .addCase(updateWebsiteFacebookMapping.rejected, (state, action) => {
        state.siteSavingIds[action.meta.arg.siteId] = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSocialMediaError, clearSocialMediaFeedback } = socialMediaSlice.actions;

export default socialMediaSlice.reducer;
