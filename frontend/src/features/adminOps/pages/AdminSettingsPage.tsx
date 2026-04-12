/**
 * Admin Settings Page
<<<<<<< HEAD
 * Thin orchestration shell for organization settings, users, roles, and security.
 */

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
=======
 * Admin-only settings for configuring organization-wide preferences, branding,
 * user management, roles, and security settings
 */

import { lazy, Suspense, useState, useEffect, useRef, type KeyboardEvent } from 'react';
>>>>>>> origin/main
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../../contexts/useToast';
import { useApiError } from '../../../hooks/useApiError';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { useBranding } from '../../../contexts/BrandingContext';
<<<<<<< HEAD
=======
import ErrorBanner from '../../../components/ErrorBanner';
>>>>>>> origin/main
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import AdminPanelLayout from '../components/AdminPanelLayout';
import AdminPanelNav from '../components/AdminPanelNav';
import AdminQuickActionsBar from '../components/AdminQuickActionsBar';
import {
  getAdminSettingsPath,
  parseAdminSettingsSection,
  type AdminSettingsSection,
} from '../adminRoutePaths';
<<<<<<< HEAD
import {
  adminSettingsTabGroups,
  adminSettingsTabs,
} from './adminSettings/constants';
import PortalOperationsCard from './adminSettings/components/PortalOperationsCard';
import UserSecurityModal from './adminSettings/components/UserSecurityModal';
import InviteUserModal from './adminSettings/components/InviteUserModal';
import RoleEditorModal from './adminSettings/components/RoleEditorModal';
import ResetUserPasswordModal from './adminSettings/components/ResetUserPasswordModal';
import ResetUserEmailModal from './adminSettings/components/ResetUserEmailModal';
import { useOrganizationSettings } from './adminSettings/hooks/useOrganizationSettings';
import { useUsersSettings } from './adminSettings/hooks/useUsersSettings';
import { useRolesSettings } from './adminSettings/hooks/useRolesSettings';
import { buildRoleLabelMap, getRoleDisplayLabel } from './adminSettings/utils';
=======
import { adminSettingsTabs, defaultPermissions } from './adminSettings/constants';
import PortalOperationsCard from './adminSettings/components/PortalOperationsCard';
import UserSecurityModal from './adminSettings/components/UserSecurityModal';
import { useOrganizationSettings } from './adminSettings/hooks/useOrganizationSettings';
import { useUsersSettings } from './adminSettings/hooks/useUsersSettings';
import { useRolesSettings } from './adminSettings/hooks/useRolesSettings';
>>>>>>> origin/main

const ADMIN_SETTINGS_MODE_KEY = 'admin_settings_mode_v1';

const OrganizationSection = lazy(() => import('./adminSettings/sections/OrganizationSection'));
const WorkspaceModulesSection = lazy(
  () => import('./adminSettings/sections/WorkspaceModulesSection')
);
const BrandingSection = lazy(() => import('./adminSettings/sections/BrandingSection'));
const UsersSection = lazy(() => import('./adminSettings/sections/UsersSection'));
const RolesSection = lazy(() => import('./adminSettings/sections/RolesSection'));
const OtherSettingsSection = lazy(() => import('./adminSettings/sections/OtherSettingsSection'));
const DashboardSection = lazy(() => import('./adminSettings/sections/DashboardSection'));
const AuditLogsSection = lazy(() => import('./adminSettings/sections/AuditLogsSection'));
<<<<<<< HEAD
const CommunicationsSection = lazy(
  () => import('./adminSettings/sections/CommunicationsSection')
);
=======
const EmailSettingsSection = lazy(() => import('./adminSettings/sections/EmailSettingsSection'));
>>>>>>> origin/main
const TwilioSettingsSection = lazy(() => import('./adminSettings/sections/TwilioSettingsSection'));
const RegistrationSettingsSection = lazy(
  () => import('./adminSettings/sections/RegistrationSettingsSection')
);
const OutcomeDefinitionsSection = lazy(
  () => import('./adminSettings/sections/OutcomeDefinitionsSection')
);

