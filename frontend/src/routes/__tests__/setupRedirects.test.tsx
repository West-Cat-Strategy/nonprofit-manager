import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import AppRoutes from '../index';
import { createTestStore, renderWithProviders } from '../../test/testUtils';
import { useSetupCheck } from '../../hooks/useSetupCheck';

vi.mock('../../hooks/useSetupCheck', () => ({
  useSetupCheck: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { registrationEnabled: true } }),
    post: vi.fn(),
  },
}));

const mockUseSetupCheck = vi.mocked(useSetupCheck);

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

  it.each([
    '/email-marketing',
    '/admin/audit-logs',
    '/settings/organization',
  ])('redirects removed legacy route %s to login before auth init completes', async (route) => {
    renderAppRoutes(route, { authLoading: true });

    expect(await screen.findByTestId('location')).toHaveTextContent('/login');
  });

  it('redirects removed legacy routes to dashboard when a cached user is present', async () => {
    renderAppRoutes('/email-marketing', {
      user: {
        id: 'user-1',
        email: 'cached@example.com',
        firstName: 'Cached',
        lastName: 'User',
        role: 'admin',
      },
      authLoading: true,
    });

    expect(await screen.findByTestId('location')).toHaveTextContent('/dashboard');
  });
});
