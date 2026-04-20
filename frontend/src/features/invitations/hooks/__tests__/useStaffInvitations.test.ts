import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../../services/api';
import { useStaffInvitations } from '../useStaffInvitations';

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('useStaffInvitations', () => {
  const clearFormError = vi.fn();
  const setFormErrorFromError = vi.fn();
  const showSuccess = vi.fn();
  const showError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: {} });
    mockedApi.post.mockResolvedValue({ data: {} });
    mockedApi.delete.mockResolvedValue({ data: {} });
  });

  it('checks email delivery capabilities when the invite modal opens', async () => {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/admin/email-settings') {
        return Promise.resolve({
          data: {
            settings: {
              isConfigured: true,
            },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useStaffInvitations({
        confirm: vi.fn().mockResolvedValue(true),
        setFormErrorFromError,
        clearFormError,
        showSuccess,
        showError,
      })
    );

    act(() => {
      result.current.setShowInviteModal(true);
    });

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/admin/email-settings');
      expect(result.current.inviteEmailConfigured).toBe(true);
      expect(result.current.inviteCapabilitiesLoading).toBe(false);
    });
  });

  it('creates an invitation and refreshes the pending invitations list', async () => {
    const pendingInvitations = [
      {
        id: 'invite-1',
        email: 'invitee@example.com',
        role: 'manager',
        expiresAt: '2026-12-31T00:00:00.000Z',
        acceptedAt: null,
        isRevoked: false,
        message: 'Welcome aboard',
        createdAt: '2026-04-19T00:00:00.000Z',
        createdByName: 'Alex Admin',
      },
    ];

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/invitations') {
        return Promise.resolve({ data: { invitations: pendingInvitations } });
      }

      return Promise.resolve({ data: {} });
    });
    mockedApi.post.mockImplementation((url: string) => {
      if (url === '/invitations') {
        return Promise.resolve({
          data: {
            inviteUrl: 'https://invite.local/abc123',
            emailDelivery: {
              requested: true,
              sent: true,
            },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() =>
      useStaffInvitations({
        confirm: vi.fn().mockResolvedValue(true),
        setFormErrorFromError,
        clearFormError,
        showSuccess,
        showError,
      })
    );

    act(() => {
      result.current.setInviteEmail('invitee@example.com');
      result.current.setInviteRole('manager');
      result.current.setInviteMessage('Welcome aboard');
    });

    await act(async () => {
      await result.current.handleCreateInvitation(true);
    });

    expect(clearFormError).toHaveBeenCalled();
    expect(mockedApi.post).toHaveBeenCalledWith('/invitations', {
      email: 'invitee@example.com',
      role: 'manager',
      message: 'Welcome aboard',
      sendEmail: true,
    });

    await waitFor(() => {
      expect(result.current.inviteUrl).toBe('https://invite.local/abc123');
      expect(result.current.inviteEmailDelivery).toEqual({
        requested: true,
        sent: true,
        reason: undefined,
      });
      expect(result.current.invitations).toEqual(pendingInvitations);
    });

    expect(setFormErrorFromError).not.toHaveBeenCalled();
    expect(showError).not.toHaveBeenCalled();
  });
});