<<<<<<< HEAD
=======
// ============================================================================
// Main Component
// ============================================================================

>>>>>>> origin/main
export default function AdminSettings() {
  const location = useLocation();
  const navigate = useNavigate();
  const { section: sectionParam } = useParams<{ section?: string }>();
  const { showSuccess } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const {
    error: formError,
    setFromError: setFormErrorFromError,
    clear: clearFormError,
  } = useApiError();
  const { setBranding: setGlobalBranding } = useBranding();
<<<<<<< HEAD

=======
>>>>>>> origin/main
  const persistedMode =
    (typeof window !== 'undefined'
      ? (window.localStorage.getItem(ADMIN_SETTINGS_MODE_KEY) as 'basic' | 'advanced' | null)
      : null) || 'basic';
  const activeSection = parseAdminSettingsSection(sectionParam) ?? 'dashboard';
  const setActiveSection = (nextSection: AdminSettingsSection, options?: { replace?: boolean }) => {
    navigate(
      {
        pathname: getAdminSettingsPath(nextSection),
        search: location.search,
      },
      options
    );
  };

<<<<<<< HEAD
=======
  // State
>>>>>>> origin/main
  const [isLoading, setIsLoading] = useState(true);
  const {
    showAdvancedSettings,
    setShowAdvancedSettings,
    config,
    branding,
    setBranding,
    isSaving,
    saveStatus,
    organizationLastSavedAt,
    brandingLastSavedAt,
    loadOrganizationData,
    handleChange,
    handleAddressChange,
    handleTaxReceiptChange,
    handleTaxReceiptAddressChange,
    handlePhoneChange,
    handleTaxReceiptPhoneChange,
    handleWorkspaceModuleChange,
    handleBrandingChange,
    handleImageUpload,
    handleSaveOrganization,
    handleSaveBranding,
    isOrganizationDirty,
    isBrandingDirty,
    taxReceiptMissingFields,
    isTaxReceiptComplete,
  } = useOrganizationSettings({
    initialMode: persistedMode,
    setGlobalBranding,
  });
<<<<<<< HEAD

  const {
    roles,
    permissions,
=======
  const {
    roles,
>>>>>>> origin/main
    showRoleModal,
    setShowRoleModal,
    editingRole,
    setEditingRole,
    loadRoles,
<<<<<<< HEAD
    openCreateRole,
    openEditRole,
    handleSaveRole,
    handleDeleteRole,
  } = useRolesSettings(confirm);

=======
    handleSaveRole,
    handleDeleteRole,
  } = useRolesSettings(confirm);
>>>>>>> origin/main
  const {
    userSearchQuery,
    setUserSearchQuery,
    userSearchResults,
    isSearching,
    selectedUser,
<<<<<<< HEAD
    setSelectedUser,
    userAuditLogPage,
    setUserAuditLogPage,
=======
    userAuditLogs,
>>>>>>> origin/main
    showSecurityModal,
    setShowSecurityModal,
    showResetPasswordModal,
    setShowResetPasswordModal,
    showResetEmailModal,
    setShowResetEmailModal,
    showInviteModal,
    setShowInviteModal,
    invitations,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    inviteMessage,
    setInviteMessage,
    inviteUrl,
    inviteEmailDelivery,
    inviteEmailConfigured,
    inviteCapabilitiesLoading,
    isCreatingInvite,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    newEmail,
    setNewEmail,
    fetchUserSecurityInfo,
    handleResetUserPassword,
    handleResetUserEmail,
    handleToggleUserLock,
    handleCreateInvitation,
    handleRevokeInvitation,
    handleResendInvitation,
    resetInviteModal,
  } = useUsersSettings({
    activeSection,
    confirm,
    setFormErrorFromError,
    clearFormError,
  });

<<<<<<< HEAD
  const iconInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([loadOrganizationData(), loadRoles()]);
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, [loadOrganizationData, loadRoles]);

  useEffect(() => {
    const sectionTab = adminSettingsTabs.find((tab) => tab.id === activeSection);
    if (sectionTab?.level === 'advanced' && !showAdvancedSettings) {
      setShowAdvancedSettings(true);
    }
  }, [activeSection, setShowAdvancedSettings, showAdvancedSettings]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        ADMIN_SETTINGS_MODE_KEY,
        showAdvancedSettings ? 'advanced' : 'basic'
      );
    }
  }, [showAdvancedSettings]);

  const { visibleTabs, visibleTabIds, visibleTabMap, visibleTabGroups } = useMemo(() => {
    const tabs = showAdvancedSettings
      ? adminSettingsTabs
      : adminSettingsTabs.filter((tab) => tab.level === 'basic');
    const tabIds = tabs.map((tab) => tab.id);
    const tabMap = new Map(tabs.map((tab) => [tab.id, tab]));
    const tabGroups = adminSettingsTabGroups
      .map((group) => ({
        ...group,
        tabs: group.tabs.filter((tabId) => tabMap.has(tabId)),
      }))
      .filter((group) => group.tabs.length > 0);

    return {
      visibleTabs: tabs,
      visibleTabIds: tabIds,
      visibleTabMap: tabMap,
      visibleTabGroups: tabGroups,
    };
  }, [showAdvancedSettings]);

  const activeTab = adminSettingsTabs.find((tab) => tab.id === activeSection) || adminSettingsTabs[0];
  const activeGroup = adminSettingsTabGroups.find((group) => group.tabs.includes(activeSection));
  const roleOptions = useMemo(
    () =>
      roles.map((role) => ({
        value: role.name,
        label: role.label,
        description: role.description,
        isSystem: role.isSystem,
      })),
    [roles]
  );
  const roleLabels = useMemo(() => buildRoleLabelMap(roles), [roles]);
