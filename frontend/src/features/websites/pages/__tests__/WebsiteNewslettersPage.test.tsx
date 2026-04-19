import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type * as WebsitesStateModule from '../../state';
import WebsiteNewslettersPage from '../WebsiteNewslettersPage';

const dispatchMock = vi.fn();

const thunkMocks = vi.hoisted(() => {
  const createAction = (type: string) =>
    Object.assign((payload?: unknown) => ({ type, payload }), {
      fulfilled: {
        match: (action: { type?: string }) => action?.type === `${type}/fulfilled`,
      },
    });

  return {
    clearWebsitesError: vi.fn(() => ({ type: 'websites/clearError' })),
    fetchWebsiteNewsletterWorkspace: vi.fn((payload?: unknown) => ({
      type: 'websites/fetchNewsletterWorkspace',
      payload,
    })),
    fetchWebsiteOverview: vi.fn((payload?: unknown) => ({
      type: 'websites/fetchOverview',
      payload,
    })),
    refreshWebsiteNewsletterWorkspace: createAction('websites/refreshNewsletterWorkspace'),
    createWebsiteNewsletterListPreset: createAction('websites/createNewsletterListPreset'),
    updateWebsiteNewsletterListPreset: createAction('websites/updateNewsletterListPreset'),
    deleteWebsiteNewsletterListPreset: createAction('websites/deleteNewsletterListPreset'),
    updateWebsiteNewsletterIntegration: createAction('websites/updateNewsletterIntegration'),
  };
});

const overview = {
  site: {
    id: 'site-1',
    name: 'Neighborhood Mutual Aid',
    status: 'published',
    blocked: false,
  },
  deployment: {
    primaryUrl: 'https://example.org',
    previewUrl: 'https://preview.example.org',
    domainStatus: 'configured',
    sslStatus: 'active',
  },
};

const currentState = {
  websites: {
    overview: null,
    currentSiteData: {
      siteId: 'site-1',
      forms: [],
      integrations: {
        blocked: false,
        publishStatus: 'published',
        newsletter: {
          provider: 'mautic',
          configured: true,
          selectedAudienceId: 'seg-1',
          selectedAudienceName: 'Supporters',
          selectedPresetId: 'preset-1',
          availableAudiences: [
            { id: 'seg-1', name: 'Supporters', memberCount: 42 },
            { id: 'seg-2', name: 'Monthly Donors', memberCount: 12 },
          ],
          listPresets: [
            {
              id: 'preset-1',
              name: 'Supporters',
              provider: 'mautic',
              audienceId: 'seg-1',
              audienceName: 'Supporters',
              notes: 'Primary supporters',
              defaultTags: ['newsletter'],
              syncEnabled: true,
            },
          ],
          lastRefreshedAt: '2026-04-01T00:00:00.000Z',
        },
        mailchimp: {
          audienceId: 'aud-1',
          configured: false,
          availableAudiences: [],
          lastSyncAt: null,
        },
        mautic: {
          baseUrl: 'https://mautic.example.org',
          segmentId: 'seg-1',
          username: 'api-user',
          password: 'api-pass',
          defaultTags: ['supporters'],
          syncEnabled: true,
          configured: true,
          availableAudiences: [
            { id: 'seg-1', name: 'Supporters', memberCount: 42 },
            { id: 'seg-2', name: 'Monthly Donors', memberCount: 12 },
          ],
          lastSyncAt: null,
        },
        stripe: {
          configured: true,
          publishableKeyConfigured: true,
        },
      },
      analytics: null,
    },
    isLoading: false,
    isSaving: false,
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof currentState) => unknown) => selector(currentState),
}));

vi.mock('../../hooks/useWebsiteOverviewLoader', () => ({
  __esModule: true,
  default: () => overview,
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof WebsitesStateModule>('../../state');
  return {
    ...actual,
    clearWebsitesError: thunkMocks.clearWebsitesError,
    fetchWebsiteNewsletterWorkspace: thunkMocks.fetchWebsiteNewsletterWorkspace,
    fetchWebsiteOverview: thunkMocks.fetchWebsiteOverview,
    refreshWebsiteNewsletterWorkspace: thunkMocks.refreshWebsiteNewsletterWorkspace,
    createWebsiteNewsletterListPreset: thunkMocks.createWebsiteNewsletterListPreset,
    updateWebsiteNewsletterListPreset: thunkMocks.updateWebsiteNewsletterListPreset,
    deleteWebsiteNewsletterListPreset: thunkMocks.deleteWebsiteNewsletterListPreset,
    updateWebsiteNewsletterIntegration: thunkMocks.updateWebsiteNewsletterIntegration,
  };
});

describe('WebsiteNewslettersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchMock.mockImplementation((action: { type?: string }) =>
      Promise.resolve({ type: `${action.type}/fulfilled`, payload: action })
    );
  });

  it('renders the newsletters workspace and links to the communications hub', async () => {
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/fetchNewsletterWorkspace',
          payload: 'site-1',
        })
      );
    });

    expect(screen.getByRole('link', { name: 'Newsletters' })).toHaveAttribute(
      'href',
      '/websites/site-1/newsletters'
    );
    expect(screen.getByRole('link', { name: /open communications hub/i })).toHaveAttribute(
      'href',
      '/settings/communications'
    );
    expect(
      screen.getByText(/choose the active newsletter audience, manage reusable list presets/i)
    ).toBeInTheDocument();
  });

  it('saves and refreshes the workspace without redundant follow-up fetches', async () => {
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/fetchNewsletterWorkspace',
          payload: 'site-1',
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save active audience' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateNewsletterIntegration',
          payload: {
            siteId: 'site-1',
            data: {
              provider: 'mautic',
              selectedAudienceId: 'seg-1',
              selectedAudienceName: 'Supporters',
              selectedPresetId: 'preset-1',
            },
          },
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh audiences' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/refreshNewsletterWorkspace',
          payload: 'site-1',
        })
      );
    });

    expect(thunkMocks.fetchWebsiteNewsletterWorkspace).toHaveBeenCalledTimes(1);
    expect(thunkMocks.fetchWebsiteOverview).not.toHaveBeenCalled();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/websites/site-1/newsletters']}>
      <Routes>
        <Route path="/websites/:siteId/newsletters" element={<WebsiteNewslettersPage />} />
      </Routes>
    </MemoryRouter>
  );
}
