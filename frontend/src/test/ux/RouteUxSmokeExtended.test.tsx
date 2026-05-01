import type { ReactElement } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Login from '../../features/auth/pages/LoginPage';
import Register from '../../features/auth/pages/RegisterPage';
import Setup from '../../features/auth/pages/SetupPage';
import AcceptInvitation from '../../features/invitations/pages/AcceptInvitationPage';
import ForgotPassword from '../../features/auth/pages/ForgotPasswordPage';
import ResetPassword from '../../features/auth/pages/ResetPasswordPage';
import PortalAcceptInvitation from '../../features/invitations/pages/PortalAcceptInvitationPage';
import PortalForgotPassword from '../../features/portal/pages/PortalForgotPasswordPage';
import PortalLogin from '../../features/portal/pages/PortalLoginPage';
import PortalResetPassword from '../../features/portal/pages/PortalResetPasswordPage';
import PortalSignup from '../../features/portal/pages/PortalSignupPage';
import NavigationSettings from '../../features/adminOps/pages/NavigationSettingsPage';
import ApiSettings from '../../features/webhooks/pages/ApiSettingsPage';
import DataBackup from '../../features/adminOps/pages/DataBackupPage';
import CommunicationsPage from '../../features/mailchimp/pages/EmailMarketingPage';
import AdminSettings from '../../features/adminOps/pages/AdminSettingsPage';
import {
  getTestApiCalls,
  registerTestApiGet,
  type TestApiMatcher,
} from '../../test/setup';
import { renderWithProviders } from '../../test/testUtils';
import { assertRouteUxContract, createConsoleErrorSpy } from '../../test/uxRouteContract';

