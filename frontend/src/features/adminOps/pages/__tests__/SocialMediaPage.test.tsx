import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type * as SocialMediaStateModule from '../../../socialMedia/state';
import SocialMediaPage from '../SocialMediaPage';

const dispatchMock = vi.fn();

const thunkMocks = vi.hoisted(() => {
  const createAction = (type: string) =>
    Object.assign(
      (payload?: unknown) => ({ type, payload }),
      {
        fulfilled: {
          match: (action: { type?: string }) => action?.type === `${type}/fulfilled`,
        },
      }
    );

  return {
    fetchFacebookSettings: vi.fn(() => ({ type: 'socialMedia/fetchFacebookSettings' })),
    fetchFacebookPages: vi.fn(() => ({ type: 'socialMedia/fetchFacebookPages' })),
    fetchSocialMediaSiteMappings: vi.fn(() => ({ type: 'socialMedia/fetchSiteMappings' })),
    fetchFacebookPageSnapshots: vi.fn((payload?: unknown) => ({
      type: 'socialMedia/fetchFacebookPageSnapshots',
      payload,
    })),
    updateFacebookSettings: createAction('socialMedia/updateFacebookSettings'),
    updateWebsiteFacebookMapping: createAction('socialMedia/updateWebsiteFacebookMapping'),
    discoverFacebookPages: createAction('socialMedia/discoverFacebookPages'),
    syncFacebookPage: createAction('socialMedia/syncFacebookPage'),
    testFacebookSettings: createAction('socialMedia/testFacebookSettings'),
  };
});

const mockState = {
  auth: {
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    },
  },
  socialMedia: {
    settings: {
      id: 'settings-1',
      organizationId: 'org-1',
      platform: 'facebook',
      appId: 'fb-app',
      isConfigured: true,
      credentials: {
        accessToken: true,
        appSecret: true,
      },
      lastTestedAt: '2026-03-15T10:00:00.000Z',
      lastTestSuccess: true,
      lastSyncAt: '2026-03-15T09:00:00.000Z',
      lastSyncError: null,
      createdAt: '2026-03-14T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z',
    },
    pages: [
      {
        id: 'page-1',
        organizationId: 'org-1',
        platform: 'facebook',
        externalPageId: 'fb-page-1',
        pageName: 'River District Volunteers',
        syncEnabled: true,
        lastSyncAt: '2026-03-15T09:00:00.000Z',
        lastSyncError: null,
        linkedSiteIds: ['site-1'],
        latestSnapshot: {
          id: 'snapshot-1',
          organizationId: 'org-1',
          pageId: 'page-1',
          platform: 'facebook',
          snapshotDate: '2026-03-15',
          followers: 321,
          reach: 654,
          impressions: 987,
          engagedUsers: 42,
          postCount: 11,
          rawPayload: {},
          createdAt: '2026-03-15T00:00:00.000Z',
          updatedAt: '2026-03-15T00:00:00.000Z',
        },
        createdAt: '2026-03-14T00:00:00.000Z',
        updatedAt: '2026-03-15T00:00:00.000Z',
      },
      {
        id: 'page-2',
        organizationId: 'org-1',
        platform: 'facebook',
        externalPageId: 'fb-page-2',
        pageName: 'Harbour Campaign',
        syncEnabled: true,
        lastSyncAt: null,
        lastSyncError: null,
        linkedSiteIds: [],
        latestSnapshot: null,
        createdAt: '2026-03-14T00:00:00.000Z',
        updatedAt: '2026-03-15T00:00:00.000Z',
      },
    ],
    siteMappings: [
      {
        siteId: 'site-1',
        siteName: 'Community Network',
        primaryUrl: 'https://community.example.org',
        publishStatus: 'published',
        blocked: false,
        trackedPageId: 'page-1',
        trackedPageName: 'River District Volunteers',
        syncEnabled: true,
        lastSyncAt: '2026-03-15T09:00:00.000Z',
        lastSyncError: null,
      },
    ],
    snapshotsByPageId: {
      'page-1': [
        {
          id: 'snapshot-1',
          organizationId: 'org-1',
          pageId: 'page-1',
          platform: 'facebook',
          snapshotDate: '2026-03-15',
          followers: 321,
          reach: 654,
          impressions: 987,
          engagedUsers: 42,
          postCount: 11,
          rawPayload: {},
          createdAt: '2026-03-15T00:00:00.000Z',
          updatedAt: '2026-03-15T00:00:00.000Z',
        },
      ],
    },
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
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../components/AdminPanelLayout', () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('../../components/AdminPanelNav', () => ({
  __esModule: true,
  default: () => <nav>Admin Nav</nav>,
}));

vi.mock('../../../socialMedia/state', async () => {
  const actual = await vi.importActual<typeof SocialMediaStateModule>('../../../socialMedia/state');
  return {
    ...actual,
    fetchFacebookSettings: thunkMocks.fetchFacebookSettings,
    fetchFacebookPages: thunkMocks.fetchFacebookPages,
    fetchSocialMediaSiteMappings: thunkMocks.fetchSocialMediaSiteMappings,
    fetchFacebookPageSnapshots: thunkMocks.fetchFacebookPageSnapshots,
    updateFacebookSettings: thunkMocks.updateFacebookSettings,
    updateWebsiteFacebookMapping: thunkMocks.updateWebsiteFacebookMapping,
    discoverFacebookPages: thunkMocks.discoverFacebookPages,
    syncFacebookPage: thunkMocks.syncFacebookPage,
    testFacebookSettings: thunkMocks.testFacebookSettings,
  };
});

describe('SocialMediaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchMock.mockImplementation((action: { type?: string; payload?: unknown }) =>
      Promise.resolve({ type: `${action.type}/fulfilled`, payload: action.payload })
    );
  });

  it('loads social media data and saves credential + mapping changes', async () => {
    render(
      <MemoryRouter initialEntries={['/settings/social-media']}>
        <SocialMediaPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'socialMedia/fetchFacebookSettings' })
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'socialMedia/fetchFacebookPages' })
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'socialMedia/fetchSiteMappings' })
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'socialMedia/fetchFacebookPageSnapshots',
          payload: { pageId: 'page-1', limit: 30 },
        })
      );
    });

    fireEvent.change(screen.getByLabelText('Facebook App ID'), {
      target: { value: 'fb-app-updated' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Credentials' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'socialMedia/updateFacebookSettings',
          payload: {
            data: {
              appId: 'fb-app-updated',
            },
          },
        })
      );
    });

    fireEvent.change(screen.getByLabelText('Facebook page for Community Network'), {
      target: { value: 'page-2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Mapping' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'socialMedia/updateWebsiteFacebookMapping',
          payload: {
            siteId: 'site-1',
            data: {
              trackedPageId: 'page-2',
              syncEnabled: true,
            },
          },
        })
      );
    });
  });
});
