import { screen } from '@testing-library/react';
import AdminPanelNav from '../AdminPanelNav';
import { renderWithProviders } from '../../../../test/testUtils';

describe('AdminPanelNav', () => {
  it('shows admin-only links for admin users', () => {
    renderWithProviders(<AdminPanelNav currentPath="/settings/backup" />, {
      preloadedState: {
        auth: {
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
          },
          isAuthenticated: true,
          authLoading: false,
          loading: false,
        },
      },
    });

    expect(screen.getByRole('link', { name: /data backup/i })).toHaveAttribute(
      'href',
      '/settings/backup'
    );
    expect(screen.getByRole('link', { name: /social media/i })).toHaveAttribute(
      'href',
      '/settings/social-media'
    );
  });

  it('hides admin-only links for non-admin users', () => {
    renderWithProviders(<AdminPanelNav currentPath="/settings/navigation" />, {
      preloadedState: {
        auth: {
          user: {
            id: 'user-2',
            email: 'manager@example.com',
            firstName: 'Manager',
            lastName: 'User',
            role: 'manager',
          },
          isAuthenticated: true,
          authLoading: false,
          loading: false,
        },
      },
    });

    expect(screen.queryByRole('link', { name: /data backup/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /navigation/i })).toHaveClass('bg-app-accent');
  });

  it('shows admin links for users with permission-based admin access', () => {
    renderWithProviders(<AdminPanelNav currentPath="/settings/admin/users" />, {
      preloadedState: {
        auth: {
          user: {
            id: 'user-3',
            email: 'manager@example.com',
            firstName: 'Manager',
            lastName: 'User',
            role: 'manager',
            permissions: ['admin.settings.manage', 'reports.view'],
          },
          isAuthenticated: true,
          authLoading: false,
          loading: false,
        },
      },
    });

    expect(screen.getByRole('link', { name: /admin settings/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin settings/i })).toHaveAttribute(
      'href',
      '/settings/admin/dashboard'
    );
  });

  it('renders portal mode links and active panel state', () => {
    renderWithProviders(
      <AdminPanelNav currentPath="/settings/admin/portal/appointments" mode="portal" />,
      {
        preloadedState: {
          auth: {
            user: {
              id: 'user-1',
              email: 'admin@example.com',
              firstName: 'Admin',
              lastName: 'User',
              role: 'admin',
            },
            isAuthenticated: true,
            authLoading: false,
            loading: false,
          },
        },
      }
    );

    expect(screen.getByRole('link', { name: /^access$/i })).toHaveAttribute(
      'href',
      '/settings/admin/portal/access'
    );
    expect(screen.getByRole('link', { name: /appointments/i })).toHaveClass('bg-app-accent');
  });

  it('highlights the canonical admin settings entry for canonical section locations', () => {
    renderWithProviders(<AdminPanelNav currentPath="/settings/admin/users" />, {
      route: '/settings/admin/users',
      preloadedState: {
        auth: {
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
          },
          isAuthenticated: true,
          authLoading: false,
          loading: false,
        },
      },
    });

    expect(screen.getByRole('link', { name: /admin settings/i })).toHaveAttribute(
      'href',
      '/settings/admin/dashboard'
    );
    expect(screen.getByRole('link', { name: /admin settings/i })).toHaveClass('bg-app-accent');
  });
});
