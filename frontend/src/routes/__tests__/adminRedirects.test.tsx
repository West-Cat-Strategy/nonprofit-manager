import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { createAdminRoutes } from '../adminRoutes';

vi.mock('../../features/adminOps/routeComponents', async () => {
  const { Navigate, useLocation, useParams } = await import('react-router-dom');
  const { getAdminSettingsPath, parseAdminSettingsSection } = await import(
    '../../features/adminOps/adminRoutePaths'
  );

  const AdminSettings = () => <h1>Admin Settings Page</h1>;

  return {
    AdminSettings,
    UserSettings: () => <h1>User Settings Page</h1>,
    ApiSettings: () => <h1>API Settings Page</h1>,
    NavigationSettings: () => <h1>Navigation Settings Page</h1>,
    DataBackup: () => <h1>Data Backup Page</h1>,
    EmailMarketing: () => <h1>Email Marketing Page</h1>,
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

describe('admin route redirects', () => {
  it('redirects /settings/admin to the dashboard section', async () => {
    renderAdminRoutes('/settings/admin');
    expect(await screen.findByRole('heading', { name: /admin settings page/i })).toBeInTheDocument();
    expectCurrentLocation('/settings/admin/dashboard');
  });

  it.each([
    ['/settings/admin/dashboard', '/settings/admin/dashboard'],
    ['/settings/admin/organization', '/settings/admin/organization'],
    ['/settings/admin/branding', '/settings/admin/branding'],
    ['/settings/admin/users', '/settings/admin/users'],
    ['/settings/admin/email', '/settings/admin/email'],
    ['/settings/admin/messaging', '/settings/admin/messaging'],
    ['/settings/admin/outcomes', '/settings/admin/outcomes'],
    ['/settings/admin/roles', '/settings/admin/roles'],
    ['/settings/admin/audit_logs', '/settings/admin/audit_logs'],
    ['/settings/admin/other', '/settings/admin/other'],
  ])('renders canonical admin section route %s', async (route, canonicalRoute) => {
    renderAdminRoutes(route);
    expect(await screen.findByRole('heading', { name: /admin settings page/i })).toBeInTheDocument();
    expectCurrentLocation(canonicalRoute);
  });

  it('redirects invalid admin section slugs to dashboard', async () => {
    renderAdminRoutes('/settings/admin/not-a-real-section?foo=1');
    expect(await screen.findByRole('heading', { name: /admin settings page/i })).toBeInTheDocument();
    expectCurrentLocation('/settings/admin/dashboard?foo=1');
  });

  it('redirects /settings/admin/portal to portal access panel', async () => {
    renderAdminRoutes('/settings/admin/portal');
    expect(await screen.findByRole('heading', { name: /portal panel: access/i })).toBeInTheDocument();
    expectCurrentLocation('/settings/admin/portal/access');
  });

  it.each([
    ['/settings/admin/portal/access', 'access'],
    ['/settings/admin/portal/users', 'users'],
    ['/settings/admin/portal/conversations', 'conversations'],
    ['/settings/admin/portal/appointments', 'appointments'],
    ['/settings/admin/portal/slots', 'slots'],
  ])('renders portal panel route %s', async (route, panel) => {
    renderAdminRoutes(route);
    expect(
      await screen.findByRole('heading', { name: new RegExp(`portal panel: ${panel}`, 'i') })
    ).toBeInTheDocument();
    expectCurrentLocation(route);
  });

  it('renders canonical email marketing route directly', async () => {
    renderAdminRoutes('/settings/email-marketing');
    expect(await screen.findByRole('heading', { name: /email marketing page/i })).toBeInTheDocument();
    expectCurrentLocation('/settings/email-marketing');
  });

  it('renders canonical social media route directly', async () => {
    renderAdminRoutes('/settings/social-media');
    expect(await screen.findByRole('heading', { name: /social media page/i })).toBeInTheDocument();
    expectCurrentLocation('/settings/social-media');
  });

  it.each([
    ['/email-marketing', '/settings/email-marketing', /email marketing page/i],
    ['/settings/organization', '/settings/admin/organization', /admin settings page/i],
    ['/admin/audit-logs', '/settings/admin/audit_logs', /admin settings page/i],
  ])('redirects legacy route %s to %s', async (legacyRoute, canonicalRoute, heading) => {
    renderAdminRoutes(legacyRoute);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expectCurrentLocation(canonicalRoute);
  });
});
