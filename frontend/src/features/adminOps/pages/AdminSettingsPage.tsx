/**
 * Admin Settings Page
 * Thin orchestration shell for organization settings, users, groups, roles, and security.
 */

import { lazy, Suspense, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../../../contexts/useToast';
import { useApiError } from '../../../hooks/useApiError';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { useBranding } from '../../../contexts/BrandingContext';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import AdminQuickActionsBar from '../components/AdminQuickActionsBar';
import AdminWorkspaceShell from '../components/AdminWorkspaceShell';
import PortalOperationsCard from './adminSettings/components/PortalOperationsCard';
import AdminSettingsSectionNav from './adminSettings/components/AdminSettingsSectionNav';
import GroupEditorModal from './adminSettings/components/GroupEditorModal';
import UserAccessModal from './adminSettings/components/UserAccessModal';
import UserSecurityModal from './adminSettings/components/UserSecurityModal';
import InviteUserModal from '../../invitations/components/InviteUserModal';
import RoleEditorModal from './adminSettings/components/RoleEditorModal';
import ResetUserPasswordModal from './adminSettings/components/ResetUserPasswordModal';
import ResetUserEmailModal from './adminSettings/components/ResetUserEmailModal';
import { useAdminDashboardStatus } from './adminSettings/hooks/useAdminDashboardStatus';
import { useAdminSettingsBootstrap } from './adminSettings/hooks/useAdminSettingsBootstrap';
import { useAdminSettingsModalCoordinator } from './adminSettings/hooks/useAdminSettingsModalCoordinator';
import { useOrganizationSettings } from './adminSettings/hooks/useOrganizationSettings';
import {
  getInitialAdminSettingsMode,
  useAdminSettingsRouteState,
} from './adminSettings/hooks/useAdminSettingsRouteState';
import { useUsersSettings } from './adminSettings/hooks/useUsersSettings';
import { useRolesSettings } from './adminSettings/hooks/useRolesSettings';
import { buildRoleLabelMap, getRoleDisplayLabel } from './adminSettings/utils';
import CommunicationsSection from './adminSettings/sections/CommunicationsSection';

const OrganizationSection = lazy(() => import('./adminSettings/sections/OrganizationSection'));
const WorkspaceModulesSection = lazy(
  () => import('./adminSettings/sections/WorkspaceModulesSection')
);
const BrandingSection = lazy(() => import('./adminSettings/sections/BrandingSection'));
const ApprovalsSection = lazy(() => import('./adminSettings/sections/ApprovalsSection'));
const UsersSection = lazy(() => import('./adminSettings/sections/UsersSection'));
const GroupsSection = lazy(() => import('./adminSettings/sections/GroupsSection'));
const RolesSection = lazy(() => import('./adminSettings/sections/RolesSection'));
const OtherSettingsSection = lazy(() => import('./adminSettings/sections/OtherSettingsSection'));
const DashboardSection = lazy(() => import('./adminSettings/sections/DashboardSection'));
const AuditLogsSection = lazy(() => import('./adminSettings/sections/AuditLogsSection'));
const TwilioSettingsSection = lazy(() => import('./adminSettings/sections/TwilioSettingsSection'));
const OutcomeDefinitionsSection = lazy(
  () => import('./adminSettings/sections/OutcomeDefinitionsSection')
);

export default function AdminSettings() {
  const location = useLocation();
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const {
    error: formError,
    setFromError: setFormErrorFromError,
    clear: clearFormError,
  } = useApiError();
  const { setBranding: setGlobalBranding } = useBranding();

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
    initialMode: getInitialAdminSettingsMode(),
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
  } = useRolesSettings(confirm, {
    showSuccess,
    showError,
  });

  const {
    activeSection,
    activeTab,
    activeGroup,
    visibleTabMap,
    visibleTabGroups,
    setActiveSection,
    handleToggleAdvancedSettings,
    handleTabKeyDown,
  } = useAdminSettingsRouteState({
    showAdvancedSettings,
    setShowAdvancedSettings,
  });

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
    showAccessModal,
    setShowAccessModal,
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
    fetchUserAccessInfo,
    handleResetUserPassword,
    handleResetUserEmail,
    handleToggleUserLock,
    handleCreateInvitation,
    handleRevokeInvitation,
    handleResendInvitation,
    resetInviteModal,
    groups,
    groupEditor,
    setGroupEditor,
    showGroupModal,
    groupLoading,
    organizationAccounts,
    userAccessDraft,
    setUserAccessDraft,
    savingUserAccess,
    savingGroup,
    openCreateGroup,
    openEditGroup,
    handleSaveGroup,
    handleDeleteGroup,
    resetGroupModal,
    handleSaveUserAccess,
  } = useUsersSettings({
    activeSection,
    confirm,
    setFormErrorFromError,
    clearFormError,
    showSuccess,
    showError,
  });

  const {
    stats: dashboardStats,
    cards: dashboardCards,
    loading: dashboardLoading,
    reload: reloadDashboard,
  } = useAdminDashboardStatus();

  const iconInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const { isLoading } = useAdminSettingsBootstrap({
    loadOrganizationData,
    loadRoles,
  });
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
  const {
    handleCloseRoleModal,
    handleCloseSecurityModal,
    handleCloseAccessModal,
    handleOpenResetEmail,
    handleCloseResetPasswordModal,
    handleCloseResetEmailModal,
    handleCopyInviteLink,
  } = useAdminSettingsModalCoordinator({
    selectedUser,
    setSelectedUser,
    setUserAuditLogPage,
    setShowRoleModal,
    setEditingRole,
    setShowSecurityModal,
    setShowAccessModal,
    setUserAccessDraft,
    setShowResetPasswordModal,
    setNewPassword,
    setConfirmPassword,
    setShowResetEmailModal,
    setNewEmail,
    clearFormError,
    showSuccess,
  });

  if (isLoading) {
    return (
      <AdminWorkspaceShell
        title="Admin Hub"
        description="Configure organization settings, access, delivery, governance, and adjacent admin workspaces from one system."
        currentPath={location.pathname}
      >
        <div className="flex min-h-[240px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--loop-blue)]" />
        </div>
      </AdminWorkspaceShell>
    );
  }

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'approvals':
        return <ApprovalsSection roleOptions={roleOptions} />;
      case 'dashboard':
        return (
          <DashboardSection
            stats={dashboardStats}
            cards={dashboardCards}
            loading={dashboardLoading}
            onShowInvite={() => setShowInviteModal(true)}
            onRefresh={reloadDashboard}
          />
        );
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
          <UsersSection
            userSearchQuery={userSearchQuery}
            onSearchChange={setUserSearchQuery}
            isSearching={isSearching}
            userSearchResults={userSearchResults}
            roleLabels={roleLabels}
            onSelectUser={fetchUserSecurityInfo}
            onOpenAccess={fetchUserAccessInfo}
            onShowInvite={() => setShowInviteModal(true)}
            onGoToRoles={() => setActiveSection('roles')}
            onGoToGroups={() => setActiveSection('groups')}
            invitations={invitations}
            onResendInvitation={handleResendInvitation}
            onRevokeInvitation={handleRevokeInvitation}
            organizationAccounts={organizationAccounts}
          />
        );
      case 'groups':
        return (
          <GroupsSection
            groups={groups}
            roleOptions={roleOptions}
            loading={groupLoading}
            onCreateGroup={openCreateGroup}
            onEditGroup={openEditGroup}
            onDeleteGroup={handleDeleteGroup}
          />
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
        return (
          <DashboardSection
            stats={dashboardStats}
            cards={dashboardCards}
            loading={dashboardLoading}
            onShowInvite={() => setShowInviteModal(true)}
            onRefresh={reloadDashboard}
          />
        );
    }
  };

  return (
    <AdminWorkspaceShell
      title="Admin Hub"
      description="Configure organization settings, access, delivery, governance, and adjacent admin workspaces from one coherent system."
      currentPath={location.pathname}
    >
      <AdminSettingsSectionNav
        activeSection={activeSection}
        activeGroupLabel={activeGroup?.label}
        showAdvancedSettings={showAdvancedSettings}
        activeTabLabel={activeTab.label}
        visibleTabGroups={visibleTabGroups}
        visibleTabMap={visibleTabMap}
        onSelectSection={setActiveSection}
        onToggleAdvancedSettings={handleToggleAdvancedSettings}
        onTabKeyDown={handleTabKeyDown}
      />

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

      <GroupEditorModal
        open={showGroupModal}
        group={groupEditor}
        roleOptions={roleOptions}
        onGroupChange={(nextGroup) => setGroupEditor(nextGroup)}
        onSave={handleSaveGroup}
        onClose={resetGroupModal}
        isSaving={savingGroup}
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

      <UserAccessModal
        open={showAccessModal}
        user={selectedUser}
        groups={groups}
        organizationAccounts={organizationAccounts}
        draftGroups={userAccessDraft.groups}
        draftOrganizationAccess={userAccessDraft.organizationAccess}
        onDraftGroupsChange={(nextGroups) =>
          setUserAccessDraft((prev) => ({ ...prev, groups: nextGroups }))
        }
        onDraftOrganizationAccessChange={(nextOrganizationAccess) =>
          setUserAccessDraft((prev) => ({ ...prev, organizationAccess: nextOrganizationAccess }))
        }
        onSave={handleSaveUserAccess}
        onClose={handleCloseAccessModal}
        isSaving={savingUserAccess}
        error={formError}
      />

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </AdminWorkspaceShell>
  );
}
