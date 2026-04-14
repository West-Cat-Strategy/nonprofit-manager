import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { adminRouteManifest } from '../../features/adminOps/adminRouteManifest';
import { getAdminSettingsPath } from '../../features/adminOps/adminRoutePaths';
import { createAdminRoutes } from '../adminRoutes';

vi.mock('../../features/adminOps/routeComponents', async () => {
  const { Navigate, useLocation, useParams } = await import('react-router-dom');
  const { getAdminSettingsPath, parseAdminSettingsSection } =
    await import('../../features/adminOps/adminRoutePaths');

  const AdminSettings = () => <h1>Admin Settings Page</h1>;
  const CommunicationsPage = () => {
    const location = useLocation();

    return (
      <h1>
        {location.pathname.includes('email-marketing')
          ? 'Email Marketing Page'
          : 'Communications Page'}
      </h1>
    );
  };

  return {
    AdminSettings,
    UserSettings: () => <h1>User Settings Page</h1>,
    ApiSettings: () => <h1>API Settings Page</h1>,
    NavigationSettings: () => <h1>Navigation Settings Page</h1>,
    DataBackup: () => <h1>Data Backup Page</h1>,
    CommunicationsPage,
    SocialMedia: () => <h1>Social Media Page</h1>,
    PortalAdminPage: ({ panel }: { panel: string }) => <h1>Portal Panel: {panel}</h1>,
    AdminSettingsSectionRoute: () => {
      const location = useLocation();
      const { section } = useParams<{ section?: string }>();

      if (!parseAdminSettingsSection(section)) {
        return (
          <Navigate
            to={{
              pathname: getAdminSettingsPath('dashboard'),
              search: location.search,
            }}
            replace
          />
        );
      }

      return <AdminSettings />;
    },
  };
});

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const Wrapper = ({ children }: { children: ReactNode }) => (
  <>
    {children}
    <LocationProbe />
  </>
);

const renderAdminRoutes = (route: string) => {
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        {createAdminRoutes({
          ProtectedRoute: Wrapper,
          AdminRoute: Wrapper,
          NeoBrutalistRoute: Wrapper,
        })}
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
};

const expectCurrentLocation = (expected: string) => {
  const probes = screen.getAllByTestId('location');
  expect(probes[probes.length - 1]).toHaveTextContent(expected);
};

const isKind =
  <Kind extends (typeof adminRouteManifest)[number]['kind']>(kind: Kind) =>
  (
    entry: (typeof adminRouteManifest)[number]
  ): entry is Extract<(typeof adminRouteManifest)[number], { kind: Kind }> =>
    entry.kind === kind;

describe('admin route redirects', () => {
  const pageRoutes = adminRouteManifest.filter(isKind('page'));
  const redirectRoutes = adminRouteManifest.filter(isKind('redirect'));
  const portalRoutes = adminRouteManifest.filter(isKind('portal-panel'));
  const sectionRoute = adminRouteManifest.find(isKind('section'));

  it('redirects /settings/admin to the dashboard section', async () => {
    renderAdminRoutes('/settings/admin');
    expect(
      await screen.findByRole('heading', { name: /admin settings page/i })
    ).toBeInTheDocument();
    expectCurrentLocation('/settings/admin/dashboard');
  });

  it.each(
    sectionRoute?.sections.map((section) => [getAdminSettingsPath(section), section] as const) ?? []
  )('renders canonical admin section route %s', async (route) => {
    renderAdminRoutes(route);
    expect(
      await screen.findByRole('heading', { name: /admin settings page/i })
    ).toBeInTheDocument();
    expectCurrentLocation(route);
  });

  it.each(pageRoutes.map(({ path }) => [path] as const))(
    'renders canonical admin page route %s',
    async (route) => {
      renderAdminRoutes(route);

      const headingName = route.includes('email-marketing')
        ? /email marketing page/i
        : route.includes('communications')
          ? /communications page/i
          : route.includes('social-media')
            ? /social media page/i
            : route.includes('/api')
              ? /api settings page/i
              : route.includes('/navigation')
                ? /navigation settings page/i
                : route.includes('/user')
                  ? /user settings page/i
                  : /data backup page/i;

      expect(await screen.findByRole('heading', { name: headingName })).toBeInTheDocument();
      expectCurrentLocation(route);
    }
  );

  it('verifies route wrapper metadata is present for canonical page routes', () => {
    const wrappers = new Map(pageRoutes.map((entry) => [entry.path, entry.wrapper]));

    expect(wrappers.get('/settings/communications')).toBe('protected');
    expect(wrappers.get('/settings/email-marketing')).toBe('protected');
    expect(wrappers.get('/settings/social-media')).toBe('admin');
    expect(wrappers.get('/settings/user')).toBe('neoBrutalist');
  });

  it('redirects invalid admin section slugs to dashboard', async () => {
    renderAdminRoutes('/settings/admin/not-a-real-section?foo=1');
    expect(
      await screen.findByRole('heading', { name: /admin settings page/i })
    ).toBeInTheDocument();
    expectCurrentLocation('/settings/admin/dashboard?foo=1');
  });

  it('redirects /settings/admin/portal to portal access panel', async () => {
    renderAdminRoutes('/settings/admin/portal');
    expect(
      await screen.findByRole('heading', { name: /portal panel: access/i })
    ).toBeInTheDocument();
    expectCurrentLocation('/settings/admin/portal/access');
  });

  it.each(portalRoutes.map(({ path, panel }) => [path, panel] as const))(
    'renders portal panel route %s',
    async (route, panel) => {
      renderAdminRoutes(route);
      expect(
        await screen.findByRole('heading', { name: new RegExp(`portal panel: ${panel}`, 'i') })
      ).toBeInTheDocument();
      expectCurrentLocation(route);
    }
  );

  it('renders canonical communications route directly', async () => {
    renderAdminRoutes('/settings/communications');
    expect(
      await screen.findByRole('heading', { name: /communications page/i })
    ).toBeInTheDocument();
    expectCurrentLocation('/settings/communications');
  });

  it('renders canonical email marketing route directly', async () => {
    renderAdminRoutes('/settings/email-marketing');
    expect(
      await screen.findByRole('heading', { name: /email marketing page/i })
    ).toBeInTheDocument();
    expectCurrentLocation('/settings/email-marketing');
  });

  it('renders canonical social media route directly', async () => {
    renderAdminRoutes('/settings/social-media');
    expect(await screen.findByRole('heading', { name: /social media page/i })).toBeInTheDocument();
    expectCurrentLocation('/settings/social-media');
  });

  it.each(redirectRoutes.map(({ path, redirectsTo }) => [path, redirectsTo] as const))(
    'redirects legacy route %s to %s',
    async (legacyRoute, canonicalRoute) => {
      renderAdminRoutes(legacyRoute);
      expect(await screen.findByText(canonicalRoute)).toBeInTheDocument();
      expectCurrentLocation(canonicalRoute);
    }
  );

  it('redirects legacy admin email settings to communications', async () => {
    renderAdminRoutes('/settings/admin/email');
    expect(await screen.findByText('/settings/admin/communications')).toBeInTheDocument();
    expectCurrentLocation('/settings/admin/communications');
  });
});
