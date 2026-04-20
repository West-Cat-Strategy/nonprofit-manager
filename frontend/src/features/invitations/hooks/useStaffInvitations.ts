import { useCallback, useEffect, useState } from 'react';
import type { ConfirmOptions } from '../../../hooks/useConfirmDialog';
import api from '../../../services/api';
import type { InvitationEmailDelivery, StaffInvitation } from '../types';

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;
type NotifyFn = (message: string) => void;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const readList = <T,>(value: unknown, keys: string[]): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate as T[];
    }
  }

  return [];
};

const readInvitationList = (value: unknown): StaffInvitation[] =>
  readList<StaffInvitation>(value, ['invitations', 'data', 'items']);

const readInvitationEmailDelivery = (value: unknown): InvitationEmailDelivery | null => {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return {
    requested: Boolean(record.requested),
    sent: Boolean(record.sent),
    reason: typeof record.reason === 'string' ? record.reason : undefined,
  };
};

const readInviteUrl = (value: unknown): string | null => {
  const record = asRecord(value);
  return typeof record?.inviteUrl === 'string' ? record.inviteUrl : null;
};

const readInviteEmailConfigured = (value: unknown): boolean => {
  const record = asRecord(value);
  const candidate = asRecord(record?.settings) ?? asRecord(record?.data) ?? record;
  return Boolean(candidate?.isConfigured);
};

export const useStaffInvitations = ({
  confirm,
  setFormErrorFromError,
  clearFormError,
  showSuccess,
  showError,
}: {
  confirm: ConfirmFn;
  setFormErrorFromError: (error: unknown, fallbackMessage?: string) => void;
  clearFormError: () => void;
  showSuccess: NotifyFn;
  showError: NotifyFn;
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitations, setInvitations] = useState<StaffInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteEmailDelivery, setInviteEmailDelivery] = useState<InvitationEmailDelivery | null>(
    null
  );
  const [inviteEmailConfigured, setInviteEmailConfigured] = useState(false);
  const [inviteCapabilitiesLoading, setInviteCapabilitiesLoading] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await api.get('/invitations');
      setInvitations(readInvitationList(response.data));
    } catch {
      // Invitations are optional in degraded environments.
    }
  }, []);

  const fetchInviteCapabilities = useCallback(async () => {
    try {
      setInviteCapabilitiesLoading(true);
      const response = await api.get('/admin/email-settings');
      setInviteEmailConfigured(readInviteEmailConfigured(response.data));
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

        setInviteUrl(readInviteUrl(response.data));
        setInviteEmailDelivery(readInvitationEmailDelivery(asRecord(response.data)?.emailDelivery));
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
      if (!confirmed) {
        return;
      }

      try {
        await api.delete(`/invitations/${invitationId}`);
        await fetchInvitations();
        showSuccess('Invitation revoked');
      } catch {
        showError('Failed to revoke invitation');
      }
    },
    [confirm, fetchInvitations, showError, showSuccess]
  );

  const handleResendInvitation = useCallback(
    async (invitation: Pick<StaffInvitation, 'id' | 'email' | 'role' | 'message'>) => {
      try {
        const response = await api.post(`/invitations/${invitation.id}/resend`);
        setInviteEmail(invitation.email);
        setInviteRole(invitation.role);
        setInviteMessage(invitation.message || '');
        setInviteUrl(readInviteUrl(response.data));
        setInviteEmailDelivery(readInvitationEmailDelivery(asRecord(response.data)?.emailDelivery));
        clearFormError();
        setShowInviteModal(true);
        showSuccess('Invitation resent');
        await fetchInvitations();
      } catch {
        showError('Failed to resend invitation');
      }
    },
    [clearFormError, fetchInvitations, showError, showSuccess]
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
