import { screen, waitFor } from '@testing-library/react';
import type { NavigateFunction } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import { vi } from 'vitest';
import AdminSettings from '../../admin/AdminSettings';
import { renderWithProviders } from '../../../test/testUtils';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate as unknown as NavigateFunction,
  };
});

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

vi.mock('../../../contexts/useToast', () => ({ useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }) }));
vi.mock('../../../contexts/BrandingContext', () => ({ useBranding: () => ({ setBranding: vi.fn() }) }));
vi.mock('../../../hooks/useUnsavedChangesGuard', () => ({ useUnsavedChangesGuard: vi.fn() }));

vi.mock('../../../features/adminOps/pages/adminSettings/sections/OrganizationSection', () => ({ default: () => <div>Organization Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/BrandingSection', () => ({ default: () => <div>Branding Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/UsersSection', () => ({ default: () => <div>Users Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/PortalSection', () => ({ default: () => <div>Portal Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/RolesSection', () => ({ default: () => <div>Roles Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/OtherSettingsSection', () => ({ default: () => <div>Other Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/DashboardSection', () => ({ default: () => <div>Dashboard Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/AuditLogsSection', () => ({ default: () => <div>Audit Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/EmailSettingsSection', () => ({ default: () => <div>Email Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/TwilioSettingsSection', () => ({ default: () => <div>Messaging Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/sections/RegistrationSettingsSection', () => ({ default: () => <div>Registration Section</div> }));
vi.mock('../../../features/adminOps/pages/adminSettings/components/UserSecurityModal', () => ({ default: () => null }));
vi.mock('../../../features/adminOps/pages/adminSettings/components/PortalResetPasswordModal', () => ({ default: () => null }));

describe('AdminSettings page', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    window.localStorage.clear();
  });

  it('renders admin settings shell and portal launch links', async () => {
    renderWithProviders(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /admin settings/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: /portal operations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /access/i })).toHaveAttribute(
      'href',
      '/settings/admin/portal/access'
    );
    expect(screen.queryByText(/portal section/i)).not.toBeInTheDocument();
  });

  it('honors a valid section query parameter', async () => {
    renderWithProviders(<AdminSettings />, { route: '/settings/admin?section=organization' });
    await waitFor(() => {
      expect(screen.getByText('Organization Section')).toBeInTheDocument();
    });
  });

  it('falls back to dashboard when section query is invalid', async () => {
    renderWithProviders(<AdminSettings />, { route: '/settings/admin?section=not-a-real-section' });
    await waitFor(() => {
      expect(screen.getByText('Dashboard Section')).toBeInTheDocument();
    });
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/settings/admin',
        search: expect.stringContaining('section=dashboard'),
      }),
      { replace: true }
    );
  });

  it('redirects section=portal to dedicated portal route', async () => {
    renderWithProviders(<AdminSettings />, { route: '/settings/admin?section=portal' });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/settings/admin/portal/access', { replace: true });
    });
  });
});
