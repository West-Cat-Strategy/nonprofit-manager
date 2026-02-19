import { screen, waitFor } from '@testing-library/react';
import AdminSettings from '../../admin/AdminSettings';
import { renderWithProviders } from '../../../test/testUtils';
import { vi } from 'vitest';

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

vi.mock('../../admin/adminSettings/sections/OrganizationSection', () => ({ default: () => <div>Organization Section</div> }));
vi.mock('../../admin/adminSettings/sections/BrandingSection', () => ({ default: () => <div>Branding Section</div> }));
vi.mock('../../admin/adminSettings/sections/UsersSection', () => ({ default: () => <div>Users Section</div> }));
vi.mock('../../admin/adminSettings/sections/PortalSection', () => ({ default: () => <div>Portal Section</div> }));
vi.mock('../../admin/adminSettings/sections/RolesSection', () => ({ default: () => <div>Roles Section</div> }));
vi.mock('../../admin/adminSettings/sections/OtherSettingsSection', () => ({ default: () => <div>Other Section</div> }));
vi.mock('../../admin/adminSettings/sections/DashboardSection', () => ({ default: () => <div>Dashboard Section</div> }));
vi.mock('../../admin/adminSettings/sections/AuditLogsSection', () => ({ default: () => <div>Audit Section</div> }));
vi.mock('../../admin/adminSettings/sections/EmailSettingsSection', () => ({ default: () => <div>Email Section</div> }));
vi.mock('../../admin/adminSettings/sections/RegistrationSettingsSection', () => ({ default: () => <div>Registration Section</div> }));
vi.mock('../../admin/adminSettings/components/UserSecurityModal', () => ({ default: () => null }));
vi.mock('../../admin/adminSettings/components/PortalResetPasswordModal', () => ({ default: () => null }));

describe('AdminSettings page', () => {
  it('renders admin settings shell', async () => {
    renderWithProviders(<AdminSettings />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /admin settings/i })).toBeInTheDocument();
    });
  });
});
