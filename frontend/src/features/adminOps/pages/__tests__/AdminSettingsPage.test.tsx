import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ComponentType } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';

let AdminSettings: ComponentType;
const importAdminSettings = () => import('../AdminSettingsPage');
const { mockNavigate, mockSetBranding } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetBranding: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = (await vi.importActual('react-router-dom')) as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn((url: string) => {
      if (url === '/admin/organization-settings') {
        return Promise.resolve({
          data: {
            organizationId: 'org-1',
            createdAt: '2026-03-15T00:00:00.000Z',
            updatedAt: '2026-03-15T00:00:00.000Z',
            config: {
              name: 'West Cat',
              email: 'hello@example.com',
              phone: '(604) 555-1000',
              website: 'https://example.com',
              address: {
                line1: '1 Main',
                line2: '',
                city: 'Vancouver',
                province: 'BC',
                postalCode: 'V6B 1A1',
                country: 'Canada',
              },
              timezone: 'America/Vancouver',
              dateFormat: 'YYYY-MM-DD',
              currency: 'CAD',
              fiscalYearStart: '04',
              measurementSystem: 'metric',
              phoneFormat: 'canadian',
              taxReceipt: {
                legalName: 'West Cat Society',
                charitableRegistrationNumber: '',
                receiptingAddress: {
                  line1: '',
                  line2: '',
                  city: '',
                  province: '',
                  postalCode: '',
                  country: 'Canada',
                },
                receiptIssueLocation: '',
                authorizedSignerName: '',
                authorizedSignerTitle: '',
                contactEmail: '',
                contactPhone: '',
                advantageAmount: 0,
              },
            },
          },
        });
      }
      if (url === '/admin/branding') return Promise.resolve({ data: {} });
      if (url === '/admin/roles') return Promise.resolve({ data: { roles: [] } });
      if (url === '/admin/permissions') return Promise.resolve({ data: { permissions: [] } });
      if (url === '/admin/groups') return Promise.resolve({ data: { groups: [] } });
      if (url === '/admin/organization-accounts') return Promise.resolve({ data: { organizationAccounts: [] } });
      return Promise.resolve({ data: {} });
    }),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));
vi.mock('../../../../contexts/BrandingContext', () => ({
  useBranding: () => ({ setBranding: mockSetBranding }),
}));
vi.mock('../../../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));

vi.mock('../adminSettings/sections/OrganizationSection', () => ({
  default: () => <div>Organization Section</div>,
}));
vi.mock('../adminSettings/sections/WorkspaceModulesSection', () => ({
  default: () => <div>Workspace Modules Section</div>,
}));
vi.mock('../adminSettings/sections/BrandingSection', () => ({
  default: () => <div>Branding Section</div>,
}));
vi.mock('../adminSettings/sections/UsersSection', () => ({
  default: ({ onGoToRoles, onGoToGroups }: { onGoToRoles: () => void; onGoToGroups: () => void }) => (
    <div>
      <div>Users Section</div>
      <button type="button" onClick={onGoToRoles}>
        Go to Roles
      </button>
      <button type="button" onClick={onGoToGroups}>
        Go to Groups
      </button>
    </div>
  ),
}));
vi.mock('../adminSettings/sections/GroupsSection', () => ({
  default: () => <div>Groups Section</div>,
}));
vi.mock('../adminSettings/sections/RolesSection', () => ({
  default: () => <div>Roles Section</div>,
}));
vi.mock('../adminSettings/sections/OtherSettingsSection', () => ({
  default: () => <div>Other Section</div>,
}));
vi.mock('../adminSettings/sections/DashboardSection', () => ({
  default: () => <div>Dashboard Section</div>,
}));
vi.mock('../adminSettings/sections/AuditLogsSection', () => ({
  default: () => <div>Audit Section</div>,
}));
vi.mock('../adminSettings/sections/CommunicationsSection', () => ({
  default: () => <div>Communications Section</div>,
}));
vi.mock('../adminSettings/sections/TwilioSettingsSection', () => ({
  default: () => <div>Messaging Section</div>,
}));
vi.mock(
  '../adminSettings/sections/RegistrationSettingsSection',
  () => ({ default: () => <div>Registration Section</div> })
);
vi.mock(
  '../adminSettings/sections/OutcomeDefinitionsSection',
  () => ({
    default: () => <div>Outcomes Section</div>,
  })
);
vi.mock('../adminSettings/sections/PortalSection', () => ({
  default: () => (
    <div>
      <h2>Portal Operations</h2>
      <a href="/settings/admin/portal/access">Access</a>
      <a href="/settings/admin/portal/appointments">Appointments</a>
    </div>
  ),
}));
vi.mock('../adminSettings/components/UserSecurityModal', () => ({
  default: () => null,
}));
vi.mock(
  '../adminSettings/components/PortalResetPasswordModal',
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
  beforeEach(async () => {
    window.localStorage.clear();
    mockNavigate.mockReset();
    vi.resetModules();
    AdminSettings = (await importAdminSettings()).default;
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

  it('renders the communications section directly from the canonical route path', async () => {
    renderAdminSettings('/settings/admin/communications');

    await waitFor(() => {
      expect(screen.getByText('Communications Section')).toBeInTheDocument();
    });
  });

  it('renders the groups section directly from the canonical route path', async () => {
    renderAdminSettings('/settings/admin/groups');

    await waitFor(() => {
      expect(screen.getByText('Groups Section')).toBeInTheDocument();
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
      expect(screen.getByRole('tablist', { name: /admin settings sections/i })).toBeInTheDocument();
    });

    const dashboardTab = screen.getByRole('tab', { name: /dashboard/i });
    expect(dashboardTab).toHaveAttribute('aria-selected', 'true');

    dashboardTab.focus();
    fireEvent.keyDown(dashboardTab, { key: 'ArrowRight', code: 'ArrowRight' });

    expect(mockNavigate).toHaveBeenCalledWith(
      {
        pathname: '/settings/admin/organization',
        search: '',
      },
      undefined
    );
  });

  it('navigates internal shortcuts to canonical section routes', async () => {
    renderAdminSettings('/settings/admin/users');

    await waitFor(() => {
      expect(screen.getByText('Users Section')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /go to roles/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      {
        pathname: '/settings/admin/roles',
        search: '',
      },
      undefined
    );
  });

  it('navigates to the new groups workspace from the users section', async () => {
    renderAdminSettings('/settings/admin/users');

    await waitFor(() => {
      expect(screen.getByText('Users Section')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /go to groups/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      {
        pathname: '/settings/admin/groups',
        search: '',
      },
      undefined
    );
  });
});
