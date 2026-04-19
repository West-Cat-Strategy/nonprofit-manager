import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminRoute from '../AdminRoute';
import { renderWithProviders } from '../../test/testUtils';

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderAdminRoute = (route: string, children: ReactNode) =>
  renderWithProviders(
    <Routes>
      <Route
        path={route}
        element={<AdminRoute>{children}</AdminRoute>}
      />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
    {
      route,
      preloadedState: {
        auth: {
          user: {
            id: 'user-1',
            email: 'staff@example.com',
            firstName: 'Staff',
            lastName: 'User',
            role: 'staff',
          },
          isAuthenticated: true,
          authLoading: false,
          loading: false,
        },
      },
    }
  );

describe('AdminRoute', () => {
  it('waits for auth bootstrap before evaluating admin access on deep links', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/settings/admin/audit_logs" element={<AdminRoute><div>Audit Logs</div></AdminRoute>} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>,
      {
        route: '/settings/admin/audit_logs',
        preloadedState: {
          auth: {
            user: null,
            isAuthenticated: true,
            authLoading: true,
            loading: false,
          },
        },
      }
    );

    expect(screen.getByText(/loading admin page/i)).toBeInTheDocument();
    expect(screen.queryByTestId('location')).not.toBeInTheDocument();
  });

  it('allows legacy admin redirects to hand off to the canonical route', async () => {
    renderAdminRoute(
      '/admin/audit-logs',
      <Navigate to="/settings/admin/audit_logs" replace />
    );

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/settings/admin/audit_logs');
    });
  });

  it('still blocks authenticated non-admin users from real admin pages', async () => {
    renderAdminRoute('/settings/admin/users', <div>Admin Users</div>);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/dashboard');
    });
  });
});
