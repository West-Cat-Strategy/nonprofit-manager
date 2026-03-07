import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type * as WebsitesStateModule from '../../state';
import WebsitesListPage from '../WebsitesListPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn(() => Promise.resolve());

const mockState = {
  websites: {
    sites: [
      {
        id: 'site-1',
        templateId: 'template-1',
        templateName: 'Community Template',
        templateStatus: 'published',
        organizationId: 'org-1',
        organizationName: 'Neighborhood Mutual Aid',
        siteKind: 'organization',
        migrationStatus: 'complete',
        name: 'Neighborhood Mutual Aid',
        status: 'published',
        subdomain: 'mutual-aid',
        customDomain: 'mutualaid.org',
        sslEnabled: true,
        sslCertificateExpiresAt: '2026-12-31T00:00:00.000Z',
        publishedVersion: 'v4',
        publishedAt: '2026-03-05T12:00:00.000Z',
        primaryUrl: 'https://mutualaid.org',
        previewUrl: 'https://preview.mutualaid.org',
        analyticsEnabled: true,
        blocked: false,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-05T12:00:00.000Z',
      },
    ],
    pagination: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
    searchParams: {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    },
    overview: null,
    forms: [],
    integrations: null,
    analytics: null,
    entries: [],
    deployment: null,
    currentSiteId: null,
    isLoading: false,
    isSaving: false,
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof WebsitesStateModule>('../../state');
  return {
    ...actual,
    fetchWebsiteSites: () => ({ type: 'websites/fetchSites' }),
    setWebsiteSearchParams: (payload: unknown) => ({
      type: 'websites/setSearchParams',
      payload,
    }),
    clearWebsitesError: () => ({ type: 'websites/clearError' }),
  };
});

describe('WebsitesListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads the site list and renders console entry points for existing sites', async () => {
    renderWithProviders(<WebsitesListPage />, { route: '/websites' });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'websites/fetchSites' })
      );
    });

    expect(
      screen.getByRole('heading', { name: 'Neighborhood Mutual Aid', level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText('Community Template')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Console' })).toHaveAttribute(
      'href',
      '/websites/site-1/overview'
    );
    expect(screen.getByRole('link', { name: 'Open Builder' })).toHaveAttribute(
      'href',
      '/websites/site-1/builder'
    );
    expect(screen.getByRole('link', { name: 'Preview' })).toHaveAttribute(
      'href',
      'https://preview.mutualaid.org'
    );
  });

  it('updates search params from the console filters', async () => {
    renderWithProviders(<WebsitesListPage />, { route: '/websites' });

    fireEvent.change(screen.getByPlaceholderText(/search websites/i), {
      target: { value: 'mutual' },
    });

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'websites/setSearchParams',
        payload: {
          search: 'mutual',
          page: 1,
        },
      })
    );
  });
});
