import { useState } from 'react';
import type {
  AuditLog,
  UserInvitation,
  UserSearchResult,
  UserSecurityInfo,
} from '../types';

export const useUsersSettings = () => {
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSecurityInfo | null>(null);
  const [userAuditLogs, setUserAuditLogs] = useState<AuditLog[]>([]);

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showResetEmailModal, setShowResetEmailModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteEmailDelivery, setInviteEmailDelivery] = useState<{
    requested: boolean;
    sent: boolean;
    reason?: string;
  } | null>(null);
  const [inviteEmailConfigured, setInviteEmailConfigured] = useState<boolean>(false);
  const [inviteCapabilitiesLoading, setInviteCapabilitiesLoading] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  return {
    userSearchQuery,
    setUserSearchQuery,
    userSearchResults,
    setUserSearchResults,
    isSearching,
    setIsSearching,
    selectedUser,
    setSelectedUser,
    userAuditLogs,
    setUserAuditLogs,
    showSecurityModal,
    setShowSecurityModal,
    showResetPasswordModal,
    setShowResetPasswordModal,
    showResetEmailModal,
    setShowResetEmailModal,
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
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    newEmail,
    setNewEmail,
  };
};

export type UseUsersSettingsReturn = ReturnType<typeof useUsersSettings>;
