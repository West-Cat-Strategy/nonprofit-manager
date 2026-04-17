import type { ReactElement } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Login from '../../features/auth/pages/LoginPage';
import Register from '../../features/auth/pages/RegisterPage';
import Setup from '../../features/auth/pages/SetupPage';
import AcceptInvitation from '../../features/auth/pages/AcceptInvitationPage';
import ForgotPassword from '../../features/auth/pages/ForgotPasswordPage';
import ResetPassword from '../../features/auth/pages/ResetPasswordPage';
import PortalAcceptInvitation from '../../features/portal/pages/PortalAcceptInvitationPage';
import PortalForgotPassword from '../../features/portal/pages/PortalForgotPasswordPage';
import PortalLogin from '../../features/portal/pages/PortalLoginPage';
import PortalResetPassword from '../../features/portal/pages/PortalResetPasswordPage';
import PortalSignup from '../../features/portal/pages/PortalSignupPage';
import NavigationSettings from '../../features/adminOps/pages/NavigationSettingsPage';
import ApiSettings from '../../features/adminOps/pages/ApiSettingsPage';
import DataBackup from '../../features/adminOps/pages/DataBackupPage';
import CommunicationsPage from '../../features/adminOps/pages/EmailMarketingPage';
import AdminSettings from '../../features/adminOps/pages/AdminSettingsPage';
import api from '../../services/api';
import portalApi from '../../services/portalApi';
import { renderWithProviders } from '../../test/testUtils';
import { assertRouteUxContract, createConsoleErrorSpy } from '../../test/uxRouteContract';

const { mockPortalApiGet, mockPortalApiPost, mockSetBranding } = vi.hoisted(() => ({
  mockPortalApiGet: vi.fn(),
  mockPortalApiPost: vi.fn(),
  mockSetBranding: vi.fn(),
}));

