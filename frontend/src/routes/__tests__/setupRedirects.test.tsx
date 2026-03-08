import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import AppRoutes from '../index';
import { createTestStore, renderWithProviders } from '../../test/testUtils';
import { useSetupCheck } from '../../hooks/useSetupCheck';
import { preloadAuthenticatedShellBootstrap } from '../../services/bootstrap/authenticatedShellBootstrap';

vi.mock('../../hooks/useSetupCheck', () => ({
  useSetupCheck: vi.fn(),
}));

vi.mock('../../services/bootstrap/authenticatedShellBootstrap', () => ({
  preloadAuthenticatedShellBootstrap: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { registrationEnabled: true } }),
    post: vi.fn(),
  },
}));

vi.mock('../../contexts/BrandingContext', () => ({
  useBranding: () => ({
    branding: {
      appName: 'Nonprofit Manager',
      appIcon: null,
      favicon: null,
      logoUrl: null,
      colorScheme: 'default',
      customColors: {},
    },
  }),
}));

vi.mock('../../hooks/useNavigationPreferences', () => ({
  useNavigationPreferences: () => ({
    pinnedItems: [],
    primaryItems: [],
    secondaryItems: [],
    enabledItems: [],
    togglePinned: vi.fn(),
    allItems: [],
    toggleItem: vi.fn(),
    resetToDefaults: vi.fn(),
    reorderItems: vi.fn(),
    moveItemUp: vi.fn(),
    moveItemDown: vi.fn(),
    isLoading: false,
    isSynced: true,
    isSaving: false,
    syncStatus: 'synced',
    maxPinnedItems: 3,
  }),
}));

const mockUseSetupCheck = vi.mocked(useSetupCheck);
const mockPreloadAuthenticatedShellBootstrap = vi.mocked(preloadAuthenticatedShellBootstrap);

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderAppRoutes = (
  route: string,
  authOverride: Partial<{
    user: { id: string; email: string; firstName: string; lastName: string; role: string };
    isAuthenticated: boolean;
    authLoading: boolean;
    loading: boolean;
  }> = {}
) => {
  const store = createTestStore({
    auth: {
      user: null,
      isAuthenticated: false,
      authLoading: false,
      loading: false,
      ...authOverride,
    },
  });

  renderWithProviders(
    <Suspense fallback={<div>Loading...</div>}>
      <>
        <AppRoutes />
        <LocationProbe />
      </>
    </Suspense>,
    { store, route }
  );
};

describe('AppRoutes setup startup redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreloadAuthenticatedShellBootstrap.mockResolvedValue({
      preferences: null,
      branding: {
        appName: 'Nonprofit Manager',
        appIcon: null,
        favicon: null,
        logoUrl: null,
        colorScheme: 'default',
        customColors: {},
      },
    });
    mockUseSetupCheck.mockReturnValue({
      setupRequired: null,
      loading: false,
      error: 'setup status unavailable',
      refreshSetupStatus: vi.fn(),
    });
  });

  it('does not force /setup to /login while setup status is unresolved', async () => {
    renderAppRoutes('/setup');

    expect(
      await screen.findByRole('heading', { name: /build your nonprofit workspace in minutes/i })
    ).toBeInTheDocument();
    expect(
      mockUseSetupCheck.mock.calls.some((call) => call[0]?.enabled === true)
    ).toBe(true);
  });

  it('redirects /setup to /login when setup is resolved as complete', async () => {
    mockUseSetupCheck.mockReturnValue({
      setupRequired: false,
      loading: false,
      error: null,
      refreshSetupStatus: vi.fn(),
    });

    renderAppRoutes('/setup');

    expect(
      await screen.findByRole('heading', { name: /welcome back to nonprofit manager/i })
    ).toBeInTheDocument();
  });

  it('redirects /login to /setup when setup is required', async () => {
    mockUseSetupCheck.mockReturnValue({
      setupRequired: true,
      loading: false,
      error: null,
      refreshSetupStatus: vi.fn(),
    });

    renderAppRoutes('/login');

    expect(
      await screen.findByRole('heading', { name: /build your nonprofit workspace in minutes/i })
    ).toBeInTheDocument();
    expect(
      mockUseSetupCheck.mock.calls.some((call) => call[0]?.enabled === true)
    ).toBe(true);
  });

  it('keeps /login usable when setup status fetch failed', async () => {
    renderAppRoutes('/login');

    expect(
      await screen.findByRole('heading', { name: /welcome back to nonprofit manager/i })
    ).toBeInTheDocument();
  });

  it('disables setup check on portal public routes', async () => {
    renderAppRoutes('/portal/login');

    expect(
      await screen.findByRole('heading', { name: /client portal login/i })
    ).toBeInTheDocument();
    expect(
      mockUseSetupCheck.mock.calls.some((call) => call[0]?.enabled === false)
    ).toBe(true);
  });

  it('sends unauthenticated legacy settings aliases through the destination auth guard', async () => {
    renderAppRoutes('/email-marketing', {
      authLoading: false,
      isAuthenticated: false,
    });

    expect(await screen.findByTestId('location')).toHaveTextContent('/login');
  });

  it.each([
    ['/email-marketing', '/settings/email-marketing'],
    ['/settings/organization', '/settings/admin/organization'],
    ['/admin/audit-logs', '/settings/admin/audit_logs'],
  ])('redirects authenticated legacy route %s to %s', async (route, expectedLocation) => {
    renderAppRoutes(route, {
      user: {
        id: 'user-1',
        email: 'cached@example.com',
        firstName: 'Cached',
        lastName: 'User',
        role: 'admin',
      },
      isAuthenticated: true,
      authLoading: false,
    });

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(expectedLocation);
    });
  });
});
