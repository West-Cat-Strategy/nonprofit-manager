import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useOrganizationSettings } from '../useOrganizationSettings';
import { useUsersSettings } from '../useUsersSettings';
import { useRolesSettings } from '../useRolesSettings';
import { usePortalSettings } from '../usePortalSettings';
import {
  formatCanadianPhone,
  formatCanadianPostalCode,
  validatePostalCode,
} from '../../utils';
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
  const showSuccess = vi.fn();
  const showError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: {} });
    mockedApi.post.mockResolvedValue({ data: {} });
    mockedApi.put.mockResolvedValue({ data: {} });
    mockedApi.patch.mockResolvedValue({ data: {} });
    mockedApi.delete.mockResolvedValue({ data: {} });
    showSuccess.mockReset();
    showError.mockReset();
  });

  it('keeps the admin settings utility contract intact', () => {
    expect(formatCanadianPhone('6045551000')).toBe('(604) 555-1000');
    expect(formatCanadianPhone('16045551000')).toBe('+1 (604) 555-1000');
    expect(formatCanadianPostalCode('v6b1a1')).toBe('V6B 1A1');
    expect(validatePostalCode('V6B 1A1', 'Canada')).toBe(true);
    expect(validatePostalCode('12345', 'United States')).toBe(true);
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
        showSuccess,
        showError,
      })
    );

    act(() => {
      result.current.setSelectedUser({
        id: 'user-1',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'staff',
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
    expect(showSuccess).toHaveBeenCalledWith('Password reset successfully');
  });

  it('loads user access details and saves access assignments', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/users/user-1') {
        return Promise.resolve({
          data: {
            id: 'user-1',
            email: 'user@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'staff',
            isActive: true,
            lastLoginAt: null,
            lastPasswordChange: null,
            failedLoginAttempts: 0,
            isLocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }

      if (url === '/admin/users/user-1/access') {
        return Promise.resolve({
          data: {
            groups: ['group-1'],
            organizationAccess: ['org-1'],
            mfaTotpEnabled: true,
            passkeyCount: 2,
          },
        });
      }

      if (url === '/admin/groups') {
        return Promise.resolve({ data: { groups: [] } });
      }

      if (url === '/admin/organization-accounts') {
        return Promise.resolve({ data: { organizationAccounts: [] } });
      }

      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useUsersSettings({
        activeSection: 'users',
        confirm: vi.fn().mockResolvedValue(true),
        setFormErrorFromError: vi.fn(),
        clearFormError: vi.fn(),
        showSuccess,
        showError,
      })
    );

    await act(async () => {
      await result.current.fetchUserAccessInfo('user-1');
    });

    expect(result.current.showAccessModal).toBe(true);
    expect(result.current.selectedUser?.groups).toEqual(['group-1']);
    expect(result.current.userAccessDraft.groups).toEqual(['group-1']);

    act(() => {
      result.current.setUserAccessDraft({
        groups: ['group-1', 'group-2'],
        organizationAccess: ['org-1'],
      });
    });

    await act(async () => {
      await result.current.handleSaveUserAccess();
    });

    expect(mockedApi.put).toHaveBeenCalledWith('/admin/users/user-1/access', {
      groups: ['group-1', 'group-2'],
      organizationAccess: ['org-1'],
    });
  });

  it('handles group CRUD actions', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/admin/groups') {
        return Promise.resolve({ data: { groups: [] } });
      }

      if (url === '/admin/organization-accounts') {
        return Promise.resolve({ data: { organizationAccounts: [] } });
      }

      return Promise.resolve({ data: {} });
    });

    const confirm = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useUsersSettings({
        activeSection: 'groups',
        confirm,
        setFormErrorFromError: vi.fn(),
        clearFormError: vi.fn(),
        showSuccess,
        showError,
      })
    );

    act(() => {
      result.current.openCreateGroup();
      result.current.setGroupEditor({
        id: '',
        name: 'Volunteer Leads',
        description: 'Volunteer access bundle',
        roles: ['staff'],
        memberCount: 0,
        isSystem: false,
      });
    });

    await act(async () => {
      await result.current.handleSaveGroup();
    });

    expect(mockedApi.post).toHaveBeenCalledWith(
      '/admin/groups',
      expect.objectContaining({
        name: 'Volunteer Leads',
        roles: ['staff'],
      })
    );

    await act(async () => {
      await result.current.handleDeleteGroup('group-1');
    });

    expect(confirm).toHaveBeenCalled();
    expect(mockedApi.delete).toHaveBeenCalledWith('/admin/groups/group-1');
    expect(showSuccess).toHaveBeenCalledWith('Group created');
    expect(showSuccess).toHaveBeenCalledWith('Group deleted');
  });

  it('handles role CRUD actions', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/admin/roles') {
        return Promise.resolve({ data: { roles: [] } });
      }

      if (url === '/admin/permissions') {
        return Promise.resolve({ data: { permissions: [] } });
      }

      return Promise.resolve({ data: {} });
    });
    const confirm = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useRolesSettings(confirm, {
        showSuccess,
        showError,
      })
    );

    act(() => {
      result.current.setEditingRole({
        id: '',
        name: 'Coordinator',
        label: 'Coordinator',
        description: 'Coordinate work',
        permissions: ['users.view'],
        isSystem: false,
        userCount: 0,
        priority: 0,
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
    expect(showSuccess).toHaveBeenCalledWith('Role created');
    expect(showSuccess).toHaveBeenCalledWith('Role deleted');
  });

  it('opens the invite modal with the refreshed link after resend', async () => {
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/invitations/invite-1/resend') {
        return Promise.resolve({
          data: {
            inviteUrl: 'https://invite.local/refreshed',
            emailDelivery: { requested: true, sent: true },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useUsersSettings({
        activeSection: 'users',
        confirm: vi.fn().mockResolvedValue(true),
        setFormErrorFromError: vi.fn(),
        clearFormError: vi.fn(),
        showSuccess,
        showError,
      })
    );

    await act(async () => {
      await result.current.handleResendInvitation({
        id: 'invite-1',
        email: 'invitee@example.com',
        role: 'staff',
        message: 'Welcome aboard',
      });
    });

    expect(mockedApi.post).toHaveBeenCalledWith('/invitations/invite-1/resend');
    expect(result.current.showInviteModal).toBe(true);
    expect(result.current.inviteUrl).toBe('https://invite.local/refreshed');
    expect(result.current.inviteEmail).toBe('invitee@example.com');
    expect(showSuccess).toHaveBeenCalledWith('Invitation resent');
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

    expect(mockedApi.post).toHaveBeenCalledWith('/portal/admin/requests/req-1/approve', {});
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
