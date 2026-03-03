/**
 * Admin Settings Page
 * Admin-only settings for configuring organization-wide preferences, branding,
 * user management, roles, and security settings
 */

import { useState, useEffect, useRef } from 'react';
import { useToast } from '../../../contexts/useToast';
import { useApiError } from '../../../hooks/useApiError';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { useBranding } from '../../../contexts/BrandingContext';
import ErrorBanner from '../../../components/ErrorBanner';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { adminSettingsTabs, defaultPermissions } from './adminSettings/constants';
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
import { useOrganizationSettings } from './adminSettings/hooks/useOrganizationSettings';
import { useUsersSettings } from './adminSettings/hooks/useUsersSettings';
import { usePortalSettings } from './adminSettings/hooks/usePortalSettings';
import { useRolesSettings } from './adminSettings/hooks/useRolesSettings';
import usePortalAdminRealtime from '../../../features/portal/admin/usePortalAdminRealtime';

const ADMIN_SETTINGS_MODE_KEY = 'admin_settings_mode_v1';
const ADMIN_SETTINGS_SECTION_KEY = 'admin_settings_section_v1';

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
    handlePhoneChange,
    handleBrandingChange,
    handleImageUpload,
    handleSaveOrganization,
    handleSaveBranding,
    isOrganizationDirty,
    isBrandingDirty,
  } = useOrganizationSettings({
    initialMode: persistedMode,
    setGlobalBranding,
  });
  const {
    roles,
    showRoleModal,
    setShowRoleModal,
    editingRole,
    setEditingRole,
    loadRoles,
    handleSaveRole,
    handleDeleteRole,
  } = useRolesSettings(confirm);
  const {
    userSearchQuery,
    setUserSearchQuery,
    userSearchResults,
    isSearching,
    selectedUser,
    userAuditLogs,
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
  const {
    portalRequests,
    portalInvitations,
    portalInviteEmail,
    setPortalInviteEmail,
    setPortalInviteContactId,
    portalInviteUrl,
    portalLoading,
    portalUsers,
    portalUsersLoading,
    portalUserSearch,
    setPortalUserSearch,
    portalUserActivity,
    portalActivityLoading,
    selectedPortalUser,
    portalResetTarget,
    setPortalResetTarget,
    portalResetPassword,
    setPortalResetPassword,
    portalResetConfirmPassword,
    setPortalResetConfirmPassword,
    portalResetLoading,
    showPortalResetModal,
    setShowPortalResetModal,
    portalContactSearch,
    setPortalContactSearch,
    portalContactResults,
    setPortalContactResults,
    portalContactLoading,
    selectedPortalContact,
    setSelectedPortalContact,
    portalAppointments,
    portalAppointmentsLoading,
    portalAppointmentsPagination,
    portalAppointmentFilters,
    portalSelectedAppointmentId,
    portalAppointmentReminders,
    portalAppointmentRemindersLoading,
    portalAppointmentActionLoading,
    portalReminderCustomMessage,
    setPortalReminderCustomMessage,
    onAppointmentUpdated,
    refreshPortalData,
    fetchPortalUsers,
    fetchPortalAppointments,
    handleApprovePortalRequest,
    handleRejectPortalRequest,
    handleCreatePortalInvite,
    handlePortalAppointmentFilterChange,
    handlePortalAppointmentStatusChange,
    handlePortalAppointmentCheckIn,
    handlePortalAppointmentReminderHistory,
    handlePortalSendAppointmentReminder,
    handlePortalUserStatusChange,
    handlePortalUserActivity,
    handlePortalPasswordReset,
  } = usePortalSettings({
    activeSection,
    showSuccess,
    showError,
    notifyError,
    confirm,
    setFormErrorFromError,
    clearFormError,
  });
  const portalSectionActive = activeSection === 'portal';
  const {
    streamStatus: portalStreamStatus,
    conversationFilters: portalConversationFilters,
    onConversationFilterChange: onPortalConversationFilterChange,
    portalConversationsLoading,
    portalConversationsLoadingMore,
    portalConversationsHasMore,
    portalConversations,
    selectedPortalConversation,
    portalConversationReply,
    setPortalConversationReply,
    portalConversationReplyInternal,
    setPortalConversationReplyInternal,
    portalConversationReplyLoading,
    fetchPortalConversations,
    loadMorePortalConversations,
    openPortalConversation,
    sendPortalConversationReply,
    updatePortalConversationStatus,
    slotFilters: portalSlotFilters,
    onSlotFilterChange: onPortalSlotFilterChange,
    portalSlotsLoading,
    portalSlotsLoadingMore,
    portalSlotsHasMore,
    portalSlots,
    portalSlotSaving,
    portalSlotForm,
    onPortalSlotFormChange,
    fetchPortalSlots,
    loadMorePortalSlots,
    createPortalSlot,
    updatePortalSlotStatus,
    deletePortalSlot,
  } = usePortalAdminRealtime({
    active: portalSectionActive,
    showSuccess,
    showError,
    notifyError,
    onAppointmentUpdated,
  });

  // Refs
  const iconInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const hasUnsavedChanges =
    !isSaving &&
    ((activeSection === 'organization' && isOrganizationDirty) ||
      (activeSection === 'branding' && isBrandingDirty));

  useUnsavedChangesGuard({ hasUnsavedChanges });

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

  const refreshPortalDataWithRealtime = async () => {
    await refreshPortalData({
      refreshConversations: () => fetchPortalConversations({ offsetValue: 0 }),
      refreshSlots: () => fetchPortalSlots({ offsetValue: 0 }),
    });
  };

  const handleDeletePortalSlot = async (slotId: string) => {
    const confirmed = await confirm({
      title: 'Delete Appointment Slot',
      message: 'This slot will be permanently deleted. Continue?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    await deletePortalSlot(slotId);
  };

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
              onRefreshPortal={refreshPortalDataWithRealtime}
              onApproveRequest={async (requestId) => {
                await handleApprovePortalRequest(requestId);
                await refreshPortalDataWithRealtime();
              }}
              onRejectRequest={async (requestId) => {
                await handleRejectPortalRequest(requestId);
                await refreshPortalDataWithRealtime();
              }}
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
              onCreateInvitation={async () => {
                await handleCreatePortalInvite();
                await refreshPortalDataWithRealtime();
              }}
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
              portalStreamStatus={portalStreamStatus}
              portalConversationFilters={portalConversationFilters}
              onPortalConversationFilterChange={onPortalConversationFilterChange}
              portalConversationsLoading={portalConversationsLoading}
              portalConversationsLoadingMore={portalConversationsLoadingMore}
              portalConversationsHasMore={portalConversationsHasMore}
              portalConversations={portalConversations}
              selectedPortalConversation={selectedPortalConversation}
              portalConversationReply={portalConversationReply}
              portalConversationReplyInternal={portalConversationReplyInternal}
              portalConversationReplyLoading={portalConversationReplyLoading}
              onRefreshPortalConversations={() => fetchPortalConversations({ offsetValue: 0 })}
              onLoadMorePortalConversations={loadMorePortalConversations}
              onOpenPortalConversation={openPortalConversation}
              onPortalConversationReplyChange={setPortalConversationReply}
              onPortalConversationReplyInternalChange={setPortalConversationReplyInternal}
              onSendPortalConversationReply={sendPortalConversationReply}
              onUpdatePortalConversationStatus={updatePortalConversationStatus}
              portalSlotFilters={portalSlotFilters}
              onPortalSlotFilterChange={onPortalSlotFilterChange}
              portalSlotsLoading={portalSlotsLoading}
              portalSlotsLoadingMore={portalSlotsLoadingMore}
              portalSlotsHasMore={portalSlotsHasMore}
              portalSlots={portalSlots}
              portalSlotSaving={portalSlotSaving}
              portalSlotForm={portalSlotForm}
              onPortalSlotFormChange={onPortalSlotFormChange}
              onCreatePortalSlot={createPortalSlot}
              onRefreshPortalSlots={() => fetchPortalSlots({ offsetValue: 0 })}
              onLoadMorePortalSlots={loadMorePortalSlots}
              onUpdatePortalSlotStatus={updatePortalSlotStatus}
              onDeletePortalSlot={handleDeletePortalSlot}
              portalAppointments={portalAppointments}
              portalAppointmentsLoading={portalAppointmentsLoading}
              portalAppointmentsPagination={portalAppointmentsPagination}
              portalAppointmentFilters={portalAppointmentFilters}
              onPortalAppointmentFilterChange={handlePortalAppointmentFilterChange}
              onPortalAppointmentPageChange={(page) =>
                void fetchPortalAppointments(page)
              }
              onRefreshPortalAppointments={() =>
                void fetchPortalAppointments(portalAppointmentsPagination.page)
              }
              onPortalAppointmentStatusChange={handlePortalAppointmentStatusChange}
              onPortalAppointmentCheckIn={handlePortalAppointmentCheckIn}
              selectedPortalAppointmentId={portalSelectedAppointmentId}
              portalAppointmentReminders={portalAppointmentReminders}
              portalAppointmentRemindersLoading={portalAppointmentRemindersLoading}
              portalAppointmentActionLoading={portalAppointmentActionLoading}
              onPortalAppointmentReminderHistory={handlePortalAppointmentReminderHistory}
              portalReminderCustomMessage={portalReminderCustomMessage}
              onPortalReminderCustomMessageChange={setPortalReminderCustomMessage}
              onPortalSendAppointmentReminder={handlePortalSendAppointmentReminder}
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
                        ? 'bg-app-accent-soft border-app-border'
                        : 'bg-app-accent-soft border-app-border'
                    }`}>
                      <div className={`flex items-center gap-2 font-medium mb-2 ${
                        inviteEmailDelivery?.requested && !inviteEmailDelivery?.sent
                          ? 'text-app-accent-text'
                          : 'text-app-accent-text'
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
                          ? 'text-app-accent-text'
                          : 'text-app-accent-text'
                      }`}>
                        {inviteEmailDelivery?.requested && inviteEmailDelivery?.sent
                          ? <>Invitation email sent to <strong>{inviteEmail}</strong>. You can also share this link manually:</>
                          : <>Share this link with <strong>{inviteEmail}</strong> to allow them to create their account:</>}
                      </p>
                      {inviteEmailDelivery?.reason && (
                        <p className="mt-2 text-xs text-app-accent-text">{inviteEmailDelivery.reason}</p>
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
