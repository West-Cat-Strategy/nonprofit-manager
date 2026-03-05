import type { ReactElement } from 'react';
import { vi } from 'vitest';
import Login from '../auth/Login';
import Register from '../auth/Register';
import Setup from '../auth/Setup';
import AcceptInvitation from '../auth/AcceptInvitation';
import ForgotPassword from '../auth/ForgotPassword';
import ResetPassword from '../auth/ResetPassword';
import PortalLogin from '../PortalLogin';
import PortalSignup from '../PortalSignup';
import NavigationSettings from '../admin/NavigationSettings';
import ApiSettings from '../admin/ApiSettings';
import DataBackup from '../admin/DataBackup';
import EmailMarketing from '../admin/EmailMarketing';
import AdminSettings from '../admin/AdminSettings';
import api from '../../services/api';
import { assertRouteUxContract, createConsoleErrorSpy } from '../../test/uxRouteContract';

vi.mock('../../services/api');
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
    setBranding: vi.fn(),
    refreshBranding: vi.fn(),
  }),
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
};

type SmokeCase = {
  name: string;
  route: string;
  page: ReactElement;
  heading: string | RegExp;
  primaryActionPattern: RegExp;
  primaryActionRole?: 'button' | 'link';
};

const smokeCases: SmokeCase[] = [
  {
    name: 'login',
    route: '/login',
    page: <Login />,
    heading: /welcome back to nonprofit manager/i,
    primaryActionPattern: /sign in/i,
  },
  {
    name: 'register',
    route: '/register',
    page: <Register />,
    heading: /get started with nonprofit manager/i,
    primaryActionPattern: /create account/i,
  },
  {
    name: 'setup',
    route: '/setup',
    page: <Setup />,
    heading: /build your nonprofit workspace in minutes/i,
    primaryActionPattern: /create admin account/i,
  },
  {
    name: 'forgot-password',
    route: '/forgot-password',
    page: <ForgotPassword />,
    heading: /forgot your password/i,
    primaryActionPattern: /send reset link/i,
  },
  {
    name: 'accept-invitation',
    route: '/accept-invitation/test-token',
    page: <AcceptInvitation />,
    heading: /invalid invitation/i,
    primaryActionPattern: /go to login/i,
    primaryActionRole: 'link',
  },
  {
    name: 'reset-password',
    route: '/reset-password/test-token',
    page: <ResetPassword />,
    heading: /reset your password/i,
    primaryActionPattern: /request a new reset link/i,
    primaryActionRole: 'link',
  },
  {
    name: 'portal-login',
    route: '/portal/login',
    page: <PortalLogin />,
    heading: /client portal login/i,
    primaryActionPattern: /sign in/i,
  },
  {
    name: 'portal-signup',
    route: '/portal/signup',
    page: <PortalSignup />,
    heading: /request portal access/i,
    primaryActionPattern: /submit request/i,
  },
  {
    name: 'navigation-settings',
    route: '/settings/navigation',
    page: <NavigationSettings />,
    heading: /navigation settings/i,
    primaryActionPattern: /reset to defaults/i,
  },
  {
    name: 'api-settings',
    route: '/settings/api',
    page: <ApiSettings />,
    heading: /api settings/i,
    primaryActionPattern: /add webhook/i,
  },
  {
    name: 'admin-settings',
    route: '/settings/admin',
    page: <AdminSettings />,
    heading: /admin settings/i,
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
    name: 'email-marketing',
    route: '/settings/email-marketing',
    page: <EmailMarketing />,
    heading: /email marketing/i,
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
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
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
