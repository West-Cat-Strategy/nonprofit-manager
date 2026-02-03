/**
 * Admin Settings Page
 * Admin-only settings for configuring organization-wide preferences, branding,
 * user management, roles, and security settings
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useBranding } from '../contexts/BrandingContext';
import Avatar from '../components/Avatar';
import { defaultBranding, type BrandingConfig } from '../types/branding';

// ============================================================================
// Interfaces
// ============================================================================

interface OrganizationConfig {
  name: string;
  email: string;
  phone: string;
  website: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  timezone: string;
  dateFormat: string;
  currency: string;
  fiscalYearStart: string;
  measurementSystem: 'metric' | 'imperial';
  phoneFormat: 'canadian' | 'us' | 'international';
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

interface UserSearchResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UserSecurityInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  lastPasswordChange: string | null;
  failedLoginAttempts: number;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

interface UserInvitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  isRevoked: boolean;
  message: string | null;
  createdAt: string;
  createdByName?: string;
}

interface PortalSignupRequest {
  id: string;
  email: string;
  status: string;
  requested_at: string;
  reviewed_at?: string | null;
  contact_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface PortalInvitation {
  id: string;
  email: string;
  contact_id?: string | null;
  expires_at: string;
  created_at: string;
  accepted_at?: string | null;
}

interface PortalUser {
  id: string;
  email: string;
  status: string;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  contact_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

interface PortalActivity {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
}

interface PortalContactLookup {
  contact_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
}

// ============================================================================
// Canadian Defaults
// ============================================================================

const defaultConfig: OrganizationConfig = {
  name: '',
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
};

// ============================================================================
// Constants - Canadian-centric options
// ============================================================================

const timezones = [
  { value: 'America/Vancouver', label: 'Pacific Time (PT) - Vancouver' },
  { value: 'America/Edmonton', label: 'Mountain Time (MT) - Edmonton' },
  { value: 'America/Regina', label: 'Central Time (CT) - Saskatchewan' },
  { value: 'America/Winnipeg', label: 'Central Time (CT) - Winnipeg' },
  { value: 'America/Toronto', label: 'Eastern Time (ET) - Toronto' },
  { value: 'America/Halifax', label: 'Atlantic Time (AT) - Halifax' },
  { value: 'America/St_Johns', label: "Newfoundland Time (NT) - St. John's" },
  { value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
  { value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
  { value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
  { value: 'UTC', label: 'UTC' },
];

const dateFormats = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-12-31) - ISO Standard' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2024) - US Style' },
  { value: 'MMMM D, YYYY', label: 'MMMM D, YYYY (December 31, 2024)' },
];

const currencies = [
  { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: '$' },
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (\u20AC)', symbol: '\u20AC' },
  { value: 'GBP', label: 'British Pound (\u00A3)', symbol: '\u00A3' },
  { value: 'AUD', label: 'Australian Dollar (A$)', symbol: '$' },
];

const provinces = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
];

const months = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const defaultPermissions = [
  { key: 'contacts.view', label: 'View Contacts', category: 'Contacts' },
  { key: 'contacts.create', label: 'Create Contacts', category: 'Contacts' },
  { key: 'contacts.edit', label: 'Edit Contacts', category: 'Contacts' },
  { key: 'contacts.delete', label: 'Delete Contacts', category: 'Contacts' },
  { key: 'donations.view', label: 'View Donations', category: 'Donations' },
  { key: 'donations.create', label: 'Create Donations', category: 'Donations' },
  { key: 'donations.edit', label: 'Edit Donations', category: 'Donations' },
  { key: 'donations.delete', label: 'Delete Donations', category: 'Donations' },
  { key: 'volunteers.view', label: 'View Volunteers', category: 'Volunteers' },
  { key: 'volunteers.create', label: 'Create Volunteers', category: 'Volunteers' },
  { key: 'volunteers.edit', label: 'Edit Volunteers', category: 'Volunteers' },
  { key: 'volunteers.delete', label: 'Delete Volunteers', category: 'Volunteers' },
  { key: 'events.view', label: 'View Events', category: 'Events' },
  { key: 'events.create', label: 'Create Events', category: 'Events' },
  { key: 'events.edit', label: 'Edit Events', category: 'Events' },
  { key: 'events.delete', label: 'Delete Events', category: 'Events' },
  { key: 'cases.view', label: 'View Cases', category: 'Cases' },
  { key: 'cases.create', label: 'Create Cases', category: 'Cases' },
  { key: 'cases.edit', label: 'Edit Cases', category: 'Cases' },
  { key: 'cases.delete', label: 'Delete Cases', category: 'Cases' },
  { key: 'reports.view', label: 'View Reports', category: 'Reports' },
  { key: 'reports.export', label: 'Export Reports', category: 'Reports' },
  { key: 'admin.users', label: 'Manage Users', category: 'Admin' },
  { key: 'admin.roles', label: 'Manage Roles', category: 'Admin' },
  { key: 'admin.settings', label: 'Manage Settings', category: 'Admin' },
];

// ============================================================================
// Helper Functions
// ============================================================================

const formatCanadianPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

const formatCanadianPostalCode = (postalCode: string): string => {
  const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return postalCode;
};

const validatePostalCode = (postalCode: string, country: string): boolean => {
  if (country === 'Canada') {
    const pattern = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
    return pattern.test(postalCode);
  }
  return true;
};

// ============================================================================
// Main Component
// ============================================================================

export default function AdminSettings() {
  const { showSuccess, showError } = useToast();
  const { setBranding: setGlobalBranding } = useBranding();

  // State
  const [activeSection, setActiveSection] = useState<string>('organization');
  const [config, setConfig] = useState<OrganizationConfig>(defaultConfig);
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

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

  // Form states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Refs
  const iconInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configResponse, brandingResponse, rolesResponse] = await Promise.all([
          api.get('/auth/preferences').catch(() => ({ data: { preferences: {} } })),
          api.get('/admin/branding').catch(() => ({ data: defaultBranding })),
          api.get('/admin/roles').catch(() => ({ data: { roles: [] } })),
        ]);

        const prefs = configResponse.data.preferences;
        if (prefs?.organization) {
          setConfig({ ...defaultConfig, ...prefs.organization });
        }

        if (brandingResponse.data) {
          setBranding({ ...defaultBranding, ...brandingResponse.data });
        }

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
        const [requestsResponse, invitationsResponse, usersResponse] = await Promise.all([
          api.get('/portal/admin/requests').catch(() => ({ data: { requests: [] } })),
          api.get('/portal/admin/invitations').catch(() => ({ data: { invitations: [] } })),
          api.get('/portal/admin/users').catch(() => ({ data: { users: [] } })),
        ]);

        setPortalRequests(requestsResponse.data.requests || []);
        setPortalInvitations(invitationsResponse.data.invitations || []);
        setPortalUsers(usersResponse.data.users || []);
      } finally {
        setPortalLoading(false);
        setPortalUsersLoading(false);
      }
    };

    fetchPortalData();
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
    setFormError(null);

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }

    try {
      await api.put(`/users/${selectedUser.id}/password`, { password: newPassword });
      setShowResetPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      alert('Password has been reset successfully');
    } catch {
      setFormError('Failed to reset password');
    }
  };

  const handleResetUserEmail = async () => {
    if (!selectedUser) return;
    setFormError(null);

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setFormError('Please enter a valid email address');
      return;
    }

    try {
      await api.put(`/users/${selectedUser.id}`, { email: newEmail });
      setShowResetEmailModal(false);
      setNewEmail('');
      setSelectedUser((prev) => prev ? { ...prev, email: newEmail } : null);
      alert('Email has been updated successfully');
    } catch {
      setFormError('Failed to update email');
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
    if (!confirm('Are you sure you want to delete this role?')) return;

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

  const handleCreateInvitation = async () => {
    if (!inviteEmail) {
      setFormError('Email is required');
      return;
    }

    setIsCreatingInvite(true);
    setFormError(null);

    try {
      const response = await api.post('/invitations', {
        email: inviteEmail,
        role: inviteRole,
        message: inviteMessage || undefined,
      });

      setInviteUrl(response.data.inviteUrl);
      fetchInvitations();
    } catch (error: any) {
      setFormError(error.response?.data?.error || 'Failed to create invitation');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

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
    setFormError(null);
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

    fetchPortalUsers(portalUserSearch);
  };

  const handleApprovePortalRequest = async (requestId: string) => {
    try {
      await api.post(`/portal/admin/requests/${requestId}/approve`);
      showSuccess('Portal signup request approved');
      refreshPortalData();
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleRejectPortalRequest = async (requestId: string) => {
    if (!confirm('Reject this portal request?')) return;
    try {
      await api.post(`/portal/admin/requests/${requestId}/reject`);
      showSuccess('Portal signup request rejected');
      refreshPortalData();
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to reject request');
    }
  };

  const handleCreatePortalInvite = async () => {
    if (!portalInviteEmail) {
      setFormError('Portal invite email is required');
      return;
    }

    try {
      setFormError(null);
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
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to create portal invitation');
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

  const handlePortalUserStatusChange = async (user: PortalUser, status: string) => {
    try {
      await api.patch(`/portal/admin/users/${user.id}`, { status });
      showSuccess(`Portal user ${status === 'active' ? 'reactivated' : 'suspended'}`);
      fetchPortalUsers(portalUserSearch);
      if (selectedPortalUser?.id === user.id) {
        setSelectedPortalUser({ ...selectedPortalUser, status });
      }
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to update portal user status');
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
    } catch (error: any) {
      showError(error.response?.data?.error || 'Failed to reset password');
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
  // Render Helpers
  // ============================================================================

  const renderSaveButton = (onSave: () => void) => (
    <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
      <div>
        {saveStatus === 'success' && (
          <span className="text-green-600 text-sm flex items-center">
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Settings saved successfully
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-red-600 text-sm flex items-center">
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Failed to save settings
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
              <p className="mt-2 text-gray-600">
                Configure organization settings, branding, users, roles, and security.
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
              Admin Only
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'organization', label: 'Organization' },
              { id: 'branding', label: 'Branding' },
              { id: 'users', label: 'Users & Security' },
              { id: 'portal', label: 'Client Portal' },
              { id: 'roles', label: 'Roles & Permissions' },
              { id: 'other', label: 'Other Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeSection === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Organization Section */}
        {activeSection === 'organization' && (
          <div className="space-y-6">
            {/* Organization Profile Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Organization Profile</h2>
                <p className="text-sm text-gray-500 mt-1">Basic information about your organization</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Your Nonprofit Name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={config.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="contact@nonprofit.org"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={config.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(604) 555-1234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    value={config.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://www.nonprofit.org"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Address Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Address</h2>
                <p className="text-sm text-gray-500 mt-1">Your organization&apos;s physical address</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={config.address.line1}
                    onChange={(e) => handleAddressChange('line1', e.target.value)}
                    placeholder="123 Main Street"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 2
                  </label>
                  <input
                    type="text"
                    value={config.address.line2}
                    onChange={(e) => handleAddressChange('line2', e.target.value)}
                    placeholder="Suite 100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={config.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      placeholder="Vancouver"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Province/State
                    </label>
                    {config.address.country === 'Canada' ? (
                      <select
                        value={config.address.province}
                        onChange={(e) => handleAddressChange('province', e.target.value)}
                        title="Select province"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select...</option>
                        {provinces.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={config.address.province}
                        onChange={(e) => handleAddressChange('province', e.target.value)}
                        placeholder="State"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {config.address.country === 'Canada' ? 'Postal Code' : 'ZIP Code'}
                    </label>
                    <input
                      type="text"
                      value={config.address.postalCode}
                      onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                      placeholder={config.address.country === 'Canada' ? 'V6B 1A1' : '12345'}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        config.address.postalCode && !validatePostalCode(config.address.postalCode, config.address.country)
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country
                    </label>
                    <select
                      value={config.address.country}
                      onChange={(e) => handleAddressChange('country', e.target.value)}
                      title="Select country"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Canada">Canada</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Regional Settings Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Regional Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Configure timezone, date format, and currency</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      value={config.timezone}
                      onChange={(e) => handleChange('timezone', e.target.value)}
                      title="Select timezone"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date Format
                    </label>
                    <select
                      value={config.dateFormat}
                      onChange={(e) => handleChange('dateFormat', e.target.value)}
                      title="Select date format"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {dateFormats.map((df) => (
                        <option key={df.value} value={df.value}>
                          {df.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={config.currency}
                      onChange={(e) => handleChange('currency', e.target.value)}
                      title="Select currency"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {currencies.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fiscal Year Starts
                    </label>
                    <select
                      value={config.fiscalYearStart}
                      onChange={(e) => handleChange('fiscalYearStart', e.target.value)}
                      title="Select fiscal year start month"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {months.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Measurement System
                    </label>
                    <select
                      value={config.measurementSystem}
                      onChange={(e) => handleChange('measurementSystem', e.target.value)}
                      title="Select measurement system"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="metric">Metric (km, kg, L)</option>
                      <option value="imperial">Imperial (mi, lb, gal)</option>
                    </select>
                  </div>
                </div>
              </div>

              {renderSaveButton(handleSaveOrganization)}
            </div>
          </div>
        )}

        {/* Branding Section */}
        {activeSection === 'branding' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Application Branding</h2>
                <p className="text-sm text-gray-500 mt-1">Customise the look and feel of your application</p>
              </div>

              <div className="p-6 space-y-6">
                {/* App Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application Name
                  </label>
                  <input
                    type="text"
                    value={branding.appName}
                    onChange={(e) => handleBrandingChange('appName', e.target.value)}
                    placeholder="Nonprofit Manager"
                    className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-gray-500">This appears in the navigation bar and browser tab</p>
                </div>

                {/* App Icon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Application Icon
                  </label>
                  <div className="flex items-start space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
                      {branding.appIcon ? (
                        <img src={branding.appIcon} alt="App icon" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-gray-400">N</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={iconInputRef}
                        accept="image/*"
                        className="hidden"
                        title="Upload application icon"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'icon')}
                      />
                      <button
                        type="button"
                        onClick={() => iconInputRef.current?.click()}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Upload Icon
                      </button>
                      {branding.appIcon && (
                        <button
                          type="button"
                          onClick={() => setBranding((prev) => ({ ...prev, appIcon: null }))}
                          className="ml-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                      <p className="mt-1 text-sm text-gray-500">Recommended: 64x64px, PNG or SVG</p>
                    </div>
                  </div>
                </div>

                {/* Favicon */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Favicon
                  </label>
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center border border-gray-300 overflow-hidden">
                      {branding.favicon ? (
                        <img src={branding.favicon} alt="Favicon" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-gray-400">N</span>
                      )}
                    </div>
                    <div>
                      <input
                        type="file"
                        ref={faviconInputRef}
                        accept="image/x-icon,image/png,image/svg+xml"
                        className="hidden"
                        title="Upload favicon"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'favicon')}
                      />
                      <button
                        type="button"
                        onClick={() => faviconInputRef.current?.click()}
                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Upload Favicon
                      </button>
                      {branding.favicon && (
                        <button
                          type="button"
                          onClick={() => setBranding((prev) => ({ ...prev, favicon: null }))}
                          className="ml-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                      <p className="mt-1 text-sm text-gray-500">Recommended: 32x32px, ICO or PNG</p>
                    </div>
                  </div>
                </div>

                {/* Colours */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Colour
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={branding.primaryColour}
                        onChange={(e) => handleBrandingChange('primaryColour', e.target.value)}
                        title="Select primary colour"
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={branding.primaryColour}
                        onChange={(e) => handleBrandingChange('primaryColour', e.target.value)}
                        placeholder="#2563eb"
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Secondary Colour
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={branding.secondaryColour}
                        onChange={(e) => handleBrandingChange('secondaryColour', e.target.value)}
                        title="Select secondary colour"
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={branding.secondaryColour}
                        onChange={(e) => handleBrandingChange('secondaryColour', e.target.value)}
                        placeholder="#7c3aed"
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview
                  </label>
                  <div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white rounded flex items-center justify-center overflow-hidden">
                      {branding.appIcon ? (
                        <img src={branding.appIcon} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold" style={{ color: branding.primaryColour }}>
                          {branding.appName[0] || 'N'}
                        </span>
                      )}
                    </div>
                    <span className="text-white font-semibold">{branding.appName || 'Nonprofit Manager'}</span>
                  </div>
                </div>
              </div>

              {renderSaveButton(handleSaveBranding)}
            </div>
          </div>
        )}

        {/* Users & Security Section */}
        {activeSection === 'users' && (
          <div className="space-y-6">
            {/* Quick User Lookup */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">User Lookup</h2>
                <p className="text-sm text-gray-500 mt-1">Search for users to manage their security settings</p>
              </div>

              <div className="p-6">
                <div className="relative">
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"
                  />
                  <svg
                    className="absolute left-3 top-3.5 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {isSearching && (
                    <div className="absolute right-3 top-3.5">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {userSearchResults.length > 0 && (
                  <div className="mt-4 border border-gray-200 rounded-lg divide-y divide-gray-200">
                    {userSearchResults.map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        className="w-full p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between text-left"
                        onClick={() => fetchUserSecurityInfo(user.id)}
                      >
                        <div className="flex items-center">
                          <Avatar
                            src={user.profilePicture}
                            firstName={user.firstName}
                            lastName={user.lastName}
                            size="md"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {userSearchQuery && !isSearching && userSearchResults.length === 0 && (
                  <div className="mt-4 text-center py-8 text-gray-500">
                    No users found matching &quot;{userSearchQuery}&quot;
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Invite User
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link
                    to="/users"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">All Users</div>
                      <div className="text-sm text-gray-500">View and manage all users</div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setActiveSection('roles')}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">Roles & Permissions</div>
                      <div className="text-sm text-gray-500">Manage access levels</div>
                    </div>
                  </button>

                  <Link
                    to="/admin/audit-logs"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">Audit Logs</div>
                      <div className="text-sm text-gray-500">View system activity</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Security Settings</h2>
                <p className="text-sm text-gray-500 mt-1">Organization-wide security policies</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Require Strong Passwords</div>
                    <div className="text-sm text-gray-500">Minimum 8 characters with uppercase, lowercase, number, and symbol</div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Enabled</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Account Lockout</div>
                    <div className="text-sm text-gray-500">Lock accounts after 5 failed login attempts</div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Enabled</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Session Timeout</div>
                    <div className="text-sm text-gray-500">Automatically log out after 24 hours of inactivity</div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">24 hours</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Two-Factor Authentication</div>
                    <div className="text-sm text-gray-500">Require 2FA for admin accounts</div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Coming Soon</span>
                </div>
              </div>
            </div>

            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900">Pending Invitations</h2>
                  <p className="text-sm text-gray-500 mt-1">Users who have been invited but haven&apos;t created their account yet</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{invitation.email}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            invitation.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {invitation.role}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Invited {new Date(invitation.createdAt).toLocaleDateString('en-CA')}
                          {invitation.createdByName && ` by ${invitation.createdByName}`}
                          {' '}&bull;{' '}
                          Expires {new Date(invitation.expiresAt).toLocaleDateString('en-CA')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResendInvitation(invitation.id)}
                          className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Resend
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Client Portal Section */}
        {activeSection === 'portal' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Client Portal Access</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Approve client signup requests and issue portal invitations.
                </p>
              </div>
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Manual distribution</div>
                    <div className="text-sm text-gray-500">
                      No SMTP configured. Copy invite links and share them securely.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={refreshPortalData}
                    className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Refresh
                  </button>
                </div>
                {portalInviteUrl && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="text-sm font-medium text-blue-900">Latest invite link</div>
                    <div className="mt-1 text-sm text-blue-800 break-all">{portalInviteUrl}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Signup Requests</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Requests from clients waiting for approval.
                </p>
              </div>
              <div className="p-6">
                {portalLoading ? (
                  <p className="text-sm text-gray-500">Loading requests...</p>
                ) : portalRequests.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending requests.</p>
                ) : (
                  <div className="space-y-4">
                    {portalRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-200 rounded-lg p-4"
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.first_name || request.last_name
                              ? `${request.first_name || ''} ${request.last_name || ''}`.trim()
                              : request.email}
                          </div>
                          <div className="text-sm text-gray-500">{request.email}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Requested {new Date(request.requested_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprovePortalRequest(request.id)}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectPortalRequest(request.id)}
                            className="px-3 py-1.5 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Invite a Client</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Create a portal invitation for a client.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                    <input
                      type="email"
                      value={portalInviteEmail}
                      onChange={(e) => setPortalInviteEmail(e.target.value)}
                      placeholder="client@example.org"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Existing Contact (optional)</label>
                    <input
                      type="text"
                      value={portalContactSearch}
                      onChange={(e) => setPortalContactSearch(e.target.value)}
                      placeholder="Search contacts by name or email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    {portalContactLoading && (
                      <div className="text-xs text-gray-500 mt-2">Searching contacts...</div>
                    )}
                    {portalContactResults.length > 0 && (
                      <div className="mt-2 border border-gray-200 rounded-lg divide-y">
                        {portalContactResults.map((contact) => (
                          <button
                            key={contact.contact_id}
                            type="button"
                            onClick={() => {
                              setSelectedPortalContact(contact);
                              setPortalInviteContactId(contact.contact_id);
                              if (contact.email) {
                                setPortalInviteEmail(contact.email);
                              }
                              setPortalContactResults([]);
                              setPortalContactSearch('');
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            <div className="font-medium text-gray-900">
                              {contact.first_name} {contact.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{contact.email || 'No email on file'}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedPortalContact && (
                      <div className="mt-2 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                        <div className="text-xs text-blue-900">
                          Linked: {selectedPortalContact.first_name} {selectedPortalContact.last_name}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPortalContact(null);
                            setPortalInviteContactId('');
                          }}
                          className="text-xs text-blue-700 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCreatePortalInvite}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Create Invitation
                  </button>
                  {formError && (
                    <span className="text-sm text-red-600">{formError}</span>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900">Recent Invitations</h4>
                  {portalLoading ? (
                    <p className="text-sm text-gray-500 mt-2">Loading invitations...</p>
                  ) : portalInvitations.length === 0 ? (
                    <p className="text-sm text-gray-500 mt-2">No portal invitations yet.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {portalInvitations.map((invite) => (
                        <div
                          key={invite.id}
                          className="flex items-center justify-between border border-gray-200 rounded-lg p-3"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invite.email}</div>
                            <div className="text-xs text-gray-500">
                              Created {new Date(invite.created_at).toLocaleDateString('en-CA')} &bull; Expires{' '}
                              {new Date(invite.expires_at).toLocaleDateString('en-CA')}
                            </div>
                          </div>
                          <div className="text-xs font-medium text-gray-500">
                            {invite.accepted_at ? 'Accepted' : 'Pending'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">Portal Users</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Manage portal user access, passwords, and status.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <input
                    type="text"
                    value={portalUserSearch}
                    onChange={(e) => setPortalUserSearch(e.target.value)}
                    placeholder="Search portal users by name or email"
                    className="w-full md:max-w-md px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => fetchPortalUsers(portalUserSearch)}
                    className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Refresh
                  </button>
                </div>

                {portalUsersLoading ? (
                  <p className="text-sm text-gray-500">Loading portal users...</p>
                ) : portalUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No portal users found.</p>
                ) : (
                  <div className="space-y-3">
                    {portalUsers.map((user) => {
                      const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
                      return (
                        <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {name || user.email}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                    user.status === 'active'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {user.status}
                                </span>
                                <span
                                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                    user.is_verified ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {user.is_verified ? 'Verified' : 'Pending'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                Last login:{' '}
                                {user.last_login_at
                                  ? new Date(user.last_login_at).toLocaleString()
                                  : 'Never'}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handlePortalUserActivity(user)}
                                className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
                              >
                                View Activity
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handlePortalUserStatusChange(
                                    user,
                                    user.status === 'active' ? 'suspended' : 'active'
                                  )
                                }
                                className={`px-3 py-1.5 text-xs rounded-lg ${
                                  user.status === 'active'
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {user.status === 'active' ? 'Suspend' : 'Reactivate'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPortalResetTarget(user);
                                  setPortalResetPassword('');
                                  setPortalResetConfirmPassword('');
                                  setShowPortalResetModal(true);
                                }}
                                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              >
                                Reset Password
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {selectedPortalUser && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Portal Activity</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Activity for {selectedPortalUser.email}
                  </p>
                </div>
                <div className="p-6">
                  {portalActivityLoading ? (
                    <p className="text-sm text-gray-500">Loading activity...</p>
                  ) : portalUserActivity.length === 0 ? (
                    <p className="text-sm text-gray-500">No recent activity.</p>
                  ) : (
                    <div className="space-y-3">
                      {portalUserActivity.map((activity) => (
                        <div key={activity.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="text-xs text-gray-500 uppercase">{activity.action}</div>
                          {activity.details && (
                            <div className="text-sm text-gray-800 mt-1">{activity.details}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(activity.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Roles & Permissions Section */}
        {activeSection === 'roles' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Roles & Permissions</h2>
                  <p className="text-sm text-gray-500 mt-1">Define access levels and permissions for users</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRole({
                      id: '',
                      name: '',
                      description: '',
                      permissions: [],
                      isSystem: false,
                      userCount: 0,
                    });
                    setShowRoleModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                >
                  Create Role
                </button>
              </div>

              <div className="divide-y divide-gray-200">
                {roles.map((role) => (
                  <div key={role.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="text-sm font-semibold text-gray-900">{role.name}</h3>
                          {role.isSystem && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                              System
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{role.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {role.permissions.slice(0, 5).map((perm) => (
                            <span key={perm} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">
                              {perm}
                            </span>
                          ))}
                          {role.permissions.length > 5 && (
                            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              +{role.permissions.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-500">{role.userCount} users</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRole(role);
                            setShowRoleModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        {!role.isSystem && (
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions Reference */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Available Permissions</h2>
                <p className="text-sm text-gray-500 mt-1">Reference of all available permissions</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(
                    defaultPermissions.reduce((acc, perm) => {
                      if (!acc[perm.category]) acc[perm.category] = [];
                      acc[perm.category].push(perm);
                      return acc;
                    }, {} as Record<string, typeof defaultPermissions>)
                  ).map(([category, perms]) => (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                      <ul className="space-y-1">
                        {perms.map((perm) => (
                          <li key={perm.key} className="text-sm text-gray-600 flex items-center">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                            {perm.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Settings Section */}
        {activeSection === 'other' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Other Settings</h2>
            </div>
            <ul className="divide-y divide-gray-200">
              <li>
                <Link
                  to="/settings/backup"
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12A9 9 0 113 12a9 9 0 0118 0z"
                      />
                    </svg>
                    <div>
                      <span className="font-medium text-gray-900">Data Backup</span>
                      <p className="text-sm text-gray-500">Download a backup export</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  to="/settings/navigation"
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <div>
                      <span className="font-medium text-gray-900">Navigation</span>
                      <p className="text-sm text-gray-500">Customise menu items and order</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  to="/settings/api"
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <span className="font-medium text-gray-900">API & Integrations</span>
                      <p className="text-sm text-gray-500">Manage webhooks and API keys</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
              <li>
                <Link
                  to="/email-marketing"
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <span className="font-medium text-gray-900">Email Marketing</span>
                      <p className="text-sm text-gray-500">Configure email campaigns and templates</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* User Security Modal */}
      {showSecurityModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowSecurityModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">User Security Details</h3>
                <button
                  type="button"
                  onClick={() => setShowSecurityModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="flex items-center space-x-4">
                  <Avatar
                    src={selectedUser.profilePicture}
                    firstName={selectedUser.firstName}
                    lastName={selectedUser.lastName}
                    size="lg"
                  />
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h4>
                    <p className="text-gray-500">{selectedUser.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedUser.role}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedUser.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {selectedUser.isLocked && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Last Login</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser.lastLoginAt
                        ? new Date(selectedUser.lastLoginAt).toLocaleString('en-CA')
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Last Password Change</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUser.lastPasswordChange
                        ? new Date(selectedUser.lastPasswordChange).toLocaleString('en-CA')
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Failed Login Attempts</p>
                    <p className="text-sm font-medium text-gray-900">{selectedUser.failedLoginAttempts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Account Created</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedUser.createdAt).toLocaleString('en-CA')}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewEmail(selectedUser.email);
                      setShowResetEmailModal(true);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
                  >
                    Change Email
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleUserLock}
                    className={`px-4 py-2 text-sm font-medium rounded-lg ${
                      selectedUser.isLocked
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {selectedUser.isLocked ? 'Unlock Account' : 'Lock Account'}
                  </button>
                </div>

                {/* Audit Logs */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h4>
                  {userAuditLogs.length > 0 ? (
                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                      {userAuditLogs.map((log) => (
                        <div key={log.id} className="p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">{log.action}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.createdAt).toLocaleString('en-CA')}
                            </span>
                          </div>
                          {log.details && (
                            <p className="text-gray-600 mt-1">{log.details}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            IP: {log.ipAddress}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No recent activity logs</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portal Reset Password Modal */}
      {showPortalResetModal && portalResetTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => {
                setShowPortalResetModal(false);
                setPortalResetTarget(null);
                setPortalResetPassword('');
                setPortalResetConfirmPassword('');
              }}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Reset Portal Password
              </h3>
              <p className="text-sm text-gray-600">
                This will immediately replace the portal password for{' '}
                <span className="font-medium">{portalResetTarget.email}</span>.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={portalResetPassword}
                    onChange={(e) => setPortalResetPassword(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={portalResetConfirmPassword}
                    onChange={(e) => setPortalResetConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowPortalResetModal(false);
                    setPortalResetTarget(null);
                    setPortalResetPassword('');
                    setPortalResetConfirmPassword('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePortalPasswordReset}
                  disabled={portalResetLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {portalResetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowResetPasswordModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reset Password for {selectedUser.firstName} {selectedUser.lastName}
              </h3>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    setFormError(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetUserPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Change Email for {selectedUser.firstName} {selectedUser.lastName}
              </h3>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetEmailModal(false);
                    setNewEmail('');
                    setFormError(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetUserEmail}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingRole.id ? 'Edit Role' : 'Create Role'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                  <input
                    type="text"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    placeholder="Enter role name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={editingRole.isSystem}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={editingRole.description}
                    onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                    placeholder="Describe this role's purpose"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {Object.entries(
                      defaultPermissions.reduce((acc, perm) => {
                        if (!acc[perm.category]) acc[perm.category] = [];
                        acc[perm.category].push(perm);
                        return acc;
                      }, {} as Record<string, typeof defaultPermissions>)
                    ).map(([category, perms]) => (
                      <div key={category} className="mb-4 last:mb-0">
                        <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
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
                              <span className="text-sm text-gray-700">{perm.label}</span>
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
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRole}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invite New User
              </h3>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              {inviteUrl ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Invitation Created
                    </div>
                    <p className="text-sm text-green-700">
                      Share this link with <strong>{inviteEmail}</strong> to allow them to create their account:
                    </p>
                  </div>

                  <div className="p-3 bg-gray-100 rounded-lg">
                    <input
                      type="text"
                      value={inviteUrl}
                      readOnly
                      title="Invitation URL"
                      aria-label="Invitation URL"
                      className="w-full bg-transparent text-sm text-gray-700 border-none focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      alert('Link copied to clipboard!');
                    }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Copy Link
                  </button>

                  <button
                    type="button"
                    onClick={resetInviteModal}
                    className="w-full px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      title="Select user role"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                      <option value="readonly">Read Only</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      The user will be assigned this role when they create their account
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Personal Message (optional)
                    </label>
                    <textarea
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      placeholder="Welcome to our team! Looking forward to working with you."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={resetInviteModal}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateInvitation}
                      disabled={isCreatingInvite || !inviteEmail}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isCreatingInvite ? 'Creating...' : 'Create Invitation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
