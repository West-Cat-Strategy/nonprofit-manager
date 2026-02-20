/**
 * Admin Settings Page
 * Admin-only settings for configuring organization-wide preferences, branding,
 * user management, roles, and security settings
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../contexts/useToast';
import { useApiError } from '../../hooks/useApiError';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { useBranding } from '../../contexts/BrandingContext';
import ErrorBanner from '../../components/ErrorBanner';
import ConfirmDialog from '../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../hooks/useConfirmDialog';
import { defaultBranding, type BrandingConfig } from '../../types/branding';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import type {
  OrganizationConfig,
  Role,
  UserSearchResult,
  UserSecurityInfo,
  AuditLog,
  UserInvitation,
  PortalSignupRequest,
  PortalInvitation,
  PortalUser,
  PortalActivity,
  PortalContactLookup,
  PortalConversationThread,
  PortalConversationDetail,
  PortalAppointmentSlot,
  SaveStatus,
} from './adminSettings/types';
import { adminSettingsTabs, defaultConfig, defaultPermissions } from './adminSettings/constants';
import { formatCanadianPhone, formatCanadianPostalCode } from './adminSettings/utils';
import OrganizationSection from './adminSettings/sections/OrganizationSection';
import BrandingSection from './adminSettings/sections/BrandingSection';
import UsersSection from './adminSettings/sections/UsersSection';
import PortalSection from './adminSettings/sections/PortalSection';
import RolesSection from './adminSettings/sections/RolesSection';
import OtherSettingsSection from './adminSettings/sections/OtherSettingsSection';
import DashboardSection from './adminSettings/sections/DashboardSection';
import AuditLogsSection from './adminSettings/sections/AuditLogsSection';
import EmailSettingsSection from './adminSettings/sections/EmailSettingsSection';
import TwilioSettingsSection from './adminSettings/sections/TwilioSettingsSection';
import RegistrationSettingsSection from './adminSettings/sections/RegistrationSettingsSection';
import OutcomeDefinitionsSection from './adminSettings/sections/OutcomeDefinitionsSection';
import UserSecurityModal from './adminSettings/components/UserSecurityModal';
import PortalResetPasswordModal from './adminSettings/components/PortalResetPasswordModal';

const ADMIN_SETTINGS_MODE_KEY = 'admin_settings_mode_v1';
const ADMIN_SETTINGS_SECTION_KEY = 'admin_settings_section_v1';

const serializeOrganizationConfig = (value: OrganizationConfig): string => JSON.stringify(value);
const serializeBrandingConfig = (value: BrandingConfig): string => JSON.stringify(value);
const toIsoDateTime = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

// ============================================================================
// Main Component
// ============================================================================

export default function AdminSettings() {
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const { error: formError, setFromError: setFormErrorFromError, clear: clearFormError } = useApiError();
  const { setFromError: notifyError } = useApiError({ notify: true });
  const { setBranding: setGlobalBranding } = useBranding();
  const persistedMode =
    (typeof window !== 'undefined'
      ? (window.localStorage.getItem(ADMIN_SETTINGS_MODE_KEY) as 'basic' | 'advanced' | null)
      : null) || 'basic';
  const persistedSection =
    (typeof window !== 'undefined' ? window.localStorage.getItem(ADMIN_SETTINGS_SECTION_KEY) : null) ||
    'dashboard';

  // State
  const [activeSection, setActiveSection] = useState<string>(persistedSection);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(persistedMode === 'advanced');
  const [config, setConfig] = useState<OrganizationConfig>(defaultConfig);

  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [savedOrganizationSnapshot, setSavedOrganizationSnapshot] = useState('');
  const [savedBrandingSnapshot, setSavedBrandingSnapshot] = useState('');
  const [organizationLastSavedAt, setOrganizationLastSavedAt] = useState<Date | null>(null);
  const [brandingLastSavedAt, setBrandingLastSavedAt] = useState<Date | null>(null);

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSecurityInfo | null>(null);
  const [userAuditLogs, setUserAuditLogs] = useState<AuditLog[]>([]);

  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showResetEmailModal, setShowResetEmailModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Invitation state
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

  // Portal admin state
  const [portalRequests, setPortalRequests] = useState<PortalSignupRequest[]>([]);
  const [portalInvitations, setPortalInvitations] = useState<PortalInvitation[]>([]);
  const [portalInviteEmail, setPortalInviteEmail] = useState('');
  const [portalInviteContactId, setPortalInviteContactId] = useState('');
  const [portalInviteUrl, setPortalInviteUrl] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [portalUsersLoading, setPortalUsersLoading] = useState(false);
  const [portalUserSearch, setPortalUserSearch] = useState('');
  const [portalUserActivity, setPortalUserActivity] = useState<PortalActivity[]>([]);
  const [portalActivityLoading, setPortalActivityLoading] = useState(false);
  const [selectedPortalUser, setSelectedPortalUser] = useState<PortalUser | null>(null);
  const [portalResetTarget, setPortalResetTarget] = useState<PortalUser | null>(null);
  const [portalResetPassword, setPortalResetPassword] = useState('');
  const [portalResetConfirmPassword, setPortalResetConfirmPassword] = useState('');
  const [portalResetLoading, setPortalResetLoading] = useState(false);
  const [showPortalResetModal, setShowPortalResetModal] = useState(false);
  const [portalContactSearch, setPortalContactSearch] = useState('');
  const [portalContactResults, setPortalContactResults] = useState<PortalContactLookup[]>([]);
  const [portalContactLoading, setPortalContactLoading] = useState(false);
  const [selectedPortalContact, setSelectedPortalContact] = useState<PortalContactLookup | null>(null);
  const [portalConversationsLoading, setPortalConversationsLoading] = useState(false);
  const [portalConversations, setPortalConversations] = useState<PortalConversationThread[]>([]);
  const [selectedPortalConversation, setSelectedPortalConversation] = useState<PortalConversationDetail | null>(null);
  const [portalConversationReply, setPortalConversationReply] = useState('');
  const [portalConversationReplyInternal, setPortalConversationReplyInternal] = useState(false);
  const [portalConversationReplyLoading, setPortalConversationReplyLoading] = useState(false);
  const [portalSlotsLoading, setPortalSlotsLoading] = useState(false);
  const [portalSlots, setPortalSlots] = useState<PortalAppointmentSlot[]>([]);
  const [portalSlotSaving, setPortalSlotSaving] = useState(false);
  const [portalSlotForm, setPortalSlotForm] = useState({
    pointperson_user_id: '',
    case_id: '',
    title: '',
    details: '',
    location: '',
    start_time: '',
    end_time: '',
    capacity: 1,
  });

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  // formError handled via useApiError

  // Refs
  const iconInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const isOrganizationDirty =
    savedOrganizationSnapshot !== '' && serializeOrganizationConfig(config) !== savedOrganizationSnapshot;
  const isBrandingDirty =
    savedBrandingSnapshot !== '' && serializeBrandingConfig(branding) !== savedBrandingSnapshot;
  const hasUnsavedChanges =
    !isSaving &&
    ((activeSection === 'organization' && isOrganizationDirty) ||
      (activeSection === 'branding' && isBrandingDirty));

  useUnsavedChangesGuard({ hasUnsavedChanges });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configResponse, brandingResponse, rolesResponse] = await Promise.all([
          api.get('/auth/preferences').catch(() => ({ data: { preferences: {} } })),
          api.get('/admin/branding').catch(() => ({ data: defaultBranding })),
          api.get('/admin/roles').catch(() => ({ data: { roles: [] } })),
        ]);

        const prefs = configResponse.data.preferences;
        const resolvedConfig = prefs?.organization
          ? ({ ...defaultConfig, ...prefs.organization } as OrganizationConfig)
          : defaultConfig;
        const resolvedBranding = brandingResponse.data
          ? ({ ...defaultBranding, ...brandingResponse.data } as BrandingConfig)
          : defaultBranding;

        setConfig(resolvedConfig);
        setSavedOrganizationSnapshot(serializeOrganizationConfig(resolvedConfig));
        setBranding(resolvedBranding);
        setSavedBrandingSnapshot(serializeBrandingConfig(resolvedBranding));

        if (rolesResponse.data?.roles) {
          setRoles(rolesResponse.data.roles);
        } else {
          // Default roles
          setRoles([
            { id: '1', name: 'Administrator', description: 'Full access to all features', permissions: defaultPermissions.map((p) => p.key), isSystem: true, userCount: 1 },
            { id: '2', name: 'Manager', description: 'Manage records and view reports', permissions: defaultPermissions.filter((p) => !p.category.includes('Admin')).map((p) => p.key), isSystem: true, userCount: 0 },
            { id: '3', name: 'User', description: 'Standard access to assigned areas', permissions: defaultPermissions.filter((p) => p.key.includes('view') || p.key.includes('create')).map((p) => p.key), isSystem: true, userCount: 0 },
            { id: '4', name: 'Read Only', description: 'View-only access', permissions: defaultPermissions.filter((p) => p.key.includes('view')).map((p) => p.key), isSystem: true, userCount: 0 },
          ]);
        }
      } catch {
        // Use defaults if fetch fails
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSection !== 'portal') return;

    const fetchPortalData = async () => {
      try {
        setPortalLoading(true);
        setPortalUsersLoading(true);
        const [requestsResponse, invitationsResponse, usersResponse, conversationsResponse, slotsResponse] =
          await Promise.all([
          api.get('/portal/admin/requests').catch(() => ({ data: { requests: [] } })),
          api.get('/portal/admin/invitations').catch(() => ({ data: { invitations: [] } })),
          api.get('/portal/admin/users').catch(() => ({ data: { users: [] } })),
          api.get('/portal/admin/conversations').catch(() => ({ data: { conversations: [] } })),
          api.get('/portal/admin/appointment-slots').catch(() => ({ data: { slots: [] } })),
        ]);

        setPortalRequests(requestsResponse.data.requests || []);
        setPortalInvitations(invitationsResponse.data.invitations || []);
        setPortalUsers(usersResponse.data.users || []);
        setPortalConversations(conversationsResponse.data.conversations || []);
        setPortalSlots(slotsResponse.data.slots || []);
      } finally {
        setPortalLoading(false);
        setPortalUsersLoading(false);
      }
    };

    fetchPortalData();
  }, [activeSection]);

  useEffect(() => {
    const activeTab = adminSettingsTabs.find((tab) => tab.id === activeSection);
    if (activeTab?.level === 'advanced' && !showAdvancedSettings) {
      setActiveSection('dashboard');
    }
  }, [activeSection, showAdvancedSettings]);

  useEffect(() => {
    window.localStorage.setItem(
      ADMIN_SETTINGS_MODE_KEY,
      showAdvancedSettings ? 'advanced' : 'basic'
    );
  }, [showAdvancedSettings]);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_SETTINGS_SECTION_KEY, activeSection);
  }, [activeSection]);

  // ============================================================================
  // User Search
  // ============================================================================

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get(`/users?search=${encodeURIComponent(query)}&limit=10`);
      setUserSearchResults(response.data.users || []);
    } catch {
      setUserSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [userSearchQuery, searchUsers]);

  const fetchUserSecurityInfo = async (userId: string) => {
    try {
      const [userResponse, logsResponse] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/admin/users/${userId}/audit-logs`).catch(() => ({ data: { logs: [] } })),
      ]);
      setSelectedUser(userResponse.data);
      setUserAuditLogs(logsResponse.data.logs || []);
      setShowSecurityModal(true);
    } catch {
      alert('Failed to load user information');
    }
  };

  // ============================================================================
  // Save Handlers
  // ============================================================================

  const handleSaveOrganization = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await api.patch('/auth/preferences/organization', { value: config });
      setSavedOrganizationSnapshot(serializeOrganizationConfig(config));
      setOrganizationLastSavedAt(new Date());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const response = await api.put('/admin/branding', branding);
      const saved = { ...defaultBranding, ...(response.data || {}) } as BrandingConfig;
      setBranding(saved);
      setGlobalBranding(saved);
      setSavedBrandingSnapshot(serializeBrandingConfig(saved));
      setBrandingLastSavedAt(new Date());
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================================================
  // Input Handlers
  // ============================================================================

  const handleChange = (field: string, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    let formattedValue = value;
    if (field === 'postalCode' && config.address.country === 'Canada') {
      formattedValue = formatCanadianPostalCode(value);
    }
    setConfig((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: formattedValue },
    }));
  };

  const handlePhoneChange = (value: string) => {
    const formatted = config.phoneFormat === 'canadian' ? formatCanadianPhone(value) : value;
    setConfig((prev) => ({ ...prev, phone: formatted }));
  };

  const handleBrandingChange = (field: string, value: string) => {
    setBranding((prev) => ({ ...prev, [field]: value }));
  };

  // ============================================================================
  // Image Upload Handlers
  // ============================================================================

  const handleImageUpload = async (file: File, type: 'icon' | 'favicon') => {
    const maxSize = type === 'favicon' ? 1 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File is too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (type === 'icon') {
        setBranding((prev) => ({ ...prev, appIcon: base64 }));
      } else {
        setBranding((prev) => ({ ...prev, favicon: base64 }));
      }
    };
    reader.readAsDataURL(file);
  };

  // ============================================================================
  // Security Actions
  // ============================================================================

  const handleResetUserPassword = async () => {
    if (!selectedUser) return;
    clearFormError();

    if (newPassword !== confirmPassword) {
      setFormErrorFromError(new Error('Passwords do not match'), 'Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setFormErrorFromError(
        new Error('Password must be at least 8 characters'),
        'Password must be at least 8 characters'
      );
      return;
    }

    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: newPassword });
      setShowResetPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      alert('Password has been reset successfully');
    } catch {
      setFormErrorFromError(new Error('Failed to reset password'), 'Failed to reset password');
    }
  };

  const handleResetUserEmail = async () => {
    if (!selectedUser) return;
    clearFormError();

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setFormErrorFromError(new Error('Please enter a valid email address'), 'Please enter a valid email address');
      return;
    }

    try {
      await api.put(`/users/${selectedUser.id}`, { email: newEmail });
      setShowResetEmailModal(false);
      setNewEmail('');
      setSelectedUser((prev) => prev ? { ...prev, email: newEmail } : null);
      alert('Email has been updated successfully');
    } catch {
      setFormErrorFromError(new Error('Failed to update email'), 'Failed to update email');
    }
  };

  const handleToggleUserLock = async () => {
    if (!selectedUser) return;

    try {
      await api.put(`/users/${selectedUser.id}`, { isLocked: !selectedUser.isLocked });
      setSelectedUser((prev) => prev ? { ...prev, isLocked: !prev.isLocked } : null);
    } catch {
      alert('Failed to update user lock status');
    }
  };

  // ============================================================================
  // Role Management
  // ============================================================================

  const handleSaveRole = async () => {
    if (!editingRole) return;

    try {
      if (editingRole.id) {
        await api.put(`/admin/roles/${editingRole.id}`, editingRole);
      } else {
        await api.post('/admin/roles', editingRole);
      }
      setShowRoleModal(false);
      setEditingRole(null);
      // Refresh roles
      const response = await api.get('/admin/roles');
      setRoles(response.data.roles);
    } catch {
      alert('Failed to save role');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    const confirmed = await confirm(confirmPresets.delete('Role'));
    if (!confirmed) return;

    try {
      await api.delete(`/admin/roles/${roleId}`);
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    } catch {
      alert('Failed to delete role');
    }
  };

  // ============================================================================
  // Invitation Management
  // ============================================================================

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await api.get('/invitations');
      setInvitations(response.data.invitations || []);
    } catch {
      // Silently fail - invitations are optional
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'users') {
      fetchInvitations();
    }
  }, [activeSection, fetchInvitations]);

  const fetchInviteCapabilities = useCallback(async () => {
    try {
      setInviteCapabilitiesLoading(true);
      const response = await api.get('/admin/email-settings');
      setInviteEmailConfigured(Boolean(response.data?.data?.isConfigured));
    } catch {
      setInviteEmailConfigured(false);
    } finally {
      setInviteCapabilitiesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showInviteModal) {
      fetchInviteCapabilities();
    }
  }, [showInviteModal, fetchInviteCapabilities]);

  const handleCreateInvitation = async (sendEmail: boolean) => {
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
      fetchInvitations();
    } catch (error: unknown) {
      setFormErrorFromError(error, 'Failed to create invitation');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    const confirmed = await confirm({
      title: 'Revoke Invitation',
      message: 'Are you sure you want to revoke this invitation?',
      confirmLabel: 'Revoke',
      variant: 'warning',
    });
    if (!confirmed) return;

    try {
      await api.delete(`/invitations/${invitationId}`);
      fetchInvitations();
    } catch {
      alert('Failed to revoke invitation');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await api.post(`/invitations/${invitationId}/resend`);
      alert(`Invitation resent! New link:\n${response.data.inviteUrl}`);
      fetchInvitations();
    } catch {
      alert('Failed to resend invitation');
    }
  };

  const resetInviteModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('user');
    setInviteMessage('');
    setInviteUrl(null);
    setInviteEmailDelivery(null);
    clearFormError();
  };

  // ============================================================================
  // Client Portal Management
  // ============================================================================

  const refreshPortalData = async () => {
    try {
      setPortalLoading(true);
      const [requestsResponse, invitationsResponse] = await Promise.all([
        api.get('/portal/admin/requests').catch(() => ({ data: { requests: [] } })),
        api.get('/portal/admin/invitations').catch(() => ({ data: { invitations: [] } })),
      ]);
      setPortalRequests(requestsResponse.data.requests || []);
      setPortalInvitations(invitationsResponse.data.invitations || []);
    } finally {
      setPortalLoading(false);
    }

    await Promise.all([
      fetchPortalUsers(portalUserSearch),
      fetchPortalConversations(),
      fetchPortalSlots(),
    ]);
  };

  const handleApprovePortalRequest = async (requestId: string) => {
    try {
      await api.post(`/portal/admin/requests/${requestId}/approve`);
      showSuccess('Portal signup request approved');
      refreshPortalData();
    } catch (error: unknown) {
      notifyError(error, 'Failed to approve request');
    }
  };

  const handleRejectPortalRequest = async (requestId: string) => {
    const confirmed = await confirm({
      title: 'Reject Portal Request',
      message: 'Reject this portal request?',
      confirmLabel: 'Reject',
      variant: 'warning',
    });
    if (!confirmed) return;
    try {
      await api.post(`/portal/admin/requests/${requestId}/reject`);
      showSuccess('Portal signup request rejected');
      refreshPortalData();
    } catch (error: unknown) {
      notifyError(error, 'Failed to reject request');
    }
  };

  const handleCreatePortalInvite = async () => {
    if (!portalInviteEmail) {
      setFormErrorFromError(new Error('Portal invite email is required'), 'Portal invite email is required');
      return;
    }

    try {
      clearFormError();
      const response = await api.post('/portal/admin/invitations', {
        email: portalInviteEmail,
        contact_id: portalInviteContactId || undefined,
      });
      setPortalInviteUrl(response.data.inviteUrl);
      setPortalInviteEmail('');
      setPortalInviteContactId('');
      setSelectedPortalContact(null);
      showSuccess('Portal invitation created');
      refreshPortalData();
    } catch (error: unknown) {
      notifyError(error, 'Failed to create portal invitation');
    }
  };

  const fetchPortalUsers = useCallback(async (searchTerm?: string) => {
    try {
      setPortalUsersLoading(true);
      const response = await api.get('/portal/admin/users', {
        params: searchTerm ? { search: searchTerm } : undefined,
      });
      setPortalUsers(response.data.users || []);
    } finally {
      setPortalUsersLoading(false);
    }
  }, []);

  const fetchPortalConversations = useCallback(async () => {
    try {
      setPortalConversationsLoading(true);
      const response = await api.get('/portal/admin/conversations');
      setPortalConversations(response.data.conversations || []);
    } finally {
      setPortalConversationsLoading(false);
    }
  }, []);

  const openPortalConversation = async (threadId: string) => {
    try {
      const response = await api.get(`/portal/admin/conversations/${threadId}`);
      setSelectedPortalConversation(response.data || null);
    } catch (error: unknown) {
      notifyError(error, 'Failed to load conversation');
    }
  };

  const handleSendPortalConversationReply = async () => {
    if (!selectedPortalConversation || !portalConversationReply.trim()) {
      return;
    }

    try {
      setPortalConversationReplyLoading(true);
      await api.post(`/portal/admin/conversations/${selectedPortalConversation.thread.id}/messages`, {
        message: portalConversationReply.trim(),
        is_internal: portalConversationReplyInternal,
      });
      setPortalConversationReply('');
      setPortalConversationReplyInternal(false);
      showSuccess('Reply sent');
      await Promise.all([
        fetchPortalConversations(),
        openPortalConversation(selectedPortalConversation.thread.id),
      ]);
    } catch (error: unknown) {
      notifyError(error, 'Failed to send reply');
    } finally {
      setPortalConversationReplyLoading(false);
    }
  };

  const handleUpdatePortalConversationStatus = async (
    threadId: string,
    status: 'open' | 'closed' | 'archived'
  ) => {
    try {
      await api.patch(`/portal/admin/conversations/${threadId}`, { status });
      showSuccess(`Conversation ${status === 'open' ? 'reopened' : 'updated'}`);
      await Promise.all([fetchPortalConversations(), openPortalConversation(threadId)]);
    } catch (error: unknown) {
      notifyError(error, 'Failed to update conversation');
    }
  };

  const fetchPortalSlots = useCallback(async () => {
    try {
      setPortalSlotsLoading(true);
      const response = await api.get('/portal/admin/appointment-slots');
      setPortalSlots(response.data.slots || []);
    } finally {
      setPortalSlotsLoading(false);
    }
  }, []);

  const handleCreatePortalSlot = async () => {
    if (!portalSlotForm.pointperson_user_id || !portalSlotForm.start_time || !portalSlotForm.end_time) {
      showError('Pointperson, start time, and end time are required for a slot');
      return;
    }

    const startIso = toIsoDateTime(portalSlotForm.start_time);
    const endIso = toIsoDateTime(portalSlotForm.end_time);

    if (!startIso || !endIso) {
      showError('Invalid slot date/time values');
      return;
    }

    try {
      setPortalSlotSaving(true);
      await api.post('/portal/admin/appointment-slots', {
        pointperson_user_id: portalSlotForm.pointperson_user_id,
        case_id: portalSlotForm.case_id || null,
        title: portalSlotForm.title || null,
        details: portalSlotForm.details || null,
        location: portalSlotForm.location || null,
        start_time: startIso,
        end_time: endIso,
        capacity: portalSlotForm.capacity,
      });
      showSuccess('Appointment slot created');
      setPortalSlotForm((prev) => ({
        ...prev,
        case_id: '',
        title: '',
        details: '',
        location: '',
        start_time: '',
        end_time: '',
        capacity: 1,
      }));
      await fetchPortalSlots();
    } catch (error: unknown) {
      notifyError(error, 'Failed to create appointment slot');
    } finally {
      setPortalSlotSaving(false);
    }
  };

  const handleUpdatePortalSlotStatus = async (
    slotId: string,
    status: 'open' | 'closed' | 'cancelled'
  ) => {
    try {
      await api.patch(`/portal/admin/appointment-slots/${slotId}`, { status });
      showSuccess('Appointment slot updated');
      await fetchPortalSlots();
    } catch (error: unknown) {
      notifyError(error, 'Failed to update slot');
    }
  };

  const handleDeletePortalSlot = async (slotId: string) => {
    const confirmed = await confirm(confirmPresets.delete('Appointment Slot'));
    if (!confirmed) return;

    try {
      await api.delete(`/portal/admin/appointment-slots/${slotId}`);
      showSuccess('Appointment slot deleted');
      await fetchPortalSlots();
    } catch (error: unknown) {
      notifyError(error, 'Failed to delete slot');
    }
  };

  const handlePortalUserStatusChange = async (user: PortalUser, status: string) => {
    try {
      await api.patch(`/portal/admin/users/${user.id}`, { status });
      showSuccess(`Portal user ${status === 'active' ? 'reactivated' : 'suspended'}`);
      fetchPortalUsers(portalUserSearch);
      if (selectedPortalUser?.id === user.id) {
        setSelectedPortalUser({ ...selectedPortalUser, status });
      }
    } catch (error: unknown) {
      notifyError(error, 'Failed to update portal user status');
    }
  };

  const handlePortalUserActivity = async (user: PortalUser) => {
    try {
      setSelectedPortalUser(user);
      setPortalActivityLoading(true);
      const response = await api.get(`/portal/admin/users/${user.id}/activity`);
      setPortalUserActivity(response.data.activity || []);
    } finally {
      setPortalActivityLoading(false);
    }
  };

  const handlePortalPasswordReset = async () => {
    if (!portalResetTarget || !portalResetPassword) {
      showError('Password is required');
      return;
    }
    if (portalResetPassword.length < 8) {
      showError('Password must be at least 8 characters');
      return;
    }
    if (portalResetPassword !== portalResetConfirmPassword) {
      showError('Passwords do not match');
      return;
    }
    try {
      setPortalResetLoading(true);
      await api.post('/portal/admin/reset-password', {
        portalUserId: portalResetTarget.id,
        password: portalResetPassword,
      });
      setPortalResetPassword('');
      setPortalResetConfirmPassword('');
      setPortalResetTarget(null);
      setShowPortalResetModal(false);
      showSuccess('Portal user password updated');
    } catch (error: unknown) {
      notifyError(error, 'Failed to reset password');
    } finally {
      setPortalResetLoading(false);
    }
  };

  const searchPortalContacts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPortalContactResults([]);
      return;
    }
    setPortalContactLoading(true);
    try {
      const response = await api.get('/contacts', { params: { search: query, limit: 5 } });
      setPortalContactResults(response.data.data || []);
    } catch {
      setPortalContactResults([]);
    } finally {
      setPortalContactLoading(false);
    }
  }, []);

  const handlePortalSlotFormChange = (field: string, value: string | number) => {
    setPortalSlotForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (activeSection !== 'portal') return;
    const debounceTimer = setTimeout(() => {
      fetchPortalUsers(portalUserSearch);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [activeSection, portalUserSearch, fetchPortalUsers]);

  useEffect(() => {
    if (activeSection !== 'portal') return;
    const debounceTimer = setTimeout(() => {
      searchPortalContacts(portalContactSearch);
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [activeSection, portalContactSearch, searchPortalContacts]);

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <NeoBrutalistLayout pageTitle="ADMIN SETTINGS">
        <div className="min-h-screen p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--loop-blue)]"></div>
        </div>
      </NeoBrutalistLayout>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  const visibleTabs = showAdvancedSettings
    ? adminSettingsTabs
    : adminSettingsTabs.filter((tab) => tab.level === 'basic');
  const activeTabLabel =
    adminSettingsTabs.find((tab) => tab.id === activeSection)?.label || 'Dashboard';

  return (
    <NeoBrutalistLayout pageTitle="ADMIN SETTINGS">
      <div className="min-h-screen bg-[var(--app-bg)] p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-[var(--app-text)] uppercase">Admin Settings</h1>
                <p className="mt-2 text-[var(--app-text-muted)]">
                  Configure organization settings, branding, users, roles, and security.
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-bold bg-[var(--loop-purple)] text-black border-2 border-[var(--app-border)] uppercase">
                Admin Only
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6 border-b-2 border-[var(--app-border)] bg-[var(--app-bg)] sticky top-0 z-10">
            <div className="flex items-center justify-between pb-3">
              <p className="text-sm text-[var(--app-text-muted)]">
                Showing {showAdvancedSettings ? 'all sections' : 'basic sections'}. You are here:{' '}
                <span className="font-bold text-[var(--app-text)]">{activeTabLabel}</span>
              </p>
              <button
                type="button"
                onClick={() => setShowAdvancedSettings((prev) => !prev)}
                className="px-3 py-2 text-xs font-bold uppercase border-2 border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-muted)]"
              >
                {showAdvancedSettings ? 'Hide Advanced' : 'Show Advanced'}
              </button>
            </div>
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`py-3 px-4 border-b-4 font-bold text-sm uppercase whitespace-nowrap transition-colors ${activeSection === tab.id
                    ? 'border-[var(--loop-yellow)] text-[var(--app-text)] bg-[var(--loop-yellow)]'
                    : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Dashboard Section */}
          {activeSection === 'dashboard' && <DashboardSection onShowInvite={() => setShowInviteModal(true)} />}

          {/* Organization Section */}
          {activeSection === 'organization' && (

            <OrganizationSection
              config={config}
              onChange={handleChange}
              onAddressChange={handleAddressChange}
              onPhoneChange={handlePhoneChange}
              onSave={handleSaveOrganization}
              isSaving={isSaving}
              saveStatus={saveStatus}
              isDirty={isOrganizationDirty}
              lastSavedAt={organizationLastSavedAt}
            />
          )}

          {/* Branding Section */}
          {activeSection === 'branding' && (
            <BrandingSection
              branding={branding}
              onBrandingChange={handleBrandingChange}
              onImageUpload={handleImageUpload}
              onRemoveIcon={() => setBranding((prev) => ({ ...prev, appIcon: null }))}
              onRemoveFavicon={() => setBranding((prev) => ({ ...prev, favicon: null }))}
              iconInputRef={iconInputRef}
              faviconInputRef={faviconInputRef}
              onSave={handleSaveBranding}
              isSaving={isSaving}
              saveStatus={saveStatus}
              isDirty={isBrandingDirty}
              lastSavedAt={brandingLastSavedAt}
            />
          )}

          {/* Users & Security Section */}
          {activeSection === 'users' && (
            <>
              <UsersSection
                userSearchQuery={userSearchQuery}
                onSearchChange={setUserSearchQuery}
                isSearching={isSearching}
                userSearchResults={userSearchResults}
                onSelectUser={fetchUserSecurityInfo}
                onShowInvite={() => setShowInviteModal(true)}
                onGoToRoles={() => setActiveSection('roles')}
                invitations={invitations}
                onResendInvitation={handleResendInvitation}
                onRevokeInvitation={handleRevokeInvitation}
              />
              <div className="mt-6">
                <RegistrationSettingsSection />
              </div>
            </>
          )}

          {/* Client Portal Section */}
          {activeSection === 'portal' && (
            <PortalSection
              portalInviteUrl={portalInviteUrl}
              portalLoading={portalLoading}
              portalRequests={portalRequests}
              portalInviteEmail={portalInviteEmail}
              portalContactSearch={portalContactSearch}
              portalContactLoading={portalContactLoading}
              portalContactResults={portalContactResults}
              selectedPortalContact={selectedPortalContact}
              portalInvitations={portalInvitations}
              portalUsers={portalUsers}
              portalUsersLoading={portalUsersLoading}
              portalUserSearch={portalUserSearch}
              selectedPortalUser={selectedPortalUser}
              portalUserActivity={portalUserActivity}
              portalActivityLoading={portalActivityLoading}
              formError={formError}
              onRefreshPortal={refreshPortalData}
              onApproveRequest={handleApprovePortalRequest}
              onRejectRequest={handleRejectPortalRequest}
              onPortalInviteEmailChange={setPortalInviteEmail}
              onPortalContactSearchChange={setPortalContactSearch}
              onSelectPortalContact={(contact) => {
                setSelectedPortalContact(contact);
                setPortalInviteContactId(contact.contact_id);
                if (contact.email) {
                  setPortalInviteEmail(contact.email);
                }
                setPortalContactResults([]);
                setPortalContactSearch('');
              }}
              onClearPortalContact={() => {
                setSelectedPortalContact(null);
                setPortalInviteContactId('');
              }}
              onCreateInvitation={handleCreatePortalInvite}
              onPortalUserSearchChange={setPortalUserSearch}
              onRefreshUsers={() => fetchPortalUsers(portalUserSearch)}
              onViewUserActivity={handlePortalUserActivity}
              onToggleUserStatus={handlePortalUserStatusChange}
              onOpenResetModal={(user) => {
                setPortalResetTarget(user);
                setPortalResetPassword('');
                setPortalResetConfirmPassword('');
                setShowPortalResetModal(true);
              }}
              portalConversationsLoading={portalConversationsLoading}
              portalConversations={portalConversations}
              selectedPortalConversation={selectedPortalConversation}
              portalConversationReply={portalConversationReply}
              portalConversationReplyInternal={portalConversationReplyInternal}
              portalConversationReplyLoading={portalConversationReplyLoading}
              onRefreshPortalConversations={fetchPortalConversations}
              onOpenPortalConversation={openPortalConversation}
              onPortalConversationReplyChange={setPortalConversationReply}
              onPortalConversationReplyInternalChange={setPortalConversationReplyInternal}
              onSendPortalConversationReply={handleSendPortalConversationReply}
              onUpdatePortalConversationStatus={handleUpdatePortalConversationStatus}
              portalSlotsLoading={portalSlotsLoading}
              portalSlots={portalSlots}
              portalSlotSaving={portalSlotSaving}
              portalSlotForm={portalSlotForm}
              onPortalSlotFormChange={handlePortalSlotFormChange}
              onCreatePortalSlot={handleCreatePortalSlot}
              onRefreshPortalSlots={fetchPortalSlots}
              onUpdatePortalSlotStatus={handleUpdatePortalSlotStatus}
              onDeletePortalSlot={handleDeletePortalSlot}
            />
          )}

          {/* Roles & Permissions Section */}
          {activeSection === 'roles' && (
            <RolesSection
              roles={roles}
              onCreateRole={() => {
                setEditingRole({
                  id: '',
                  name: '',
                  description: '',
                  permissions: [],
                  isSystem: false,
                  userCount: 0
                });
                setShowRoleModal(true);
              }}
              onEditRole={(role) => {
                setEditingRole(role);
                setShowRoleModal(true);
              }}
              onDeleteRole={handleDeleteRole}
            />
          )}

          {/* Audit Logs Section */}
          {activeSection === 'audit_logs' && <AuditLogsSection />}

          {/* Email Settings Section */}
          {activeSection === 'email' && <EmailSettingsSection />}

          {/* Messaging Settings Section */}
          {activeSection === 'messaging' && <TwilioSettingsSection />}

          {/* Outcome Definitions Section */}
          {activeSection === 'outcomes' && <OutcomeDefinitionsSection />}

          {/* Other Settings Section */}
          {activeSection === 'other' && <OtherSettingsSection />}
        </div>

        <UserSecurityModal
          open={showSecurityModal}
          selectedUser={selectedUser}
          userAuditLogs={userAuditLogs}
          onClose={() => setShowSecurityModal(false)}
          onOpenResetPassword={() => setShowResetPasswordModal(true)}
          onOpenResetEmail={() => {
            if (!selectedUser) return;
            setNewEmail(selectedUser.email);
            setShowResetEmailModal(true);
          }}
          onToggleUserLock={handleToggleUserLock}
        />

        <PortalResetPasswordModal
          open={showPortalResetModal}
          target={portalResetTarget}
          password={portalResetPassword}
          confirmPassword={portalResetConfirmPassword}
          loading={portalResetLoading}
          onPasswordChange={setPortalResetPassword}
          onConfirmPasswordChange={setPortalResetConfirmPassword}
          onClose={() => {
            setShowPortalResetModal(false);
            setPortalResetTarget(null);
            setPortalResetPassword('');
            setPortalResetConfirmPassword('');
          }}
          onSubmit={handlePortalPasswordReset}
        />

        {/* Reset Password Modal */}
        {showResetPasswordModal && selectedUser && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowResetPasswordModal(false)} />
              <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-app-text-heading mb-4">
                  Reset Password for {selectedUser.firstName} {selectedUser.lastName}
                </h3>

                <ErrorBanner message={formError} className="mb-4" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-app-text-label mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text-label mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPasswordModal(false);
                      setNewPassword('');
                      setConfirmPassword('');
                      clearFormError();
                    }}
                    className="px-4 py-2 text-app-text-muted hover:bg-app-surface-muted rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetUserPassword}
                    className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Email Modal */}
        {showResetEmailModal && selectedUser && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowResetEmailModal(false)} />
              <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-app-text-heading mb-4">
                  Change Email for {selectedUser.firstName} {selectedUser.lastName}
                </h3>

                <ErrorBanner message={formError} className="mb-4" />

                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">New Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetEmailModal(false);
                      setNewEmail('');
                      clearFormError();
                    }}
                    className="px-4 py-2 text-app-text-muted hover:bg-app-surface-muted rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetUserEmail}
                    className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
                  >
                    Update Email
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role Edit Modal */}
        {showRoleModal && editingRole && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowRoleModal(false)} />
              <div className="relative bg-app-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <h3 className="text-lg font-semibold text-app-text-heading mb-4">
                  {editingRole.id ? 'Edit Role' : 'Create Role'}
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-app-text-label mb-1">Role Name</label>
                    <input
                      type="text"
                      value={editingRole.name}
                      onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                      placeholder="Enter role name"
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                      disabled={editingRole.isSystem}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-app-text-label mb-1">Description</label>
                    <input
                      type="text"
                      value={editingRole.description}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                      placeholder="Describe this role's purpose"
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-app-text-label mb-2">Permissions</label>
                    <div className="border border-app-border rounded-lg p-4 max-h-64 overflow-y-auto">
                      {Object.entries(
                        defaultPermissions.reduce((acc, perm) => {
                          if (!acc[perm.category]) acc[perm.category] = [];
                          acc[perm.category].push(perm);
                          return acc;
                        }, {} as Record<string, typeof defaultPermissions>)
                      ).map(([category, perms]) => (
                        <div key={category} className="mb-4 last:mb-0">
                          <h4 className="font-medium text-app-text mb-2">{category}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {perms.map((perm) => (
                              <label key={perm.key} className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={editingRole.permissions.includes(perm.key)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditingRole({
                                        ...editingRole,
                                        permissions: [...editingRole.permissions, perm.key],
                                      });
                                    } else {
                                      setEditingRole({
                                        ...editingRole,
                                        permissions: editingRole.permissions.filter((p) => p !== perm.key),
                                      });
                                    }
                                  }}
                                  className="mr-2"
                                />
                                <span className="text-sm text-app-text-muted">{perm.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleModal(false);
                      setEditingRole(null);
                    }}
                    className="px-4 py-2 text-app-text-muted hover:bg-app-surface-muted rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRole}
                    className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
                  >
                    {editingRole.id ? 'Save Changes' : 'Create Role'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invite User Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black bg-opacity-50" onClick={resetInviteModal} />
              <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-app-text-heading mb-4">
                  Invite New User
                </h3>

                <ErrorBanner message={formError} className="mb-4" />

                {inviteUrl ? (
                  <div className="space-y-4">
                    <div className={`p-4 border rounded-lg ${
                      inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className={`flex items-center gap-2 font-medium mb-2 ${
                        inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                          ? 'text-amber-800'
                          : 'text-green-800'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                          ? 'Invitation Created (Email Not Sent)'
                          : 'Invitation Created'}
                      </div>
                      <p className={`text-sm ${
                        inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                          ? 'text-amber-700'
                          : 'text-green-700'
                      }`}>
                        {inviteEmailDelivery?.requested && inviteEmailDelivery?.sent
                          ? <>Invitation email sent to <strong>{inviteEmail}</strong>. You can also share this link manually:</>
                          : <>Share this link with <strong>{inviteEmail}</strong> to allow them to create their account:</>}
                      </p>
                      {inviteEmailDelivery?.reason && (
                        <p className="mt-2 text-xs text-amber-800">{inviteEmailDelivery.reason}</p>
                      )}
                    </div>

                    <div className="p-3 bg-app-surface-muted rounded-lg">
                      <input
                        type="text"
                        value={inviteUrl}
                        readOnly
                        title="Invitation URL"
                        aria-label="Invitation URL"
                        className="w-full bg-transparent text-sm text-app-text-muted border-none focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                        showSuccess('Invitation link copied');
                      }}
                      className="w-full px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
                    >
                      Copy Link
                    </button>

                    <button
                      type="button"
                      onClick={resetInviteModal}
                      className="w-full px-4 py-2 text-app-text-muted hover:bg-app-surface-muted rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-app-text-label mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-app-text-label mb-1">
                        Role *
                      </label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        title="Select user role"
                        className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Administrator</option>
                        <option value="readonly">Read Only</option>
                      </select>
                      <p className="mt-1 text-xs text-app-text-muted">
                        The user will be assigned this role when they create their account
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-app-text-label mb-1">
                        Personal Message (optional)
                      </label>
                      <textarea
                        value={inviteMessage}
                        onChange={(e) => setInviteMessage(e.target.value)}
                        placeholder="Welcome to our team! Looking forward to working with you."
                        rows={3}
                        className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                      />
                    </div>
                    {!inviteEmailConfigured && !inviteCapabilitiesLoading && (
                      <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        Email delivery is not configured. You can still create and share invite links.
                      </div>
                    )}

                    <div className="flex justify-end space-x-3 mt-6">
                      <button
                        type="button"
                        onClick={resetInviteModal}
                        className="px-4 py-2 text-app-text-muted hover:bg-app-surface-muted rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateInvitation(false)}
                        disabled={isCreatingInvite || !inviteEmail}
                        className="px-4 py-2 bg-app-surface-muted text-app-text rounded-lg hover:bg-app-surface-muted disabled:opacity-50"
                      >
                        {isCreatingInvite ? 'Creating...' : 'Create Link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateInvitation(true)}
                        disabled={isCreatingInvite || !inviteEmail || inviteCapabilitiesLoading || !inviteEmailConfigured}
                        className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
                      >
                        {isCreatingInvite ? 'Creating...' : 'Create + Send Email'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
      </div>
    </NeoBrutalistLayout>
  );
}