const { mockPortalApiGet, mockPortalApiPost, mockSetBranding } = vi.hoisted(() => ({
  mockPortalApiGet: vi.fn(),
  mockPortalApiPost: vi.fn(),
  mockSetBranding: vi.fn(),
}));

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
vi.mock('../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));

const apiMatchers = {
  adminBranding: '/admin/branding',
  adminOrganizationSettings: '/admin/organization-settings',
  adminPermissions: '/admin/permissions',
  adminRoles: '/admin/roles',
  authPreferences: '/auth/preferences',
  authRegistrationStatus: '/auth/registration-status',
  contacts: /^\/v2\/contacts(?:\?|$)/,
  communicationsAudiences: /^\/communications\/audiences(?:\?|$)/,
  communicationsCampaignRuns: /^\/communications\/campaign-runs(?:\?|$)/,
  communicationsCampaigns: /^\/communications\/campaigns(?:\?|$)/,
  communicationsStatus: '/communications/status',
  invitationValidate: '/invitations/validate/test-token',
  mailchimpCampaigns: '/mailchimp/campaigns',
  mailchimpLists: '/mailchimp/lists',
  resetPasswordValidate: '/auth/reset-password/test-token',
  webhooksApiKeys: '/webhooks/api-keys',
  webhooksApiKeyScopes: '/webhooks/api-keys/scopes',
  webhooksEndpoints: '/webhooks/endpoints',
  webhooksEvents: '/webhooks/events',
} satisfies Record<string, TestApiMatcher>;

const portalMatchers = {
  acceptInvitationValidate: '/portal/auth/invitations/validate/test-token-1234567890',
  resetPasswordValidate: '/portal/auth/reset-password/test-token',
} as const;

const expectGetRequest = async (matcher: TestApiMatcher) => {
  await waitFor(() => {
    expect(getTestApiCalls('get', matcher).length).toBeGreaterThan(0);
  });
};

const registerSharedApiMocks = () => {
  registerTestApiGet(apiMatchers.authRegistrationStatus, {
    data: { registrationEnabled: true },
  });
  registerTestApiGet(apiMatchers.webhooksEndpoints, { data: [] });
  registerTestApiGet(apiMatchers.webhooksEvents, { data: [] });
  registerTestApiGet(apiMatchers.webhooksApiKeys, { data: [] });
  registerTestApiGet(apiMatchers.webhooksApiKeyScopes, { data: [] });
  registerTestApiGet(apiMatchers.authPreferences, {
    data: { preferences: {} },
  });
  registerTestApiGet(apiMatchers.adminBranding, { data: {} });
  registerTestApiGet(apiMatchers.adminOrganizationSettings, {
    data: {
      config: {},
      updatedAt: null,
    },
  });
  registerTestApiGet(apiMatchers.adminPermissions, {
    data: { permissions: [] },
  });
  registerTestApiGet(apiMatchers.adminRoles, { data: { roles: [] } });
  registerTestApiGet(apiMatchers.communicationsStatus, {
    data: { configured: false, accountName: null, listCount: 0 },
  });
  registerTestApiGet(apiMatchers.communicationsAudiences, { data: [] });
  registerTestApiGet(apiMatchers.communicationsCampaigns, { data: [] });
  registerTestApiGet(apiMatchers.communicationsCampaignRuns, { data: [] });
  registerTestApiGet(apiMatchers.contacts, {
    data: {
      data: [],
      pagination: { total: 0, page: 1, limit: 100, total_pages: 0 },
    },
  });
  registerTestApiGet(apiMatchers.invitationValidate, {
    data: {
      valid: true,
      invitation: {
        email: 'invitee@example.org',
        role: 'Coordinator',
        message: null,
        invitedBy: 'Admin User',
        expiresAt: '2026-12-31T00:00:00.000Z',
      },
    },
  });
  registerTestApiGet(apiMatchers.resetPasswordValidate, {
    data: { valid: true },
  });
};

const registerPortalApiMocks = () => {
  mockPortalApiGet.mockImplementation((url: string) => {
    if (url === portalMatchers.resetPasswordValidate) {
      return Promise.resolve({ data: { valid: true } });
    }
    if (url === portalMatchers.acceptInvitationValidate) {
      return Promise.resolve({
        data: {
          invitation: {
            email: 'portal@example.org',
            contactId: 'contact-1',
            expiresAt: '2026-12-31T00:00:00.000Z',
          },
        },
      });
    }

    throw new Error(`[test portal api] Unregistered GET ${url}`);
  });

  mockPortalApiPost.mockImplementation((url: string) => {
    throw new Error(`[test portal api] Unregistered POST ${url}`);
  });
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
  contractAssertion: () => Promise<void> | void;
};

const smokeCases: SmokeCase[] = [
  {
    name: 'login',
    route: '/login',
    page: <Login />,
    heading: /welcome back to nonprofit manager/i,
    primaryActionPattern: /sign in/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.authRegistrationStatus);
      expect(await screen.findByLabelText(/email address/i)).toBeInTheDocument();
    },
  },
  {
    name: 'register',
    route: '/register',
    page: <Register />,
    heading: /get started with nonprofit manager/i,
    primaryActionPattern: /create account/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      expect(await screen.findByLabelText(/confirm password/i)).toBeInTheDocument();
    },
  },
  {
    name: 'setup',
    route: '/setup',
    page: <Setup />,
    heading: /build your nonprofit workspace in minutes/i,
    primaryActionPattern: /create admin account/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      expect(await screen.findByLabelText(/organization name/i)).toBeInTheDocument();
    },
  },
  {
    name: 'forgot-password',
    route: '/forgot-password',
    page: <ForgotPassword />,
    heading: /forgot your password/i,
    primaryActionPattern: /send reset link/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      expect(
        await screen.findByText(/enter your email address and we'll send you a link/i)
      ).toBeInTheDocument();
    },
  },
  {
    name: 'accept-invitation',
    route: '/accept-invitation/test-token',
    path: '/accept-invitation/:token',
    page: <AcceptInvitation />,
    heading: /complete your registration/i,
    primaryActionPattern: /create account/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      const emailField = await screen.findByLabelText(/email address/i);
      expect(emailField).toHaveValue('');
      expect(getTestApiCalls('get', apiMatchers.invitationValidate)).toHaveLength(0);
    },
  },
  {
    name: 'reset-password',
    route: '/reset-password/test-token',
    path: '/reset-password/:token',
    page: <ResetPassword />,
    heading: /reset your password/i,
    primaryActionPattern: /^reset password$/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.resetPasswordValidate);
      expect(await screen.findByLabelText(/new password/i)).toBeInTheDocument();
    },
  },
  {
    name: 'portal-login',
    route: '/portal/login',
    page: <PortalLogin />,
    heading: /client portal login/i,
    primaryActionPattern: /sign in/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    },
  },
  {
    name: 'portal-signup',
    route: '/portal/signup',
    page: <PortalSignup />,
    heading: /request portal access/i,
    primaryActionPattern: /submit request/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      expect(await screen.findByLabelText(/confirm password/i)).toBeInTheDocument();
    },
  },
  {
    name: 'portal-forgot-password',
    route: '/portal/forgot-password',
    page: <PortalForgotPassword />,
    heading: /reset your portal password/i,
    primaryActionPattern: /send reset link/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      expect(
        await screen.findByText(/enter the email you use to sign in to the client portal/i)
      ).toBeInTheDocument();
    },
  },
  {
    name: 'portal-reset-password',
    route: '/portal/reset-password/test-token',
    path: '/portal/reset-password/:token',
    page: <PortalResetPassword />,
    heading: /choose a new portal password/i,
    primaryActionPattern: /^reset password$/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      await waitFor(() => {
        expect(mockPortalApiGet).toHaveBeenCalledWith(portalMatchers.resetPasswordValidate);
      });
      expect(await screen.findByLabelText(/new password/i)).toBeInTheDocument();
    },
  },
  {
    name: 'portal-accept-invitation',
    route: '/portal/accept-invitation/test-token-1234567890',
    path: '/portal/accept-invitation/:token',
    page: <PortalAcceptInvitation />,
    heading: /accept portal invitation/i,
    primaryActionPattern: /activate portal account/i,
    requireMainLandmark: true,
    contractAssertion: async () => {
      await waitFor(() => {
        expect(mockPortalApiGet).toHaveBeenCalledWith(portalMatchers.acceptInvitationValidate);
      });
      expect(await screen.findByDisplayValue('portal@example.org')).toBeInTheDocument();
    },
  },
  {
    name: 'navigation-settings',
    route: '/settings/navigation',
    page: <NavigationSettings />,
    heading: /my navigation/i,
    primaryActionPattern: /reset to defaults/i,
    contractAssertion: async () => {
      expect(await screen.findByText(/staff menu order/i)).toBeInTheDocument();
    },
  },
  {
    name: 'api-settings',
    route: '/settings/api',
    page: <ApiSettings />,
    heading: /api & webhooks/i,
    primaryActionPattern: /add webhook/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.webhooksEndpoints);
      await expectGetRequest(apiMatchers.webhooksEvents);
    },
  },
  {
    name: 'admin-settings',
    route: '/settings/admin/dashboard',
    page: <AdminSettings />,
    heading: /admin hub/i,
    primaryActionPattern: /show advanced|hide advanced/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.adminOrganizationSettings);
      await expectGetRequest(apiMatchers.adminRoles);
    },
  },
  {
    name: 'data-backup',
    route: '/settings/backup',
    page: <DataBackup />,
    heading: /data backup/i,
    primaryActionPattern: /download backup/i,
    contractAssertion: async () => {
      expect(await screen.findByText(/include secrets \(full backup\)/i)).toBeInTheDocument();
    },
  },
  {
    name: 'communications',
    route: '/settings/communications',
    page: <CommunicationsPage />,
    heading: /communications/i,
    primaryActionPattern: /local email/i,
    contractAssertion: async () => {
      await expectGetRequest(apiMatchers.communicationsStatus);
      expect(
        await screen.findByRole('heading', {
          name: /communications/i,
          level: 1,
        })
      ).toBeInTheDocument();
      expect(await screen.findByText(/mailchimp optional/i)).toBeInTheDocument();
    },
  },
];

