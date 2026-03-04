import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { createAdminRoutes } from '../adminRoutes';

vi.mock('../adminRouteComponents', () => ({
  AdminSettings: () => <h1>Admin Settings Page</h1>,
  UserSettings: () => <h1>User Settings Page</h1>,
  ApiSettings: () => <h1>API Settings Page</h1>,
  NavigationSettings: () => <h1>Navigation Settings Page</h1>,
  DataBackup: () => <h1>Data Backup Page</h1>,
  EmailMarketing: () => <h1>Email Marketing Page</h1>,
  PortalAdminPage: ({ panel }: { panel: string }) => <h1>Portal Panel: {panel}</h1>,
}));

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

  it('redirects /email-marketing to /settings/email-marketing', async () => {
    renderAdminRoutes('/email-marketing');
    expect(await screen.findByRole('heading', { name: /email marketing page/i })).toBeInTheDocument();
    expectCurrentLocation('/settings/email-marketing');
  });

  it('redirects /admin/audit-logs to admin hub audit logs section', async () => {
    renderAdminRoutes('/admin/audit-logs');
    expect(await screen.findByRole('heading', { name: /admin settings page/i })).toBeInTheDocument();
    expectCurrentLocation('/settings/admin?section=audit_logs');
  });

  it('redirects /settings/organization to admin hub organization section', async () => {
    renderAdminRoutes('/settings/organization');
    expect(await screen.findByRole('heading', { name: /admin settings page/i })).toBeInTheDocument();
    expectCurrentLocation('/settings/admin?section=organization');
  });
});