=======
  // Refs
  const iconInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Data Fetching
  // ============================================================================
>>>>>>> origin/main

  const hasUnsavedChanges =
    !isSaving &&
    (((activeSection === 'organization' || activeSection === 'workspace_modules') &&
      isOrganizationDirty) ||
      (activeSection === 'branding' && isBrandingDirty));

  useUnsavedChangesGuard({ hasUnsavedChanges });

<<<<<<< HEAD
  const handleToggleAdvancedSettings = () => {
    if (showAdvancedSettings && activeTab.level === 'advanced') {
=======
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await Promise.all([loadOrganizationData(), loadRoles()]);
      } finally {
        setIsLoading(false);
      }
    };
    void bootstrap();
  }, [loadOrganizationData, loadRoles]);

  useEffect(() => {
    const activeTab = adminSettingsTabs.find((tab) => tab.id === activeSection);
    if (activeTab?.level === 'advanced' && !showAdvancedSettings) {
      setShowAdvancedSettings(true);
    }
  }, [activeSection, setShowAdvancedSettings, showAdvancedSettings]);

  useEffect(() => {
    window.localStorage.setItem(
      ADMIN_SETTINGS_MODE_KEY,
      showAdvancedSettings ? 'advanced' : 'basic'
    );
  }, [showAdvancedSettings]);

  // ============================================================================
  // Loading State
  // ============================================================================

  if (isLoading) {
    return (
      <AdminPanelLayout
        title="Admin Settings"
        description="Configure organization settings, branding, users, roles, and security."
        sidebar={<AdminPanelNav currentPath={location.pathname} />}
      >
        <div className="min-h-[240px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--loop-blue)]"></div>
        </div>
      </AdminPanelLayout>
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
  const activeTabLevel =
    adminSettingsTabs.find((tab) => tab.id === activeSection)?.level ?? 'basic';
  const visibleTabIds = visibleTabs.map((tab) => tab.id);
  const handleToggleAdvancedSettings = () => {
    if (showAdvancedSettings && activeTabLevel === 'advanced') {
>>>>>>> origin/main
      setActiveSection('dashboard');
    }

    setShowAdvancedSettings((prev) => !prev);
  };
<<<<<<< HEAD

=======
>>>>>>> origin/main
  const focusTab = (tabId: AdminSettingsSection) => {
    const tabNode = document.getElementById(`admin-settings-tab-${tabId}`);
    if (tabNode instanceof HTMLElement) {
      tabNode.focus();
    }
  };
<<<<<<< HEAD

=======
>>>>>>> origin/main
  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tabId: AdminSettingsSection
  ) => {
<<<<<<< HEAD
    if (visibleTabIds.length === 0) {
      return;
    }

=======
>>>>>>> origin/main
    const currentIndex = visibleTabIds.indexOf(tabId);
    if (currentIndex < 0) return;

    let targetIndex = currentIndex;
    if (event.key === 'ArrowRight') {
      targetIndex = (currentIndex + 1) % visibleTabIds.length;
    } else if (event.key === 'ArrowLeft') {
      targetIndex = (currentIndex - 1 + visibleTabIds.length) % visibleTabIds.length;
    } else if (event.key === 'Home') {
      targetIndex = 0;
    } else if (event.key === 'End') {
      targetIndex = visibleTabIds.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const targetTabId = visibleTabIds[targetIndex];
    setActiveSection(targetTabId);
    focusTab(targetTabId);
  };

<<<<<<< HEAD
  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    setEditingRole(null);
  };

  const handleCloseSecurityModal = () => {
    setShowSecurityModal(false);
    setSelectedUser(null);
    setUserAuditLogPage(null);
  };

  const handleOpenResetEmail = () => {
    if (!selectedUser) {
      return;
    }

    setNewEmail(selectedUser.email);
    setShowResetEmailModal(true);
  };

  const handleCloseResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setNewPassword('');
    setConfirmPassword('');
    clearFormError();
  };

  const handleCloseResetEmailModal = () => {
    setShowResetEmailModal(false);
    setNewEmail('');
    clearFormError();
  };

  const handleCopyInviteLink = (value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value);
    }

    showSuccess('Invitation link copied');
  };

  if (isLoading) {
    return (
      <AdminPanelLayout
        title="Admin Settings"
        description="Configure organization settings, branding, users, roles, and security."
        sidebar={<AdminPanelNav currentPath={location.pathname} />}
      >
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--loop-blue)]" />
        </div>
      </AdminPanelLayout>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection onShowInvite={() => setShowInviteModal(true)} />;
      case 'organization':
        return (
          <OrganizationSection
            config={config}
            onChange={handleChange}
            onAddressChange={handleAddressChange}
            onTaxReceiptChange={handleTaxReceiptChange}
            onTaxReceiptAddressChange={handleTaxReceiptAddressChange}
            onPhoneChange={handlePhoneChange}
            onTaxReceiptPhoneChange={handleTaxReceiptPhoneChange}
            onSave={handleSaveOrganization}
            isSaving={isSaving}
            saveStatus={saveStatus}
            isDirty={isOrganizationDirty}
            lastSavedAt={organizationLastSavedAt}
            taxReceiptMissingFields={taxReceiptMissingFields}
            isTaxReceiptComplete={isTaxReceiptComplete}
          />
        );
      case 'workspace_modules':
        return (
          <WorkspaceModulesSection
            workspaceModules={config.workspaceModules}
            onToggleModule={handleWorkspaceModuleChange}
            onSave={handleSaveOrganization}
            isSaving={isSaving}
            saveStatus={saveStatus}
            isDirty={isOrganizationDirty}
            lastSavedAt={organizationLastSavedAt}
          />
        );
      case 'branding':
        return (
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
        );
      case 'users':
        return (
          <>
            <UsersSection
              userSearchQuery={userSearchQuery}
              onSearchChange={setUserSearchQuery}
              isSearching={isSearching}
              userSearchResults={userSearchResults}
              roleLabels={roleLabels}
              onSelectUser={fetchUserSecurityInfo}
              onShowInvite={() => setShowInviteModal(true)}
              onGoToRoles={() => setActiveSection('roles')}
              invitations={invitations}
              onResendInvitation={handleResendInvitation}
              onRevokeInvitation={handleRevokeInvitation}
            />
            <div className="mt-6">
              <RegistrationSettingsSection roleOptions={roleOptions} />
            </div>
          </>
        );
      case 'roles':
        return (
          <RolesSection
            roles={roles}
            permissions={permissions}
            onCreateRole={openCreateRole}
            onEditRole={openEditRole}
            onDeleteRole={handleDeleteRole}
          />
        );
      case 'audit_logs':
        return <AuditLogsSection />;
      case 'communications':
        return <CommunicationsSection />;
      case 'messaging':
        return <TwilioSettingsSection />;
      case 'outcomes':
        return <OutcomeDefinitionsSection />;
      case 'other':
        return <OtherSettingsSection />;
      default:
        return <DashboardSection onShowInvite={() => setShowInviteModal(true)} />;
    }
  };

