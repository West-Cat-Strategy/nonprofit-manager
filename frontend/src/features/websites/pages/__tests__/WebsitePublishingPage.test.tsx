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
  },
  template: {
    id: 'template-1',
  },
  deployment: {
    primaryUrl: 'https://mutualaid.org',
    sslStatus: 'active',
  },
  liveRoutes: [
    { pageId: 'page-1', pageName: 'Home', path: '/' },
    { pageId: 'page-2', pageName: 'Events', path: '/events' },
  ],
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

    fireEvent.click(screen.getByRole('button', { name: 'Publish latest template' }));
    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'websites/publishSite',
          payload: {
            siteId: 'site-1',
            templateId: 'template-1',
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

    expect(screen.getByText('Loading publishing status...')).toBeInTheDocument();
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
    expect(
      screen.getByText(/Publishing data is unavailable right now/i)
    ).toBeInTheDocument();
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
