import { describe, expect, it } from 'vitest';
import socialMediaReducer, {
  clearSocialMediaFeedback,
  fetchFacebookPageSnapshots,
  syncFacebookPage,
  testFacebookSettings,
} from './socialMediaCore';
import type {
  SocialMediaDailySnapshot,
  SocialMediaState,
  SocialMediaTrackedPage,
} from '../types/contracts';

const trackedPage = (overrides: Partial<SocialMediaTrackedPage>): SocialMediaTrackedPage => ({
  id: overrides.id || 'page-1',
  organizationId: overrides.organizationId || 'org-1',
  platform: 'facebook',
  externalPageId: overrides.externalPageId || 'external-page-1',
  pageName: overrides.pageName || 'Community Page',
  syncEnabled: overrides.syncEnabled ?? true,
  lastSyncAt: overrides.lastSyncAt ?? null,
  lastSyncError: overrides.lastSyncError ?? null,
  linkedSiteIds: overrides.linkedSiteIds || [],
  latestSnapshot: overrides.latestSnapshot ?? null,
  createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
});

const snapshot = (overrides: Partial<SocialMediaDailySnapshot>): SocialMediaDailySnapshot => ({
  id: overrides.id || 'snapshot-1',
  organizationId: overrides.organizationId || 'org-1',
  pageId: overrides.pageId || 'page-1',
  platform: 'facebook',
  snapshotDate: overrides.snapshotDate || '2026-01-01',
  followers: overrides.followers ?? 100,
  reach: overrides.reach ?? 200,
  impressions: overrides.impressions ?? 300,
  engagedUsers: overrides.engagedUsers ?? 20,
  postCount: overrides.postCount ?? 5,
  rawPayload: overrides.rawPayload || {},
  createdAt: overrides.createdAt || '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt || '2026-01-01T00:00:00.000Z',
});

describe('socialMedia reducer', () => {
  it('updates tracked pages and linked site mappings after a page sync', () => {
    const initialState = socialMediaReducer(undefined, { type: 'init' });
    const stateWithPage: SocialMediaState = {
      ...initialState,
      pages: [trackedPage({ id: 'page-1', pageName: 'Old name' })],
      siteMappings: [
        {
          siteId: 'site-1',
          siteName: 'Public Website',
          primaryUrl: 'https://public.example.org',
          publishStatus: 'published',
          blocked: false,
          trackedPageId: 'page-1',
          trackedPageName: 'Old name',
          syncEnabled: true,
          lastSyncAt: null,
          lastSyncError: null,
        },
      ],
      pageSyncingIds: {
        'page-1': true,
      },
    };
    const syncedPage = trackedPage({
      id: 'page-1',
      pageName: 'Updated page',
      lastSyncAt: '2026-02-01T00:00:00.000Z',
      lastSyncError: null,
    });

    const nextState = socialMediaReducer(
      stateWithPage,
      syncFacebookPage.fulfilled(syncedPage, 'req-1', 'page-1')
    );

    expect(nextState.pageSyncingIds['page-1']).toBe(false);
    expect(nextState.pages[0]).toEqual(syncedPage);
    expect(nextState.siteMappings[0]).toMatchObject({
      trackedPageName: 'Updated page',
      lastSyncAt: '2026-02-01T00:00:00.000Z',
      lastSyncError: null,
    });
  });

  it('stores snapshots by page id and clears transient feedback', () => {
    const pageSnapshots = [snapshot({ id: 'snapshot-1', pageId: 'page-1' })];
    let state = socialMediaReducer(
      undefined,
      fetchFacebookPageSnapshots.pending('req-1', { pageId: 'page-1', limit: 7 })
    );
    state = socialMediaReducer(
      state,
      fetchFacebookPageSnapshots.fulfilled(
        { pageId: 'page-1', snapshots: pageSnapshots },
        'req-1',
        { pageId: 'page-1', limit: 7 }
      )
    );
    state = socialMediaReducer(
      state,
      testFacebookSettings.fulfilled(
        {
          success: true,
          accountName: 'Community account',
          pageCount: 1,
          message: 'Connected',
        },
        'req-2',
        undefined
      )
    );

    expect(state.snapshotLoadingByPageId['page-1']).toBe(false);
    expect(state.snapshotsByPageId['page-1']).toEqual(pageSnapshots);
    expect(state.testResult?.message).toBe('Connected');

    const cleared = socialMediaReducer(
      { ...state, error: 'Old error' },
      clearSocialMediaFeedback()
    );
    expect(cleared.error).toBeNull();
    expect(cleared.testResult).toBeNull();
  });
});