vi.mock('../../services/api');
vi.mock('../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => mockPortalApiGet(...args),
    post: (...args: unknown[]) => mockPortalApiPost(...args),
  },
}));
vi.mock('../../contexts/BrandingContext', () => ({
  useBranding: () => ({
    branding: {
      organizationName: 'Test Org',
      logoUrl: null,
      primaryColor: '#0f172a',
      secondaryColor: '#475569',
      accentColor: '#10b981',
      faviconUrl: null,
      customDomain: null,
    },
    setBranding: mockSetBranding,
    refreshBranding: vi.fn(),
  }),
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
};

const mockPortalApi = portalApi as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

type SmokeCase = {
  name: string;
  route: string;
  path?: string;
  page: ReactElement;
  heading: string | RegExp;
  primaryActionPattern: RegExp;
  primaryActionRole?: 'button' | 'link';
  requireMainLandmark?: boolean;
};

const smokeCases: SmokeCase[] = [
  {
    name: 'login',
    route: '/login',
    page: <Login />,
    heading: /welcome back to nonprofit manager/i,
    primaryActionPattern: /sign in/i,
    requireMainLandmark: true,
  },
  {
    name: 'register',
    route: '/register',
    page: <Register />,
    heading: /get started with nonprofit manager/i,
    primaryActionPattern: /create account/i,
    requireMainLandmark: true,
  },
  {
    name: 'setup',
    route: '/setup',
    page: <Setup />,
    heading: /build your nonprofit workspace in minutes/i,
    primaryActionPattern: /create admin account/i,
    requireMainLandmark: true,
  },
  {
    name: 'forgot-password',
    route: '/forgot-password',
    page: <ForgotPassword />,
    heading: /forgot your password/i,
    primaryActionPattern: /send reset link/i,
    requireMainLandmark: true,
  },
  {
    name: 'accept-invitation',
    route: '/accept-invitation/test-token',
    path: '/accept-invitation/:token',
    page: <AcceptInvitation />,
    heading: /complete your registration/i,
    primaryActionPattern: /create account/i,
    requireMainLandmark: true,
  },
  {
    name: 'reset-password',
    route: '/reset-password/test-token',
    path: '/reset-password/:token',
    page: <ResetPassword />,
    heading: /reset your password/i,
    primaryActionPattern: /^reset password$/i,
    requireMainLandmark: true,
  },
  {
    name: 'portal-login',
    route: '/portal/login',
    page: <PortalLogin />,
    heading: /client portal login/i,
    primaryActionPattern: /sign in/i,
    requireMainLandmark: true,
  },
  {
    name: 'portal-signup',
    route: '/portal/signup',
    page: <PortalSignup />,
    heading: /request portal access/i,
    primaryActionPattern: /submit request/i,
    requireMainLandmark: true,
  },
  {
    name: 'portal-forgot-password',
    route: '/portal/forgot-password',
    page: <PortalForgotPassword />,
    heading: /reset your portal password/i,
    primaryActionPattern: /send reset link/i,
    requireMainLandmark: true,
  },
  {
    name: 'portal-reset-password',
    route: '/portal/reset-password/test-token',
    path: '/portal/reset-password/:token',
    page: <PortalResetPassword />,
    heading: /choose a new portal password/i,
    primaryActionPattern: /^reset password$/i,
    requireMainLandmark: true,
  },
  {
    name: 'portal-accept-invitation',
    route: '/portal/accept-invitation/test-token',
    path: '/portal/accept-invitation/:token',
    page: <PortalAcceptInvitation />,
    heading: /accept portal invitation/i,
    primaryActionPattern: /activate portal account/i,
    requireMainLandmark: true,
  },
  {
    name: 'navigation-settings',
    route: '/settings/navigation',
    page: <NavigationSettings />,
    heading: /^navigation$/i,
    primaryActionPattern: /reset to defaults/i,
  },
  {
    name: 'api-settings',
    route: '/settings/api',
    page: <ApiSettings />,
    heading: /api & webhooks/i,
    primaryActionPattern: /add webhook/i,
  },
  {
    name: 'admin-settings',
    route: '/settings/admin/dashboard',
    page: <AdminSettings />,
    heading: /admin hub/i,
    primaryActionPattern: /show advanced|hide advanced/i,
  },
  {
    name: 'data-backup',
    route: '/settings/backup',
    page: <DataBackup />,
    heading: /data backup/i,
    primaryActionPattern: /download backup/i,
  },
  {
    name: 'communications',
    route: '/settings/communications',
    page: <CommunicationsPage />,
    heading: /newsletter campaigns/i,
    primaryActionPattern: /admin\.mailchimp\.com\/account\/api/i,
    primaryActionRole: 'link',
  },
];

describe('Route UX smoke (auth/portal/settings)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = createConsoleErrorSpy();

    mockApi.get.mockImplementation((url: string) => {
      if (url === '/auth/registration-status') {
        return Promise.resolve({ data: { registrationEnabled: true } });
      }
      if (url === '/webhooks/endpoints') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/webhooks/events') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/webhooks/api-keys') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/webhooks/api-keys/scopes') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/auth/preferences') {
        return Promise.resolve({ data: { preferences: {} } });
      }
      if (url === '/admin/branding') {
        return Promise.resolve({ data: {} });
      }
      if (url === '/admin/roles') {
        return Promise.resolve({ data: { roles: [] } });
      }
      if (url === '/mailchimp/status') {
        return Promise.resolve({ data: { configured: false, accountName: null, listCount: 0 } });
      }
      if (url === '/mailchimp/lists') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/mailchimp/campaigns') {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/v2/contacts')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 100, total_pages: 0 },
          },
        });
      }
      if (url === '/invitations/validate/test-token') {
        return Promise.resolve({
          data: {
            valid: true,
            invitation: {
              email: 'invitee@example.org',
              role: 'Coordinator',
              message: null,
              invitedBy: 'Admin User',
              expiresAt: new Date().toISOString(),
            },
          },
        });
      }
      if (url === '/auth/reset-password/test-token') {
        return Promise.resolve({ data: { valid: true } });
      }

      return Promise.resolve({ data: {} });
    });

    mockPortalApiGet.mockImplementation((url: string) => {
      if (url === '/portal/auth/reset-password/test-token') {
        return Promise.resolve({ data: { valid: true } });
      }
      if (url === '/portal/auth/invitations/validate/test-token') {
        return Promise.resolve({
          data: {
            invitation: {
              email: 'portal@example.org',
              contactId: 'contact-1',
              expiresAt: new Date().toISOString(),
            },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });
    mockPortalApiPost.mockResolvedValue({ data: {} });
    mockPortalApi.get = mockPortalApiGet;
    mockPortalApi.post = mockPortalApiPost;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('avoids Mailchimp list and campaign requests when the communications hub is not configured', async () => {
    renderWithProviders(<CommunicationsPage />, { route: '/settings/communications' });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /newsletter provider not configured/i, level: 2 })
      ).toBeInTheDocument();
    });

    expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/status');
    expect(mockApi.get).not.toHaveBeenCalledWith('/mailchimp/lists');
    expect(mockApi.get).not.toHaveBeenCalledWith('/mailchimp/campaigns');
  });

  it('loads Mailchimp list and campaign data when the integration is configured', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/mailchimp/status') {
        return Promise.resolve({ data: { configured: true, accountName: 'Test Org', listCount: 1 } });
      }
      if (url === '/mailchimp/lists') {
        return Promise.resolve({ data: [] });
      }
      if (url === '/mailchimp/campaigns') {
        return Promise.resolve({ data: [] });
      }
      if (url.startsWith('/v2/contacts')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 100, total_pages: 0 },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    renderWithProviders(<CommunicationsPage />, { route: '/settings/communications' });

    await waitFor(() => {
      expect(screen.getByText(/connected to mailchimp/i)).toBeInTheDocument();
    });

    expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/status');
    expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/lists');
    expect(mockApi.get).toHaveBeenCalledWith('/mailchimp/campaigns');
  });

  it.each(smokeCases)(
    'renders H1 and primary action without console errors for $name route',
    async (smokeCase) => {
      await assertRouteUxContract(smokeCase);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    },
    15000
  );
});
