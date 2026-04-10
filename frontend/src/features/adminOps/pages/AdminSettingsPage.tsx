/**
 * Admin Settings Page
 * Thin orchestration shell for organization settings, users, roles, and security.
 */

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../../contexts/useToast';
import { useApiError } from '../../../hooks/useApiError';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { useBranding } from '../../../contexts/BrandingContext';
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
const CommunicationsSection = lazy(
  () => import('./adminSettings/sections/CommunicationsSection')
);
const TwilioSettingsSection = lazy(() => import('./adminSettings/sections/TwilioSettingsSection'));
const RegistrationSettingsSection = lazy(
  () => import('./adminSettings/sections/RegistrationSettingsSection')
);
const OutcomeDefinitionsSection = lazy(
  () => import('./adminSettings/sections/OutcomeDefinitionsSection')
);

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

  const {
    roles,
    permissions,
    showRoleModal,
    setShowRoleModal,
    editingRole,
    setEditingRole,
    loadRoles,
    openCreateRole,
    openEditRole,
    handleSaveRole,
    handleDeleteRole,
  } = useRolesSettings(confirm);

  const {
    userSearchQuery,
    setUserSearchQuery,
    userSearchResults,
    isSearching,
    selectedUser,
    setSelectedUser,
    userAuditLogPage,
    setUserAuditLogPage,
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

  const hasUnsavedChanges =
    !isSaving &&
    (((activeSection === 'organization' || activeSection === 'workspace_modules') &&
      isOrganizationDirty) ||
      (activeSection === 'branding' && isBrandingDirty));

  useUnsavedChangesGuard({ hasUnsavedChanges });

  const handleToggleAdvancedSettings = () => {
    if (showAdvancedSettings && activeTab.level === 'advanced') {
      setActiveSection('dashboard');
    }

    setShowAdvancedSettings((prev) => !prev);
  };

  const focusTab = (tabId: AdminSettingsSection) => {
    const tabNode = document.getElementById(`admin-settings-tab-${tabId}`);
    if (tabNode instanceof HTMLElement) {
      tabNode.focus();
    }
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    tabId: AdminSettingsSection
  ) => {
    if (visibleTabIds.length === 0) {
      return;
    }

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

  return (
    <AdminPanelLayout
      title="Admin Settings"
      description="Configure organization settings, branding, users, roles, and security."
      badge={
        <span className="border-2 border-[var(--app-border)] bg-[var(--loop-purple)] px-3 py-1 text-xs font-bold uppercase text-black">
          Admin Only
        </span>
      }
      sidebar={<AdminPanelNav currentPath={location.pathname} />}
    >
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
          >
            {showAdvancedSettings ? 'Hide Advanced' : 'Show Advanced'}
          </button>
        </div>
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
          {renderActiveSection()}
        </Suspense>
      </section>

      <UserSecurityModal
        open={showSecurityModal}
        selectedUser={selectedUser}
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

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </AdminPanelLayout>
  );
}
