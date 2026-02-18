import type { ReactElement } from 'react';
import { vi } from 'vitest';
import Login from '../auth/Login';
import Register from '../auth/Register';
import Setup from '../auth/Setup';
import ForgotPassword from '../auth/ForgotPassword';
import PortalLogin from '../PortalLogin';
import PortalSignup from '../PortalSignup';
import NavigationSettings from '../admin/NavigationSettings';
import ApiSettings from '../admin/ApiSettings';
import api from '../../services/api';
import { assertRouteUxContract, createConsoleErrorSpy } from '../../test/uxRouteContract';

vi.mock('../../services/api');

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
};

type SmokeCase = {
  name: string;
  route: string;
  page: ReactElement;
  heading: string | RegExp;
  primaryActionPattern: RegExp;
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
    }
  );
});
