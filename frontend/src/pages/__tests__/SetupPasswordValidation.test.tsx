import { fireEvent, screen, waitFor } from '@testing-library/react';
import type * as ReactRouterDom from 'react-router-dom';
import { vi } from 'vitest';
import Setup from '../../features/auth/pages/SetupPage';
import api from '../../services/api';
import { getStaffBootstrapSnapshot } from '../../services/bootstrap/staffBootstrap';
import { primeStaffSession } from '../../features/auth/utils/primeStaffSession';
import { createTestStore, renderWithProviders } from '../../test/testUtils';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../../services/bootstrap/staffBootstrap', () => ({
  getStaffBootstrapSnapshot: vi.fn(),
}));

vi.mock('../../features/auth/utils/primeStaffSession', () => ({
  primeStaffSession: vi.fn(async ({ user, organizationId }) => ({
    user,
    organizationId: organizationId ?? null,
  })),
}));

const renderSetup = () => {
  const store = createTestStore();
  renderWithProviders(<Setup />, { store });
  return store;
};

const fillSetupForm = async (password: string) => {
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Setup' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Admin' } });
  fireEvent.change(screen.getByLabelText(/organization name/i), {
    target: { value: 'Community Aid Network' },
  });
  fireEvent.change(screen.getByLabelText(/email address/i), {
    target: { value: 'setup@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /create admin account/i }));
};

const mockSuccessfulSetupRequest = (options?: { includeSetupUser?: boolean }) => {
  const postMock = api.post as ReturnType<typeof vi.fn>;
  const bootstrapMock = vi.mocked(getStaffBootstrapSnapshot);

  postMock.mockResolvedValue({
    data: {
      success: true,
      data: {
        organizationId: 'org-1',
        ...(options?.includeSetupUser
          ? {
              user: {
                user_id: 'setup-user-1',
                email: 'setup@example.com',
                firstName: 'Setup',
                lastName: 'Admin',
                role: 'admin',
              },
            }
          : {}),
      },
    },
  });

  if (!options?.includeSetupUser) {
    bootstrapMock.mockResolvedValue({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'setup@example.com',
        firstName: 'Setup',
        lastName: 'Admin',
        role: 'admin',
      },
      organizationId: 'org-1',
      branding: null,
      preferences: null,
      workspaceModules: {
        contacts: true,
        accounts: true,
        volunteers: true,
        events: true,
        tasks: true,
        cases: true,
        followUps: true,
        opportunities: true,
        externalServiceProviders: true,
        teamChat: true,
        donations: true,
        recurringDonations: true,
        reconciliation: true,
        analytics: true,
        reports: true,
        scheduledReports: true,
        alerts: true,
      },
      fetchedAt: Date.now(),
    });
  }
};

describe('Setup password validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(getStaffBootstrapSnapshot).mockResolvedValue({
      status: 'anonymous',
      user: null,
      organizationId: null,
      branding: null,
      preferences: null,
      workspaceModules: {
        contacts: true,
        accounts: true,
        volunteers: true,
        events: true,
        tasks: true,
        cases: true,
        followUps: true,
        opportunities: true,
        externalServiceProviders: true,
        teamChat: true,
        donations: true,
        recurringDonations: true,
        reconciliation: true,
        analytics: true,
        reports: true,
        scheduledReports: true,
        alerts: true,
      },
      fetchedAt: Date.now(),
    });
  });

  it(
    'submits when password includes non-whitelisted special characters',
    async () => {
    mockSuccessfulSetupRequest();
    renderSetup();

    await fillSetupForm('Strong1#Password');

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/setup', expect.objectContaining({
        password: 'Strong1#Password',
        passwordConfirm: 'Strong1#Password',
        firstName: 'Setup',
        lastName: 'Admin',
        organizationName: 'Community Aid Network',
      }));
      expect(primeStaffSession).toHaveBeenCalled();
    });
    },
    15000
  );

  it(
    'submits when password has no special character',
    async () => {
    mockSuccessfulSetupRequest();
    renderSetup();

    await fillSetupForm('Strong1Password');

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/setup', expect.objectContaining({
        password: 'Strong1Password',
      }));
      expect(vi.mocked(getStaffBootstrapSnapshot)).toHaveBeenCalledWith({ forceRefresh: true });
      expect(primeStaffSession).toHaveBeenCalled();
    });
    },
    15000
  );

  it(
    'hydrates auth directly from setup response user payload',
    async () => {
      mockSuccessfulSetupRequest({ includeSetupUser: true });
      renderSetup();

      await fillSetupForm('Strong1Password');

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/setup', expect.objectContaining({
          password: 'Strong1Password',
        }));
        expect(vi.mocked(getStaffBootstrapSnapshot)).not.toHaveBeenCalled();
        expect(primeStaffSession).toHaveBeenCalled();
      });
    },
    15000
  );

  it(
    'shows a clear message and routes to login when setup succeeds but bootstrap hydration fails',
    async () => {
      const postMock = api.post as ReturnType<typeof vi.fn>;
      postMock.mockResolvedValue({
        data: { success: true, data: { organizationId: 'org-1' } },
      });
      vi.mocked(getStaffBootstrapSnapshot).mockRejectedValue(new Error('session failed'));

      renderSetup();

      await fillSetupForm('Strong1Password');

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/setup', expect.any(Object));
        expect(vi.mocked(getStaffBootstrapSnapshot)).toHaveBeenCalledWith({ forceRefresh: true });
        expect(
          screen.getByText(/setup completed, but automatic sign-in failed/i)
        ).toBeInTheDocument();
        expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
      });
    },
    15000
  );
});
