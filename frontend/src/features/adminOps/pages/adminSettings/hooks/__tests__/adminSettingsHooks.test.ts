import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useOrganizationSettings } from '../useOrganizationSettings';
import { useUsersSettings } from '../useUsersSettings';
import { useRolesSettings } from '../useRolesSettings';
import { usePortalSettings } from '../usePortalSettings';
import api from '../../../../../../services/api';

vi.mock('../../../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('admin settings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: {} });
    mockedApi.post.mockResolvedValue({ data: {} });
    mockedApi.put.mockResolvedValue({ data: {} });
    mockedApi.patch.mockResolvedValue({ data: {} });
    mockedApi.delete.mockResolvedValue({ data: {} });
  });

  it('handles organization save-state transitions', async () => {
    const setGlobalBranding = vi.fn();
    const { result } = renderHook(() =>
      useOrganizationSettings({
        initialMode: 'basic',
        setGlobalBranding,
      })
    );
    const initialLoadOrganizationData = result.current.loadOrganizationData;

    act(() => {
      result.current.handleChange('name', 'West Cat');
    });

    await waitFor(() => {
      expect(result.current.config.name).toBe('West Cat');
    });
    expect(result.current.loadOrganizationData).toBe(initialLoadOrganizationData);

    await act(async () => {
      await result.current.handleSaveOrganization();
    });

    expect(mockedApi.put).toHaveBeenCalledWith('/admin/organization-settings', {
      config: expect.objectContaining({ name: 'West Cat' }),
    });
    expect(result.current.saveStatus).toBe('success');
    expect(result.current.organizationLastSavedAt).toBeInstanceOf(Date);
  });

  it('persists workspace module changes alongside other organization settings', async () => {
    const setGlobalBranding = vi.fn();
    const { result } = renderHook(() =>
      useOrganizationSettings({
        initialMode: 'basic',
        setGlobalBranding,
      })
    );

    act(() => {
      result.current.handleChange('name', 'West Cat');
      result.current.handleWorkspaceModuleChange('cases');
    });

    await waitFor(() => {
      expect(result.current.config.name).toBe('West Cat');
      expect(result.current.config.workspaceModules.cases).toBe(false);
    });

    await act(async () => {
      await result.current.handleSaveOrganization();
    });

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

  it('hydrates global branding from the saved branding payload on load', async () => {
    const setGlobalBranding = vi.fn();
    mockedApi.get.mockImplementation((url: string) => {
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
                charitableRegistrationNumber: '12345 6789 RR0001',
                receiptingAddress: {
                  line1: '1 Main',
                  line2: '',
                  city: 'Vancouver',
                  province: 'BC',
                  postalCode: 'V6B 1A1',
                  country: 'Canada',
                },
                receiptIssueLocation: 'Vancouver, BC',
                authorizedSignerName: 'Jordan Lee',
                authorizedSignerTitle: 'Executive Director',
                contactEmail: 'receipts@example.com',
                contactPhone: '(604) 555-1000',
                advantageAmount: 0,
              },
            },
          },
        });
      }

      if (url === '/admin/branding') {
        return Promise.resolve({
          data: {
            appName: 'West Cat',
            appIcon: null,
            primaryColour: '#123456',
            secondaryColour: '#654321',
            favicon: null,
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useOrganizationSettings({
        initialMode: 'basic',
        setGlobalBranding,
      })
    );

    await act(async () => {
      await result.current.loadOrganizationData();
    });

    expect(result.current.branding).toEqual(
      expect.objectContaining({
        appName: 'West Cat',
        primaryColour: '#123456',
        secondaryColour: '#654321',
      })
    );
    expect(result.current.config.taxReceipt.legalName).toBe('West Cat Society');
    expect(setGlobalBranding).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'West Cat',
        primaryColour: '#123456',
        secondaryColour: '#654321',
      })
    );
  });

  it('does not overwrite global branding when branding bootstrap falls back to defaults', async () => {
    const setGlobalBranding = vi.fn();
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/admin/branding') {
        return Promise.reject(new Error('boom'));
      }

      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useOrganizationSettings({
        initialMode: 'basic',
        setGlobalBranding,
      })
    );

    await act(async () => {
      await result.current.loadOrganizationData();
    });

    expect(result.current.branding.appName).toBe('Nonprofit Manager');
    expect(setGlobalBranding).not.toHaveBeenCalled();
  });

  it('handles user security password reset action', async () => {
    const setFormErrorFromError = vi.fn();
    const clearFormError = vi.fn();
    const { result } = renderHook(() =>
      useUsersSettings({
        activeSection: 'users',
        confirm: vi.fn().mockResolvedValue(true),
        setFormErrorFromError,
        clearFormError,
      })
    );

    act(() => {
      result.current.setSelectedUser({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        lastLoginAt: null,
        lastPasswordChange: null,
        failedLoginAttempts: 0,
        isLocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      result.current.setNewPassword('new-password');
      result.current.setConfirmPassword('new-password');
    });

    await waitFor(() => {
      expect(result.current.selectedUser?.id).toBe('user-1');
    });

    await act(async () => {
      await result.current.handleResetUserPassword();
    });

    expect(clearFormError).toHaveBeenCalled();
    expect(mockedApi.put).toHaveBeenCalledWith('/users/user-1/password', {
      password: 'new-password',
    });
    expect(setFormErrorFromError).not.toHaveBeenCalled();
  });

  it('handles role CRUD actions', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { roles: [] } });
    const confirm = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useRolesSettings(confirm));

    act(() => {
      result.current.setEditingRole({
        id: '',
        name: 'Coordinator',
        description: 'Coordinate work',
        permissions: ['users.view'],
        isSystem: false,
        userCount: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.editingRole?.name).toBe('Coordinator');
    });

    await act(async () => {
      await result.current.handleSaveRole();
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/roles',
      expect.objectContaining({ name: 'Coordinator' })
    );

    await act(async () => {
      await result.current.handleDeleteRole('role-123');
    });

    expect(confirm).toHaveBeenCalled();
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/roles/role-123');
  });

  it('handles portal approve/invite/status/reminder actions', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/portal/admin/requests') return Promise.resolve({ data: { requests: [] } });
      if (url === '/portal/admin/invitations')
        return Promise.resolve({ data: { invitations: [] } });
      if (url === '/portal/admin/users') return Promise.resolve({ data: { users: [] } });
      if (url === '/portal/admin/appointments') {
        return Promise.resolve({
          data: { data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } },
        });
      }
      if (url.startsWith('/portal/admin/appointments/') && url.endsWith('/reminders')) {
        return Promise.resolve({ data: { jobs: [], deliveries: [] } });
      }
      return Promise.resolve({ data: {} });
    });
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/portal/admin/invitations') {
        return Promise.resolve({ data: { inviteUrl: 'https://invite.local/abc' } });
      }
      if (url.endsWith('/reminders/send')) {
        return Promise.resolve({ data: { summary: { email: { sent: 1 }, sms: { sent: 0 } } } });
      }
      return Promise.resolve({ data: {} });
    });

    const showSuccess = vi.fn();
    const notifyError = vi.fn();
    const { result } = renderHook(() =>
      usePortalSettings({
        activeSection: 'portal',
        showSuccess,
        showError: vi.fn(),
        notifyError,
        confirm: vi.fn().mockResolvedValue(true),
        setFormErrorFromError: vi.fn(),
        clearFormError: vi.fn(),
      })
    );

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/portal/admin/requests');
    });

    await act(async () => {
      await result.current.handleApprovePortalRequest('req-1');
    });

    act(() => {
      result.current.setPortalInviteEmail('portal@example.com');
      result.current.setPortalReminderCustomMessage('Follow-up reminder');
    });

    await waitFor(() => {
      expect(result.current.portalInviteEmail).toBe('portal@example.com');
      expect(result.current.portalReminderCustomMessage).toBe('Follow-up reminder');
    });

    await act(async () => {
      await result.current.handleCreatePortalInvite();
      await result.current.handlePortalSendAppointmentReminder('appt-1', { sendEmail: true });
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/portal/admin/requests/req-1/approve');
    expect(mockedApi.post).toHaveBeenCalledWith('/portal/admin/invitations', {
      email: 'portal@example.com',
      contact_id: undefined,
    });
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/portal/admin/appointments/appt-1/reminders/send',
      expect.objectContaining({
        sendEmail: true,
        customMessage: 'Follow-up reminder',
      })
    );
    expect(showSuccess).toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();
  });
});