describe('Route UX smoke (auth/portal/settings)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = createConsoleErrorSpy();
    registerSharedApiMocks();
    registerPortalApiMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('loads the local-first communications workspace without legacy Mailchimp list or campaign calls', async () => {
    renderWithProviders(<CommunicationsPage />, { route: '/settings/communications' });

    await waitFor(() => {
      expect(
        screen.getByText(/mailchimp optional/i)
      ).toBeInTheDocument();
    });

    await expectGetRequest(apiMatchers.communicationsStatus);
    await expectGetRequest(apiMatchers.communicationsAudiences);
    await expectGetRequest(apiMatchers.communicationsCampaigns);
    expect(getTestApiCalls('get', apiMatchers.mailchimpLists)).toHaveLength(0);
    expect(getTestApiCalls('get', apiMatchers.mailchimpCampaigns)).toHaveLength(0);
  });

  it('loads Mailchimp list and campaign data when the integration is configured', async () => {
    registerTestApiGet(apiMatchers.communicationsStatus, {
      data: { configured: true, accountName: 'Test Org', listCount: 1 },
    });

    renderWithProviders(<CommunicationsPage />, { route: '/settings/communications' });

    await waitFor(() => {
      expect(screen.getByText(/optional provider connected/i)).toBeInTheDocument();
    });

    await expectGetRequest(apiMatchers.communicationsStatus);
    await expectGetRequest(apiMatchers.communicationsAudiences);
    await expectGetRequest(apiMatchers.communicationsCampaigns);
    expect(getTestApiCalls('get', apiMatchers.mailchimpLists)).toHaveLength(0);
    expect(getTestApiCalls('get', apiMatchers.mailchimpCampaigns)).toHaveLength(0);
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
