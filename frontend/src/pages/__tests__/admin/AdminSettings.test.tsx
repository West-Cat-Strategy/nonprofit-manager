import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import AdminSettings from '../../admin/AdminSettings';
import { renderWithProviders } from '../../../test/testUtils';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn((url: string) => {
      if (url === '/auth/preferences') return Promise.resolve({ data: { preferences: {} } });
      if (url === '/admin/branding') return Promise.resolve({ data: {} });
      if (url === '/admin/roles') return Promise.resolve({ data: { roles: [] } });
      return Promise.resolve({ data: {} });
    }),
  },
}));

vi.mock('../../../contexts/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));
vi.mock('../../../contexts/BrandingContext', () => ({
  useBranding: () => ({ setBranding: vi.fn() }),
}));
vi.mock('../../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));

vi.mock('../../../features/adminOps/pages/adminSettings/sections/OrganizationSection', () => ({
  default: () => <div>Organization Section</div>,
}));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/BrandingSection', () => ({
  default: () => <div>Branding Section</div>,
}));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/UsersSection', () => ({
  default: ({ onGoToRoles }: { onGoToRoles: () => void }) => (
    <div>
      <div>Users Section</div>
      <button type="button" onClick={onGoToRoles}>
        Go to Roles
      </button>
    </div>
  ),
}));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/RolesSection', () => ({
  default: () => <div>Roles Section</div>,
}));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/OtherSettingsSection', () => ({
  default: () => <div>Other Section</div>,
}));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/DashboardSection', () => ({
  default: () => <div>Dashboard Section</div>,
}));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/AuditLogsSection', () => ({
  default: () => <div>Audit Section</div>,
}));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/EmailSettingsSection', () => ({
  default: () => <div>Email Section</div>,
}));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/TwilioSettingsSection', () => ({
  default: () => <div>Messaging Section</div>,
}));
vi.mock(
  '../../../features/adminOps/pages/adminSettings/sections/RegistrationSettingsSection',
  () => ({ default: () => <div>Registration Section</div> })
);
vi.mock('../../../features/adminOps/pages/adminSettings/sections/OutcomeDefinitionsSection', () => ({
  default: () => <div>Outcomes Section</div>,
}));
vi.mock('../../../features/adminOps/pages/adminSettings/components/UserSecurityModal', () => ({
  default: () => null,
}));
vi.mock(
  '../../../features/adminOps/pages/adminSettings/components/PortalResetPasswordModal',
  () => ({ default: () => null })
);

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

const renderAdminSettings = (route = '/settings/admin/dashboard') =>
  renderWithProviders(
    <Routes>
      <Route
        path="/settings/admin/:section"
        element={
          <>
            <AdminSettings />
            <LocationProbe />
          </>
        }
      />
    </Routes>,
    { route }
  );

describe('AdminSettings page', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders admin settings shell and canonical portal/admin links', async () => {
    renderAdminSettings();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /admin settings/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: /portal operations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^access$/i })).toHaveAttribute(
      'href',
      '/settings/admin/portal/access'
    );
    expect(screen.getByRole('heading', { name: /quick actions/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /invite users/i })).toHaveAttribute(
      'href',
      '/settings/admin/users'
    );
  });

  it('renders the section directly from the canonical route path', async () => {
    renderAdminSettings('/settings/admin/organization');

    await waitFor(() => {
      expect(screen.getByText('Organization Section')).toBeInTheDocument();
    });
  });

  it('auto-enables advanced mode for direct advanced-section links', async () => {
    renderAdminSettings('/settings/admin/audit_logs');

    await waitFor(() => {
      expect(screen.getByText('Audit Section')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /hide advanced/i })).toBeInTheDocument();
  });

  it('ignores the removed section local-storage key', async () => {
    window.localStorage.setItem('admin_settings_section_v1', 'users');

    renderAdminSettings('/settings/admin/dashboard');

    await waitFor(() => {
      expect(screen.getByText('Dashboard Section')).toBeInTheDocument();
    });
  });

  it('supports keyboard tab navigation by navigating to canonical subpaths', async () => {
    renderAdminSettings('/settings/admin/dashboard');

    await waitFor(() => {
      expect(
        screen.getByRole('tablist', { name: /admin settings sections/i })
      ).toBeInTheDocument();
    });

    const dashboardTab = screen.getByRole('tab', { name: /dashboard/i });
    expect(dashboardTab).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(dashboardTab, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/settings/admin/organization');
    });
  });

  it('navigates internal shortcuts to canonical section routes', async () => {
    renderAdminSettings('/settings/admin/users');

    await waitFor(() => {
      expect(screen.getByText('Users Section')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /go to roles/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/settings/admin/roles');
      expect(screen.getByText('Roles Section')).toBeInTheDocument();
    });
  });
});
