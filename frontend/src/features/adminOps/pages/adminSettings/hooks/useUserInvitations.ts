import { useCallback, useEffect, useState } from 'react';
import api from '../../../../../services/api';
import type { ConfirmOptions } from '../../../../../hooks/useConfirmDialog';
import { getEmailSettingsBundle } from '../../../api/adminHubApiClient';
import type { UserInvitation } from '../types';
import { readList } from './userSettingsData';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const useUserInvitations = ({
  confirm,
  setFormErrorFromError,
  clearFormError,
}: {
  confirm: ConfirmFn;
  setFormErrorFromError: (error: unknown, fallbackMessage?: string) => void;
  clearFormError: () => void;
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteEmailDelivery, setInviteEmailDelivery] = useState<{
    requested: boolean;
    sent: boolean;
    reason?: string;
  } | null>(null);
  const [inviteEmailConfigured, setInviteEmailConfigured] = useState(false);
  const [inviteCapabilitiesLoading, setInviteCapabilitiesLoading] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await api.get('/invitations');
      setInvitations(readList<UserInvitation>(response.data, ['invitations', 'data', 'items']));
    } catch {
      // Invitations are optional in degraded environments.
    }
  }, []);

  const fetchInviteCapabilities = useCallback(async () => {
    try {
      setInviteCapabilitiesLoading(true);
      const response = await getEmailSettingsBundle();
      setInviteEmailConfigured(Boolean(response.settings?.isConfigured));
    } catch {
      setInviteEmailConfigured(false);
    } finally {
      setInviteCapabilitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showInviteModal) {
      void fetchInviteCapabilities();
    }
  }, [showInviteModal, fetchInviteCapabilities]);

  const handleCreateInvitation = useCallback(
    async (sendEmail: boolean) => {
      if (!inviteEmail) {
        setFormErrorFromError(new Error('Email is required'), 'Email is required');
        return;
      }

      setIsCreatingInvite(true);
      clearFormError();

      try {
        const response = await api.post('/invitations', {
          email: inviteEmail,
          role: inviteRole,
          message: inviteMessage || undefined,
          sendEmail,
        });

        setInviteUrl(response.data.inviteUrl);
        setInviteEmailDelivery(response.data.emailDelivery || null);
        await fetchInvitations();
      } catch (error: unknown) {
        setFormErrorFromError(error, 'Failed to create invitation');
      } finally {
        setIsCreatingInvite(false);
      }
    },
    [
      clearFormError,
      fetchInvitations,
      inviteEmail,
      inviteMessage,
      inviteRole,
      setFormErrorFromError,
    ]
  );

  const handleRevokeInvitation = useCallback(
    async (invitationId: string) => {
      const confirmed = await confirm({
        title: 'Revoke Invitation',
        message: 'Are you sure you want to revoke this invitation?',
        confirmLabel: 'Revoke',
        variant: 'warning',
      });
      if (!confirmed) return;

      try {
        await api.delete(`/invitations/${invitationId}`);
        await fetchInvitations();
      } catch {
        alert('Failed to revoke invitation');
      }
    },
    [confirm, fetchInvitations]
  );

  const handleResendInvitation = useCallback(
    async (invitationId: string) => {
      try {
        const response = await api.post(`/invitations/${invitationId}/resend`);
        alert(`Invitation resent! New link:\n${response.data.inviteUrl}`);
        await fetchInvitations();
      } catch {
        alert('Failed to resend invitation');
      }
    },
    [fetchInvitations]
  );

  const resetInviteModal = useCallback(() => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('staff');
    setInviteMessage('');
    setInviteUrl(null);
    setInviteEmailDelivery(null);
    clearFormError();
  }, [clearFormError]);

  return {
    showInviteModal,
    setShowInviteModal,
    invitations,
    setInvitations,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviteMessage,
    setInviteMessage,
    inviteUrl,
    setInviteUrl,
    inviteEmailDelivery,
    setInviteEmailDelivery,
    inviteEmailConfigured,
    setInviteEmailConfigured,
    inviteCapabilitiesLoading,
    setInviteCapabilitiesLoading,
    isCreatingInvite,
    setIsCreatingInvite,
    fetchInvitations,
    fetchInviteCapabilities,
    handleCreateInvitation,
    handleRevokeInvitation,
    handleResendInvitation,
    resetInviteModal,
  };
};