=======
>>>>>>> origin/main
  return (
    <AdminPanelLayout
      title="Admin Settings"
      description="Configure organization settings, branding, users, roles, and security."
      badge={
<<<<<<< HEAD
        <span className="border-2 border-[var(--app-border)] bg-[var(--loop-purple)] px-3 py-1 text-xs font-bold uppercase text-black">
=======
        <span className="px-3 py-1 text-xs font-bold bg-[var(--loop-purple)] text-black border-2 border-[var(--app-border)] uppercase">
>>>>>>> origin/main
          Admin Only
        </span>
      }
      sidebar={<AdminPanelNav currentPath={location.pathname} />}
    >
<<<<<<< HEAD
      <div className="sticky top-14 z-10 mb-4 border-b-2 border-[var(--app-border)] bg-[var(--app-shell-surface)] shadow-sm sm:top-16">
        <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-[var(--app-text-muted)]">
              Showing {showAdvancedSettings ? 'all sections' : 'basic sections'}.
            </p>
            <p className="text-sm text-[var(--app-text)]">
              You are here: <span className="font-bold">{activeTab.label}</span>
              {activeGroup ? (
                <span className="text-[var(--app-text-muted)]">
                  {' '}
                  · {activeGroup.label}
                </span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleAdvancedSettings}
            className="border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-bold uppercase hover:bg-[var(--app-surface-muted)]"
=======
      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 mb-6 border-b-2 border-[var(--app-border)] bg-[var(--app-shell-surface)] shadow-sm">
        <div className="flex items-center justify-between pb-3">
          <p className="text-sm text-[var(--app-text-muted)]">
            Showing {showAdvancedSettings ? 'all sections' : 'basic sections'}. You are here:{' '}
            <span className="font-bold text-[var(--app-text)]">{activeTabLabel}</span>
          </p>
          <button
            type="button"
            onClick={handleToggleAdvancedSettings}
            className="px-3 py-2 text-xs font-bold uppercase border-2 border-[var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-muted)]"
>>>>>>> origin/main
          >
            {showAdvancedSettings ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        </div>
<<<<<<< HEAD
      </div>

      <nav className="mb-6 space-y-4" role="tablist" aria-label="Admin settings sections">
        {visibleTabGroups.map((group) => (
          <section
            key={group.id}
            className="border-t border-[var(--app-border)] pt-3 first:border-t-0 first:pt-0"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--app-text)]">
                  {group.label}
                </h3>
                <p className="text-xs text-[var(--app-text-muted)]">{group.description}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--app-text-muted)]">
                {group.tabs.length} sections
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.tabs.map((tabId) => {
                const tab = visibleTabMap.get(tabId);
                if (!tab) {
                  return null;
                }

                return (
                  <button
                    key={tab.id}
                    id={`admin-settings-tab-${tab.id}`}
                    type="button"
                    onClick={() => setActiveSection(tab.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                    role="tab"
                    aria-selected={activeSection === tab.id}
                    aria-controls={`admin-settings-panel-${tab.id}`}
                    tabIndex={activeSection === tab.id ? 0 : -1}
                    className={`border-b-4 px-4 py-3 text-sm font-bold uppercase whitespace-nowrap transition-colors ${
                      activeSection === tab.id
                        ? 'border-[var(--loop-yellow)] bg-[var(--loop-yellow)] text-[var(--app-text)]'
                        : 'border-transparent text-[var(--app-text-muted)] hover:bg-[var(--app-surface-muted)] hover:text-[var(--app-text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <AdminQuickActionsBar role="admin" />
=======
        <nav
          className="-mb-px flex space-x-4 overflow-x-auto"
          role="tablist"
          aria-label="Admin settings sections"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              id={`admin-settings-tab-${tab.id}`}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              role="tab"
              aria-selected={activeSection === tab.id}
              aria-controls={`admin-settings-panel-${tab.id}`}
              tabIndex={activeSection === tab.id ? 0 : -1}
              className={`py-3 px-4 border-b-4 font-bold text-sm uppercase whitespace-nowrap transition-colors ${
                activeSection === tab.id
                  ? 'border-[var(--loop-yellow)] text-[var(--app-text)] bg-[var(--loop-yellow)]'
                  : 'border-transparent text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-muted)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <AdminQuickActionsBar role="admin" />

>>>>>>> origin/main
      <PortalOperationsCard />

      <section
        id={`admin-settings-panel-${activeSection}`}
        role="tabpanel"
        aria-labelledby={`admin-settings-tab-${activeSection}`}
      >
        <Suspense
          fallback={
            <div className="rounded-md border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 text-sm font-bold text-[var(--app-text-muted)]">
              Loading section...
            </div>
          }
        >
<<<<<<< HEAD
          {renderActiveSection()}
=======
          {/* Dashboard Section */}
          {activeSection === 'dashboard' && (
            <DashboardSection onShowInvite={() => setShowInviteModal(true)} />
          )}

          {/* Organization Section */}
          {activeSection === 'organization' && (
            <OrganizationSection
              config={config}
              onChange={handleChange}
              onAddressChange={handleAddressChange}
              onTaxReceiptChange={handleTaxReceiptChange}
              onTaxReceiptAddressChange={handleTaxReceiptAddressChange}
              onPhoneChange={handlePhoneChange}
              onTaxReceiptPhoneChange={handleTaxReceiptPhoneChange}
              onSave={handleSaveOrganization}
              isSaving={isSaving}
              saveStatus={saveStatus}
              isDirty={isOrganizationDirty}
              lastSavedAt={organizationLastSavedAt}
              taxReceiptMissingFields={taxReceiptMissingFields}
              isTaxReceiptComplete={isTaxReceiptComplete}
            />
          )}

          {activeSection === 'workspace_modules' && (
            <WorkspaceModulesSection
              workspaceModules={config.workspaceModules}
              onToggleModule={handleWorkspaceModuleChange}
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
                  userCount: 0,
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
>>>>>>> origin/main
        </Suspense>
      </section>

      <UserSecurityModal
        open={showSecurityModal}
        selectedUser={selectedUser}
<<<<<<< HEAD
        roleLabel={selectedUser ? getRoleDisplayLabel(selectedUser.role, roleLabels) : undefined}
        auditLogPage={userAuditLogPage}
        onClose={handleCloseSecurityModal}
        onOpenResetPassword={() => setShowResetPasswordModal(true)}
        onOpenResetEmail={handleOpenResetEmail}
        onToggleUserLock={handleToggleUserLock}
      />

      <ResetUserPasswordModal
        open={showResetPasswordModal}
        selectedUser={selectedUser}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        error={formError}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleResetUserPassword}
        onClose={handleCloseResetPasswordModal}
      />

      <ResetUserEmailModal
        open={showResetEmailModal}
        selectedUser={selectedUser}
        newEmail={newEmail}
        error={formError}
        onNewEmailChange={setNewEmail}
        onSubmit={handleResetUserEmail}
        onClose={handleCloseResetEmailModal}
      />

      <RoleEditorModal
        open={showRoleModal}
        role={editingRole}
        permissions={permissions}
        onRoleChange={(nextRole) => setEditingRole(nextRole)}
        onSave={handleSaveRole}
        onClose={handleCloseRoleModal}
      />

      <InviteUserModal
        open={showInviteModal}
        email={inviteEmail}
        onEmailChange={setInviteEmail}
        role={inviteRole}
        onRoleChange={setInviteRole}
        message={inviteMessage}
        onMessageChange={setInviteMessage}
        roleOptions={roleOptions}
        inviteUrl={inviteUrl}
        inviteEmailDelivery={inviteEmailDelivery}
        inviteEmailConfigured={inviteEmailConfigured}
        inviteCapabilitiesLoading={inviteCapabilitiesLoading}
        isCreatingInvite={isCreatingInvite}
        error={formError}
        onCreateInvitation={handleCreateInvitation}
        onClose={resetInviteModal}
        onReset={resetInviteModal}
        onCopyLink={handleCopyInviteLink}
      />

=======
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

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowResetPasswordModal(false)}
            />
            <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-app-text-heading mb-4">
                Reset Password for {selectedUser.firstName} {selectedUser.lastName}
              </h3>

              <ErrorBanner message={formError} className="mb-4" />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">
                    Confirm Password
                  </label>
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
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
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
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowResetEmailModal(false)}
            />
            <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-app-text-heading mb-4">
                Change Email for {selectedUser.firstName} {selectedUser.lastName}
              </h3>

              <ErrorBanner message={formError} className="mb-4" />

              <div>
                <label className="block text-sm font-medium text-app-text-label mb-1">
                  New Email Address
                </label>
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
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
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
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setShowRoleModal(false)}
            />
            <div className="relative bg-app-surface rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-lg font-semibold text-app-text-heading mb-4">
                {editingRole.id ? 'Edit Role' : 'Create Role'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">
                    Role Name
                  </label>
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
                  <label className="block text-sm font-medium text-app-text-label mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={editingRole.description}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, description: e.target.value })
                    }
                    placeholder="Describe this role's purpose"
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-2">
                    Permissions
                  </label>
                  <div className="border border-app-border rounded-lg p-4 max-h-64 overflow-y-auto">
                    {Object.entries(
                      defaultPermissions.reduce(
                        (acc, perm) => {
                          if (!acc[perm.category]) acc[perm.category] = [];
                          acc[perm.category].push(perm);
                          return acc;
                        },
                        {} as Record<string, typeof defaultPermissions>
                      )
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
                                      permissions: editingRole.permissions.filter(
                                        (p) => p !== perm.key
                                      ),
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
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
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
              <h3 className="text-lg font-semibold text-app-text-heading mb-4">Invite New User</h3>

              <ErrorBanner message={formError} className="mb-4" />

              {inviteUrl ? (
                <div className="space-y-4">
                  <div
                    className={`p-4 border rounded-lg ${
                      inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                        ? 'bg-app-accent-soft border-app-border'
                        : 'bg-app-accent-soft border-app-border'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 font-medium mb-2 ${
                        inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                          ? 'text-app-accent-text'
                          : 'text-app-accent-text'
                      }`}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                        ? 'Invitation Created (Email Not Sent)'
                        : 'Invitation Created'}
                    </div>
                    <p
                      className={`text-sm ${
                        inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                          ? 'text-app-accent-text'
                          : 'text-app-accent-text'
                      }`}
                    >
                      {inviteEmailDelivery?.requested && inviteEmailDelivery?.sent ? (
                        <>
                          Invitation email sent to <strong>{inviteEmail}</strong>. You can also
                          share this link manually:
                        </>
                      ) : (
                        <>
                          Share this link with <strong>{inviteEmail}</strong> to allow them to
                          create their account:
                        </>
                      )}
                    </p>
                    {inviteEmailDelivery?.reason && (
                      <p className="mt-2 text-xs text-app-accent-text">
                        {inviteEmailDelivery.reason}
                      </p>
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
                    className="w-full px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover"
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
                    <div className="text-xs text-app-accent-text bg-app-accent-soft border border-app-border rounded-md px-3 py-2">
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
                      disabled={
                        isCreatingInvite ||
                        !inviteEmail ||
                        inviteCapabilitiesLoading ||
                        !inviteEmailConfigured
                      }
                      className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
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
>>>>>>> origin/main
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </AdminPanelLayout>
  );
}
