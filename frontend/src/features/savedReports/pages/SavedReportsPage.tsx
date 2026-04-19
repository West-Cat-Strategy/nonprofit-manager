import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../../components/ConfirmDialog';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import {
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  SelectField,
} from '../../../components/ui';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';
import { useAppSelector } from '../../../store/hooks';
import { getReportAccess } from '../../auth/state/reportAccess';
import useSavedReportsController from '../hooks/useSavedReportsController';
import type { ReportEntity } from '../../../types/report';
import type { ScheduledReportFormat, ScheduledReportFrequency } from '../../../types/scheduledReport';

function SavedReports() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { canManageReports, canManageScheduledReports } = getReportAccess(user);
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const {
    closeShareDialog,
    error,
    filterEntity,
    filteredReports,
    handleCopyPublicLink,
    handleDeleteReport,
    handleGeneratePublicLink,
    handleLoadReport,
    handleRemoveShare,
    handleRevokePublicLink,
    handleSaveShare,
    handleSchedule,
    loadSavedReports,
    loadSharePrincipals,
    loading,
    openShareDialog,
    pagination,
    publicLinkDisplay,
    publicLinkExpiryLocal,
    resetScheduleDialog,
    scheduleDayOfMonth,
    scheduleDayOfWeek,
    scheduleFormat,
    scheduleFrequency,
    scheduleHour,
    scheduleMinute,
    scheduleRecipients,
    scheduleTarget,
    scheduleTimezone,
    selectedRoleNames,
    selectedUserIds,
    setCurrentPage,
    setFilterEntity,
    setPublicLinkExpiryLocal,
    setScheduleDayOfMonth,
    setScheduleDayOfWeek,
    setScheduleFormat,
    setScheduleFrequency,
    setScheduleHour,
    setScheduleMinute,
    setScheduleRecipients,
    setScheduleTarget,
    setScheduleTimezone,
    setSelectedRoleNames,
    setSelectedUserIds,
    setShareCanEdit,
    setShareSearch,
    shareBusy,
    shareCanEdit,
    shareError,
    shareRoles,
    shareSearch,
    shareTarget,
    shareUsers,
    toggleSelection,
  } = useSavedReportsController();

  const handleConfirmDelete = async (id: string, name: string) => {
    const confirmed = await confirm(confirmPresets.delete(`Saved Report "${name}"`));
    if (!confirmed) {
      return;
    }
    await handleDeleteReport(id);
  };

  return (
    <NeoBrutalistLayout pageTitle="SAVED REPORTS">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Saved Reports"
          description={
            canManageReports || canManageScheduledReports
              ? 'Reuse, share, and schedule previously-defined report configurations.'
              : 'Browse saved report definitions. Creating, sharing, and scheduling are limited to report managers.'
          }
          actions={
            canManageReports ? (
            <PrimaryButton onClick={() => navigate('/reports/builder')}>Create New Report</PrimaryButton>
            ) : undefined
          }
        />

        {error && <ErrorState message={error} onRetry={() => void loadSavedReports()} />}

        <SectionCard title="Filter" subtitle="Narrow reports by entity.">
          <SelectField
            id="filter-entity"
            label="Filter by Entity"
            value={filterEntity}
            onChange={(event) => {
              setFilterEntity(event.target.value as ReportEntity | '');
              setCurrentPage(1);
            }}
          >
            <option value="">All Entities</option>
            <option value="accounts">Accounts</option>
            <option value="contacts">Contacts</option>
            <option value="donations">Donations</option>
            <option value="events">Events</option>
            <option value="volunteers">Volunteers</option>
            <option value="tasks">Tasks</option>
          </SelectField>
        </SectionCard>

        {loading ? (
          <LoadingState label="Loading saved reports..." />
        ) : filteredReports.length === 0 ? (
          <EmptyState
            title="No saved reports found"
            description={
              canManageReports
                ? 'Build and save a report definition to make it reusable.'
                : 'Saved reports shared with you will appear here.'
            }
            action={
              canManageReports ? (
              <PrimaryButton onClick={() => navigate('/reports/builder')}>
                Create Your First Report
              </PrimaryButton>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredReports.map((report) => (
              <SectionCard
                key={report.id}
                title={report.name}
                subtitle={report.description || 'No description provided.'}
                className="h-full"
                actions={
                  report.is_public ? (
                    <span className="inline-flex items-center rounded-full border border-app-border bg-app-accent-soft px-2 py-1 text-xs font-semibold text-app-accent-text">
                      Public
                    </span>
                  ) : null
                }
              >
                <div className="space-y-3">
                  <p>
                    <span className="inline-flex items-center rounded-full border border-app-border-muted bg-app-surface-muted px-2 py-1 text-xs capitalize text-app-text-muted">
                      {report.entity}
                    </span>
                  </p>

                  <div className="space-y-1 text-xs text-app-text-muted">
                    <p>Created: {new Date(report.created_at).toLocaleDateString()}</p>
                    <p>Updated: {new Date(report.updated_at).toLocaleDateString()}</p>
                    {'report_definition' in report && report.report_definition ? (
                      <p>
                        Fields: {report.report_definition.fields?.length || 0}
                        {report.report_definition.aggregations &&
                          report.report_definition.aggregations.length > 0 &&
                          ` • Aggregations: ${report.report_definition.aggregations.length}`}
                        {report.report_definition.filters &&
                          report.report_definition.filters.length > 0 &&
                          ` • Filters: ${report.report_definition.filters.length}`}
                      </p>
                    ) : (
                      <p>Definition details load when opening the report.</p>
                    )}
                  </div>

                  {(canManageReports || canManageScheduledReports) && (
                    <div className="grid grid-cols-2 gap-2">
                      {canManageReports && (
                        <PrimaryButton
                          className="px-3 py-2 text-xs"
                          onClick={() => handleLoadReport(report)}
                        >
                          Load & Run
                        </PrimaryButton>
                      )}
                      {canManageScheduledReports && (
                        <SecondaryButton
                          className="px-3 py-2 text-xs"
                          onClick={() => setScheduleTarget(report)}
                        >
                          Schedule
                        </SecondaryButton>
                      )}
                      {canManageReports && (
                        <>
                          <SecondaryButton
                            className="px-3 py-2 text-xs"
                            onClick={() => openShareDialog(report)}
                          >
                            Share
                          </SecondaryButton>
                          <SecondaryButton
                            className="px-3 py-2 text-xs text-app-accent-text"
                            onClick={() => void handleConfirmDelete(report.id, report.name)}
                          >
                            Delete
                          </SecondaryButton>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </SectionCard>
            ))}
          </div>
        )}

        {!loading && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface p-3">
            <span className="text-xs text-app-text-muted">
              Page {pagination.page} of {pagination.total_pages} ({pagination.total} reports)
            </span>
            <div className="flex items-center gap-2">
              <SecondaryButton
                className="px-3 py-1 text-xs"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </SecondaryButton>
              <SecondaryButton
                className="px-3 py-1 text-xs"
                disabled={pagination.page >= pagination.total_pages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(pagination.total_pages, prev + 1))
                }
              >
                Next
              </SecondaryButton>
            </div>
          </div>
        )}

        {scheduleTarget && canManageScheduledReports && (
          <div className="fixed inset-0 z-50 flex items-center justify-center app-popup-backdrop p-4">
            <div className="w-full max-w-3xl rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface p-5 shadow-lg">
              <PageHeader
                title="Schedule Report"
                description={scheduleTarget.name}
                actions={<SecondaryButton onClick={resetScheduleDialog}>Close</SecondaryButton>}
              />

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <FormField
                  label="Recipients (comma-separated)"
                  value={scheduleRecipients}
                  onChange={(event) => setScheduleRecipients(event.target.value)}
                  placeholder="ops@example.org, manager@example.org"
                />

                <SelectField
                  label="Frequency"
                  value={scheduleFrequency}
                  onChange={(event) =>
                    setScheduleFrequency(event.target.value as ScheduledReportFrequency)
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </SelectField>

                <SelectField
                  label="Format"
                  value={scheduleFormat}
                  onChange={(event) => setScheduleFormat(event.target.value as ScheduledReportFormat)}
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">XLSX</option>
                </SelectField>

                <FormField
                  label="Timezone"
                  value={scheduleTimezone}
                  onChange={(event) => setScheduleTimezone(event.target.value)}
                />

                <FormField
                  type="number"
                  min={0}
                  max={23}
                  label="Hour"
                  value={scheduleHour}
                  onChange={(event) => setScheduleHour(event.target.value)}
                />

                <FormField
                  type="number"
                  min={0}
                  max={59}
                  label="Minute"
                  value={scheduleMinute}
                  onChange={(event) => setScheduleMinute(event.target.value)}
                />

                {scheduleFrequency === 'weekly' && (
                  <SelectField
                    label="Day of Week"
                    value={scheduleDayOfWeek}
                    onChange={(event) => setScheduleDayOfWeek(event.target.value)}
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </SelectField>
                )}

                {scheduleFrequency === 'monthly' && (
                  <FormField
                    type="number"
                    min={1}
                    max={28}
                    label="Day of Month"
                    value={scheduleDayOfMonth}
                    onChange={(event) => setScheduleDayOfMonth(event.target.value)}
                  />
                )}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <SecondaryButton onClick={resetScheduleDialog}>Cancel</SecondaryButton>
                <PrimaryButton onClick={() => void handleSchedule()}>Save Schedule</PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {shareTarget && canManageReports && (
          <div className="fixed inset-0 z-50 flex items-center justify-center app-popup-backdrop p-4">
            <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[var(--ui-radius-md)] border border-app-border bg-app-surface p-5 shadow-lg">
              <PageHeader
                title="Share Saved Report"
                description={shareTarget.name}
                actions={<SecondaryButton onClick={closeShareDialog}>Close</SecondaryButton>}
              />

              {shareError && (
                <ErrorState
                  className="mt-4"
                  message={shareError}
                />
              )}

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <SectionCard title="Share Principals" subtitle="Choose users and roles that can access this report.">
                  <div className="mb-3 flex gap-2">
                    <FormField
                      label="Search Users"
                      className="mt-0"
                      value={shareSearch}
                      onChange={(event) => setShareSearch(event.target.value)}
                      placeholder="Search users"
                    />
                    <PrimaryButton
                      className="self-end"
                      onClick={() => void loadSharePrincipals(shareSearch)}
                      disabled={shareBusy}
                    >
                      Search
                    </PrimaryButton>
                  </div>

                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-text-label">Users</p>
                  <div className="max-h-48 space-y-1 overflow-auto rounded-[var(--ui-radius-sm)] border border-app-border-muted p-2">
                    {shareUsers.map((user) => (
                      <label key={user.id} className="flex items-start gap-2 text-sm text-app-text">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={() =>
                            setSelectedUserIds((current) => toggleSelection(current, user.id))
                          }
                        />
                        <span>
                          <strong>
                            {user.full_name || `${user.first_name} ${user.last_name}`.trim()}
                          </strong>
                          <br />
                          <span className="text-xs text-app-text-muted">{user.email}</span>
                        </span>
                      </label>
                    ))}
                    {!shareBusy && shareUsers.length === 0 && (
                      <p className="text-xs text-app-text-muted">No users found.</p>
                    )}
                  </div>

                  <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-app-text-label">Roles</p>
                  <div className="space-y-1 rounded-[var(--ui-radius-sm)] border border-app-border-muted p-2">
                    {shareRoles.map((role) => (
                      <label key={role.name} className="flex items-center gap-2 text-sm text-app-text">
                        <input
                          type="checkbox"
                          checked={selectedRoleNames.includes(role.name)}
                          onChange={() =>
                            setSelectedRoleNames((current) => toggleSelection(current, role.name))
                          }
                        />
                        <span>{role.label}</span>
                      </label>
                    ))}
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-app-text">
                    <input
                      type="checkbox"
                      checked={shareCanEdit}
                      onChange={(event) => setShareCanEdit(event.target.checked)}
                    />
                    Allow edits for shared users/roles
                  </label>
                </SectionCard>

                <SectionCard title="Public Link" subtitle="Create or revoke a link for external viewers.">
                  <FormField
                    type="datetime-local"
                    label="Expiry"
                    value={publicLinkExpiryLocal}
                    onChange={(event) => setPublicLinkExpiryLocal(event.target.value)}
                  />

                  {publicLinkDisplay ? (
                    <div className="mt-3 rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface-muted px-3 py-2 text-xs text-app-text break-all">
                      {publicLinkDisplay}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-app-text-muted">No active public link.</p>
                  )}

                  <p className="mt-2 text-xs text-app-text-muted">
                    {publicLinkExpiryLocal
                      ? `Expires: ${new Date(publicLinkExpiryLocal).toLocaleString()}`
                      : 'No expiry set'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => void handleGeneratePublicLink()} disabled={shareBusy}>
                      Generate Link
                    </PrimaryButton>
                    <SecondaryButton onClick={() => void handleCopyPublicLink()} disabled={!publicLinkDisplay}>
                      Copy Link
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => void handleRevokePublicLink()}
                      disabled={!publicLinkDisplay || shareBusy}
                      className="text-app-accent-text"
                    >
                      Revoke Link
                    </SecondaryButton>
                  </div>
                </SectionCard>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <SecondaryButton onClick={closeShareDialog}>Close</SecondaryButton>
                <SecondaryButton
                  onClick={() => void handleRemoveShare()}
                  disabled={shareBusy}
                  className="text-app-accent-text"
                >
                  Remove Selected
                </SecondaryButton>
                <PrimaryButton onClick={() => void handleSaveShare()} disabled={shareBusy}>
                  Save Sharing
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
      </div>
    </NeoBrutalistLayout>
  );
}

export default SavedReports;
