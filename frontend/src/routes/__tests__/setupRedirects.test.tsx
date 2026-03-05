import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
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

const renderAppRoutes = (route: string) => {
  const store = createTestStore({
    auth: {
      user: null,
      isAuthenticated: false,
      authLoading: false,
      loading: false,
    },
  });

  renderWithProviders(
    <Suspense fallback={<div>Loading...</div>}>
      <AppRoutes />
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

  it('disables setup check on protected routes before auth redirect', async () => {
    renderAppRoutes('/dashboard');

    expect(
      await screen.findByRole('heading', { name: /welcome back to nonprofit manager/i })
    ).toBeInTheDocument();
    expect(
      mockUseSetupCheck.mock.calls.some((call) => call[0]?.enabled === false)
    ).toBe(true);
  });
});
