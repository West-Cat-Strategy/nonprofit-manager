import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type * as WebsitesStateModule from '../../state';
import WebsitePublishingPage from '../WebsitePublishingPage';

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
    clearWebsitesError: vi.fn(() => ({ type: 'websites/clearError' })),
    fetchWebsiteDeployment: vi.fn((payload?: unknown) => ({
      type: 'websites/fetchDeployment',
      payload,
    })),
    fetchWebsiteOverview: vi.fn((payload?: unknown) => ({
      type: 'websites/fetchOverview',
      payload,
    })),
    updateWebsiteSite: createAction('websites/updateSite'),
    publishWebsiteSite: createAction('websites/publishSite'),
    unpublishWebsiteSite: createAction('websites/unpublishSite'),
    invalidateWebsiteCache: createAction('websites/invalidateCache'),
  };
});

const overview = {
  site: {
    id: 'site-1',
    templateId: 'template-1',
    name: 'Neighborhood Mutual Aid',
    status: 'published',
    blocked: false,
    subdomain: 'mutual-aid',
    customDomain: 'mutualaid.org',
    primaryUrl: 'https://mutualaid.org',
    previewUrl: 'https://preview.mutualaid.org?preview=true&version=v-preview-1',
    publishedVersion: 'v-live-1',
    updatedAt: '2026-03-06T12:00:00.000Z',
  },
  template: {
    id: 'template-1',
  },
  deployment: {
    primaryUrl: 'https://mutualaid.org',
    previewUrl: 'https://preview.mutualaid.org?preview=true&version=v-preview-1',
    domainStatus: 'configured',
    sslStatus: 'active',
  },
  liveRoutes: [
    { pageId: 'page-1', pageName: 'Home', path: '/' },
    { pageId: 'page-2', pageName: 'Events', path: '/events' },
  ],
  forms: [
    {
      formKey: 'contact-form-1',
      componentId: 'contact-form-1',
      formType: 'contact-form',
      title: 'Contact form',
      pageId: 'page-1',
      pageName: 'Home',
      pageSlug: 'home',
      pageType: 'static',
      routePattern: '/',
      path: '/',
      live: true,
      blocked: false,
      sourceConfig: {},
      operationalSettings: {
        submitText: 'Get support',
      },
      publicRuntime: {
        siteKey: 'site-1',
        publicPath: '/',
        publicUrl: 'https://mutualaid.org',
        previewUrl: 'https://preview.mutualaid.org?preview=true&version=v-preview-1',
        submissionPath: '/api/v2/public/forms/site-1/contact-form-1/submit',
      },
    },
  ],
  integrations: {
    blocked: false,
    publishStatus: 'published',
    newsletter: {
      provider: 'mautic',
      configured: true,
      selectedAudienceId: null,
      selectedAudienceName: null,
      selectedPresetId: null,
      listPresets: [],
      availableAudiences: [],
      audienceCount: 0,
      lastRefreshedAt: null,
      lastSyncAt: null,
    },
    mailchimp: {
      configured: false,
      availableAudiences: [],
      lastSyncAt: null,
    },
    mautic: {
      configured: false,
      availableAudiences: [],
      lastSyncAt: null,
    },
    stripe: {
      configured: false,
      publishableKeyConfigured: false,
    },
    social: {
      facebook: {
        lastSyncAt: null,
        lastSyncError: null,
      },
    },
  },
};

type MockOverview = typeof overview;

const mockState = {
  websites: {
    deployment: {
      siteId: 'site-1',
      primaryUrl: 'https://mutualaid.org',
      status: 'published',
    },
    isLoading: false,
    isSaving: false,
    error: null,
  },
};

type MockSelectorState = typeof mockState;

let mockOverview: MockOverview | null;
let selectorState: MockSelectorState;

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(selectorState),
}));

