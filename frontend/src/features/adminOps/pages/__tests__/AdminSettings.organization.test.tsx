import type { ComponentType } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';

let AdminSettings: ComponentType;
const importAdminSettings = () => import('../AdminSettingsPage');

const { mockNavigate, mockedApi, mockSetBranding } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockSetBranding: vi.fn(),
  mockedApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = (await vi.importActual('react-router-dom')) as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../../services/api', () => ({
  default: mockedApi,
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn(), pushToast: vi.fn() }),
}));

vi.mock('../../../../contexts/BrandingContext', () => ({
  useBranding: () => ({ setBranding: mockSetBranding }),
}));

vi.mock('../../../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));

const renderAdminSettings = (route = '/settings/admin/organization') =>
  renderWithProviders(
    <Routes>
      <Route path="/settings/admin/:section" element={<AdminSettings />} />
    </Routes>,
    { route }
  );

const countGetCalls = (path: string): number =>
  mockedApi.get.mock.calls.filter(([url]) => url === path).length;

describe('AdminSettings organization section', () => {
  beforeAll(async () => {
    AdminSettings = (await importAdminSettings()).default;
  });

  beforeEach(() => {
    window.localStorage.clear();
    mockNavigate.mockReset();
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
    mockedApi.put.mockReset();
    mockedApi.patch.mockReset();
    mockedApi.delete.mockReset();

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/auth/preferences') {
        return Promise.resolve({ data: { preferences: {} } });
      }

      if (url === '/admin/branding') {
        return Promise.resolve({ data: {} });
      }

      if (url === '/admin/roles') {
        return Promise.resolve({ data: { roles: [] } });
      }

      if (url === '/admin/permissions') {
        return Promise.resolve({ data: { permissions: [] } });
      }

      return Promise.resolve({ data: {} });
    });
  });

  it('preserves typed organization values without triggering navigation or bootstrap reloads', async () => {
    const user = userEvent.setup();

    renderAdminSettings();

    const nameInput = await screen.findByPlaceholderText(/your nonprofit name/i);

    await waitFor(() => {
      expect(countGetCalls('/admin/organization-settings')).toBeGreaterThan(0);
    });

    mockNavigate.mockClear();

    await user.type(nameInput, 'West Cat');

    await waitFor(() => {
      expect(nameInput).toHaveValue('West Cat');
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('loads workspace module controls and saves module availability changes', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/auth/preferences') {
        return Promise.resolve({ data: { preferences: {} } });
      }

      if (url === '/admin/organization-settings') {
        return Promise.resolve({
          data: {
            organizationId: 'org-1',
            createdAt: '2026-03-15T00:00:00.000Z',
            updatedAt: '2026-03-15T00:00:00.000Z',
            config: {
              name: 'West Cat',
              email: '',
              phone: '',
              website: '',
              address: {
                line1: '',
                line2: '',
                city: '',
                province: '',
                postalCode: '',
                country: 'Canada',
              },
              timezone: 'America/Vancouver',
              dateFormat: 'YYYY-MM-DD',
              currency: 'CAD',
              fiscalYearStart: '04',
              measurementSystem: 'metric',
              phoneFormat: 'canadian',
              taxReceipt: {
                legalName: '',
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
              workspaceModules: {
                contacts: true,
                accounts: true,
                volunteers: true,
                events: true,
                tasks: true,
                cases: true,
                followUps: true,
                opportunities: true,
                externalServiceProviders: true,
                teamChat: true,
                donations: true,
                grants: true,
                recurringDonations: true,
                reconciliation: true,
                analytics: true,
                reports: true,
                scheduledReports: true,
                alerts: true,
              },
            },
          },
        });
      }

      if (url === '/admin/branding') {
        return Promise.resolve({ data: {} });
      }

      if (url === '/admin/roles') {
        return Promise.resolve({ data: { roles: [] } });
      }

      if (url === '/admin/permissions') {
        return Promise.resolve({ data: { permissions: [] } });
      }

      return Promise.resolve({ data: {} });
    });
    mockedApi.put.mockResolvedValue({
      data: {
        organizationId: 'org-1',
        createdAt: '2026-03-15T00:00:00.000Z',
        updatedAt: '2026-03-15T00:05:00.000Z',
        config: {
          name: 'West Cat',
          email: '',
          phone: '',
          website: '',
          address: {
            line1: '',
            line2: '',
            city: '',
            province: '',
            postalCode: '',
            country: 'Canada',
          },
          timezone: 'America/Vancouver',
          dateFormat: 'YYYY-MM-DD',
          currency: 'CAD',
          fiscalYearStart: '04',
          measurementSystem: 'metric',
          phoneFormat: 'canadian',
          taxReceipt: {
            legalName: '',
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
          workspaceModules: {
            contacts: true,
            accounts: true,
            volunteers: true,
            events: true,
            tasks: true,
            cases: false,
            followUps: true,
            opportunities: true,
            externalServiceProviders: true,
            teamChat: true,
            donations: true,
            grants: true,
            recurringDonations: true,
            reconciliation: true,
            analytics: true,
            reports: true,
            scheduledReports: true,
            alerts: true,
          },
        },
      },
    });

    renderAdminSettings('/settings/admin/workspace_modules');

    const casesToggle = await screen.findByRole(
      'checkbox',
      { name: /cases enabled/i },
      { timeout: 10000 }
    );

    await user.click(casesToggle);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockedApi.put).toHaveBeenCalledWith(
        '/admin/organization-settings',
        expect.objectContaining({
          config: expect.objectContaining({
            name: 'West Cat',
            workspaceModules: expect.objectContaining({
              cases: false,
            }),
          }),
        })
      );
    });
  });
});