vi.mock('../../hooks/useWebsiteOverviewLoader', () => ({
  __esModule: true,
  default: () => mockOverview,
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof WebsitesStateModule>('../../state');
  return {
    ...actual,
    clearWebsitesError: thunkMocks.clearWebsitesError,
    fetchWebsiteDeployment: thunkMocks.fetchWebsiteDeployment,
    fetchWebsiteOverview: thunkMocks.fetchWebsiteOverview,
    updateWebsiteSite: thunkMocks.updateWebsiteSite,
    publishWebsiteSite: thunkMocks.publishWebsiteSite,
    unpublishWebsiteSite: thunkMocks.unpublishWebsiteSite,
    invalidateWebsiteCache: thunkMocks.invalidateWebsiteCache,
  };
});

describe('WebsitePublishingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOverview = overview;
    selectorState = mockState;
    dispatchMock.mockImplementation(
      (action: { type?: string }) => Promise.resolve({ type: `${action.type}/fulfilled`, payload: action })
    );
  });

  it('loads deployment status and dispatches publish controls', async () => {
    renderPage();

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchDeployment', payload: 'site-1' })
      );
    });

    expect(screen.getByText('Managed form publish verification')).toBeInTheDocument();
    expect(screen.getByText('/api/v2/public/forms/site-1/contact-form-1/submit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open live page' })).toHaveAttribute(
      'href',
      'https://mutualaid.org'
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Site name'), {
      target: { value: 'Updated Site Name' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save site settings' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/updateSite',
          payload: {
            siteId: 'site-1',
            data: {
              name: 'Updated Site Name',
              subdomain: 'mutual-aid',
              customDomain: 'mutualaid.org',
            },
          },
        })
      );
    });
    expect(screen.getByText('Site settings saved.')).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: 'Publish target' })).toHaveValue('live');

    fireEvent.click(screen.getByRole('button', { name: 'Publish live' }));
    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/publishSite',
          payload: {
            siteId: 'site-1',
            templateId: 'template-1',
            target: 'live',
          },
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh cache' }));
    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/invalidateCache',
          payload: 'site-1',
        })
      );
    });
    expect(screen.getByText('Live site cache refreshed.')).toBeInTheDocument();
  });

  it('can publish a preview deployment and surface the preview message', async () => {
    selectorState = {
      ...mockState,
      websites: {
        ...mockState.websites,
        lastPublishResult: {
          target: 'preview',
          version: 'v-preview-1',
          previewUrl: 'https://preview.mutualaid.org?preview=true&version=v-preview-1',
        },
      },
    };
    dispatchMock.mockImplementation((action: { type?: string }) => {
      if (action.type === 'websites/publishSite') {
        return Promise.resolve({
          type: `${action.type}/fulfilled`,
          payload: {
            target: 'preview',
            version: 'v-preview-1',
            previewUrl: 'https://preview.mutualaid.org?preview=true&version=v-preview-1',
          },
        });
      }

      return Promise.resolve({
        type: `${action.type}/fulfilled`,
        payload: action,
      });
    });

    renderPage();

    fireEvent.change(screen.getByRole('combobox', { name: 'Publish target' }), {
      target: { value: 'preview' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish preview' }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/publishSite',
          payload: {
            siteId: 'site-1',
            templateId: 'template-1',
            target: 'preview',
          },
        })
      );
    });

    expect(
      screen.getByText(/Preview published\. Use https:\/\/preview\.mutualaid\.org/i)
    ).toBeInTheDocument();

    const previewLink = screen.getByRole('link', { name: 'Open preview link' });
    expect(previewLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders loading state instead of a blank page while overview is unresolved', () => {
    mockOverview = null;
    selectorState = {
      websites: {
        ...mockState.websites,
        deployment: null,
        isLoading: true,
      },
    };

    renderPage();

    expect(screen.getByText('Loading publishing status')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Website console' })).toBeInTheDocument();
  });

  it('renders error state without overview data', () => {
    mockOverview = null;
    selectorState = {
      websites: {
        ...mockState.websites,
        error: 'Publishing lookup failed.',
      },
    };

    renderPage();

    expect(screen.getByText('Publishing lookup failed.')).toBeInTheDocument();
    expect(screen.getByText('Publishing data is unavailable')).toBeInTheDocument();
  });

  it('disables the live-site action when no public URL is available', () => {
    mockOverview = {
      ...overview,
      deployment: {
        primaryUrl: '',
        previewUrl: null,
        domainStatus: 'none',
        sslStatus: 'unconfigured',
      },
    };

    renderPage();

    expect(screen.getByRole('button', { name: 'Open public website' })).toBeDisabled();
  });

  it('surfaces placeholder public-site destinations as unconfigured', () => {
    mockOverview = {
      ...overview,
      site: {
        ...overview.site,
        primaryUrl: 'https://mutual-aid.sites.example.org',
      },
      deployment: {
        primaryUrl: 'https://mutual-aid.sites.example.org',
        previewUrl: 'https://mutual-aid.sites.example.org?preview=true&version=v1',
        domainStatus: 'configured',
        sslStatus: 'active',
      },
    };

    renderPage();

    expect(screen.getByText('Public-site destination needs configuration')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open public website' })).toBeDisabled();
  });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/websites/site-1/publishing']}>
      <Routes>
        <Route path="/websites/:siteId/publishing" element={<WebsitePublishingPage />} />
      </Routes>
    </MemoryRouter>
  );
}
