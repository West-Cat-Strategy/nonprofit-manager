import { Fragment } from 'react';
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
import { useAppSelector } from '../../../store/hooks';
import { getReportAccess } from '../../auth/state/reportAccess';
import type { ScheduledReportFormat, ScheduledReportFrequency } from '../../../types/scheduledReport';
import useScheduledReportsController from '../hooks/useScheduledReportsController';

const formatSchedule = (
  frequency: ScheduledReportFrequency,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null
): string => {
  if (frequency === 'weekly') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Weekly (${days[dayOfWeek ?? 1]})`;
  }

  if (frequency === 'monthly') {
    return `Monthly (day ${dayOfMonth ?? 1})`;
  }

  return 'Daily';
};

export default function ScheduledReportsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const { canExportReports, canManageScheduledReports } = getReportAccess(user);
  const {
    clearForm,
    closeEditDialog,
    downloadingExportJobId,
    editTarget,
    error,
    form,
    handleCreate,
    handleDelete,
    handleDownloadRunArtifact,
    handleOpenHistory,
    handleRunNow,
    handleSaveEdit,
    handleToggleScheduledReport,
    historyReportId,
    loadAllScheduledData,
    loading,
    openEditDialog,
    runsByReportId,
    savedReports,
    searchQuery,
    setForm,
    setSearchQuery,
    setShowCreate,
    setStatusFilter,
    showCreate,
    sortedReports,
    statusFilter,
  } = useScheduledReportsController();

  const renderScheduleForm = (
    mode: 'create' | 'edit',
    onSubmit: () => Promise<void>,
    onCancel: () => void
  ) => {
    const submitLabel = mode === 'create' ? 'Save Schedule' : 'Save Changes';
    const title = mode === 'create' ? 'Create Schedule' : 'Edit Schedule';

    return (
      <SectionCard
        title={title}
        subtitle="Configure recipients, cadence, and timezone for recurring delivery."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSubmit();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {mode === 'create' && (
              <SelectField
                required
                label="Saved Report"
                value={form.saved_report_id}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    saved_report_id: event.target.value,
                    name:
                      prev.name ||
                      savedReports.find((report) => report.id === event.target.value)?.name ||
                      '',
                  }))
                }
              >
                <option value="">Select saved report</option>
                {savedReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                  </option>
                ))}
              </SelectField>
            )}

            <FormField
              label="Schedule Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />

            <FormField
              required
              className={mode === 'create' ? 'lg:col-span-2' : 'md:col-span-2'}
              label="Recipients (comma-separated emails)"
              value={form.recipients}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, recipients: event.target.value }))
              }
              placeholder="ops@example.org, director@example.org"
            />

            <SelectField
              label="Frequency"
              value={form.frequency}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  frequency: event.target.value as ScheduledReportFrequency,
                }))
              }
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </SelectField>

            <SelectField
              label="Format"
              value={form.format}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, format: event.target.value as ScheduledReportFormat }))
              }
            >
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
            </SelectField>

            <FormField
              label="Timezone"
              value={form.timezone}
              onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
            />

            <div className="space-y-1.5">
              <p className="block text-xs font-semibold uppercase tracking-wide text-app-text-label">Time (HH:MM)</p>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  aria-label="Hour"
                  type="number"
                  min={0}
                  max={23}
                  label="Hour"
                  className="mt-0"
                  value={form.hour}
                  onChange={(event) => setForm((prev) => ({ ...prev, hour: event.target.value }))}
                />
                <FormField
                  aria-label="Minute"
                  type="number"
                  min={0}
                  max={59}
                  label="Minute"
                  className="mt-0"
                  value={form.minute}
                  onChange={(event) => setForm((prev) => ({ ...prev, minute: event.target.value }))}
                />
              </div>
            </div>

            {form.frequency === 'weekly' && (
              <SelectField
                label="Day of Week"
                value={form.day_of_week}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, day_of_week: event.target.value }))
                }
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

            {form.frequency === 'monthly' && (
              <FormField
                type="number"
                min={1}
                max={28}
                label="Day of Month"
                value={form.day_of_month}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, day_of_month: event.target.value }))
                }
              />
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton type="button" onClick={onCancel}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
          </div>
        </form>
      </SectionCard>
    );
  };

  return (
    <NeoBrutalistLayout pageTitle="SCHEDULED REPORTS">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Scheduled Reports"
          description={
            canManageScheduledReports
              ? 'Schedule recurring report delivery with run history and on-demand execution.'
              : 'Review schedule status and delivery history. Creating or modifying schedules is limited to report managers.'
          }
          actions={
            canManageScheduledReports ? (
            <PrimaryButton onClick={() => setShowCreate((prev) => !prev)}>
              {showCreate ? 'Close Creator' : 'New Schedule'}
            </PrimaryButton>
            ) : undefined
          }
        />

        {canManageScheduledReports &&
          showCreate &&
          renderScheduleForm('create', handleCreate, () => {
            clearForm();
            setShowCreate(false);
          })}

        {canManageScheduledReports &&
          editTarget &&
          renderScheduleForm('edit', handleSaveEdit, closeEditDialog)}

        <SectionCard title="Filters" subtitle="Search and narrow schedules by status.">
          <div className="grid gap-3 md:grid-cols-3">
            <FormField
              label="Search Schedules"
              className="md:col-span-2"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, recipient, or frequency"
            />
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as 'all' | 'active' | 'paused')
              }
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </SelectField>
          </div>
        </SectionCard>

        {error && <ErrorState message={error} onRetry={() => void loadAllScheduledData()} />}

        {loading ? (
          <LoadingState label="Loading schedules..." />
        ) : sortedReports.length === 0 ? (
          <EmptyState
            title="No schedules created yet"
            description={
              canManageScheduledReports
                ? 'Create a schedule to automatically send saved reports to stakeholders.'
                : 'Schedules shared with you will appear here once report managers create them.'
            }
            action={
              canManageScheduledReports ? (
                <PrimaryButton onClick={() => setShowCreate(true)}>Create first schedule</PrimaryButton>
              ) : undefined
            }
          />
        ) : (
          <SectionCard
            title="Schedules"
            subtitle={
              canManageScheduledReports
                ? 'Manage status, run reports now, and inspect run history.'
                : 'Inspect delivery status and review run history.'
            }
          >
            <div className="overflow-x-auto rounded-[var(--ui-radius-sm)] border border-app-border-muted">
              <table className="min-w-full divide-y divide-app-border-muted bg-app-surface text-sm">
                <thead className="bg-app-surface-muted">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">Recipients</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">Schedule</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">Next Run</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-text-muted">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border-muted">
                  {sortedReports.map((report) => (
                    <Fragment key={report.id}>
                      <tr>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-app-text">{report.name}</p>
                          <p className="text-xs text-app-text-muted">Format: {report.format.toUpperCase()}</p>
                        </td>
                        <td className="px-3 py-2 text-app-text">{report.recipients.join(', ')}</td>
                        <td className="px-3 py-2 text-app-text">
                          {formatSchedule(report.frequency, report.day_of_week, report.day_of_month)}
                          <p className="text-xs text-app-text-muted">
                            {String(report.hour).padStart(2, '0')}:{String(report.minute).padStart(2, '0')} ({report.timezone})
                          </p>
                        </td>
                        <td className="px-3 py-2 text-app-text">{new Date(report.next_run_at).toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                              report.is_active
                                ? 'bg-app-accent-soft text-app-accent-text'
                                : 'bg-app-surface-muted text-app-text-muted'
                            }`}
                          >
                            {report.is_active ? 'Active' : 'Paused'}
                          </span>
                          {report.last_error && (
                            <p className="mt-1 text-xs text-app-accent-text">{report.last_error}</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {canManageScheduledReports && (
                              <>
                                <SecondaryButton
                                  className="px-2 py-1 text-xs"
                                  onClick={() => void handleToggleScheduledReport(report.id)}
                                >
                                  {report.is_active ? 'Pause' : 'Resume'}
                                </SecondaryButton>
                                <PrimaryButton
                                  className="px-2 py-1 text-xs"
                                  onClick={() => void handleRunNow(report.id)}
                                >
                                  Run Now
                                </PrimaryButton>
                                <SecondaryButton
                                  className="px-2 py-1 text-xs"
                                  onClick={() => openEditDialog(report)}
                                >
                                  Edit
                                </SecondaryButton>
                              </>
                            )}
                            <SecondaryButton
                              className="px-2 py-1 text-xs"
                              onClick={() => void handleOpenHistory(report.id)}
                            >
                              {historyReportId === report.id ? 'Hide Runs' : 'View Runs'}
                            </SecondaryButton>
                            {canManageScheduledReports && (
                              <SecondaryButton
                                className="px-2 py-1 text-xs text-app-accent-text"
                                onClick={() => {
                                  if (!window.confirm('Delete this schedule?')) return;
                                  void handleDelete(report.id);
                                }}
                              >
                                Delete
                              </SecondaryButton>
                            )}
                          </div>
                        </td>
                      </tr>

                      {historyReportId === report.id && (
                        <tr className="bg-app-surface-muted/40">
                          <td colSpan={6} className="px-3 py-3">
                            <p className="mb-2 text-sm font-semibold text-app-text">Recent Runs</p>
                            {(runsByReportId[report.id] || []).length === 0 ? (
                              <p className="text-xs text-app-text-muted">No run history yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {(runsByReportId[report.id] || []).map((run) => (
                                  <div
                                    key={run.id}
                                    className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface px-3 py-2"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                      <span className="font-semibold uppercase text-app-text">{run.status}</span>
                                      <span className="text-app-text-muted">
                                        {new Date(run.started_at).toLocaleString()}
                                      </span>
                                      <span className="text-app-text-muted">{run.rows_count ?? 0} rows</span>
                                    </div>
                                    <p className="mt-1 text-[11px] text-app-text-muted">
                                      Completed: {run.completed_at ? new Date(run.completed_at).toLocaleString() : '—'}
                                      {' • '}
                                      Artifact: {run.file_name || '-'}
                                    </p>
                                    {run.error_message && (
                                      <p className="mt-1 text-[11px] text-app-accent-text">Error: {run.error_message}</p>
                                    )}
                                    {canExportReports && run.status === 'success' && run.reportExportJobId && (
                                      <SecondaryButton
                                        className="mt-2 px-2 py-1 text-[11px]"
                                        onClick={() => void handleDownloadRunArtifact(run)}
                                        disabled={downloadingExportJobId === run.reportExportJobId}
                                      >
                                        {downloadingExportJobId === run.reportExportJobId
                                          ? 'Downloading...'
                                          : 'Download Artifact'}
                                      </SecondaryButton>
                                    )}
                                    {canManageScheduledReports && run.status === 'failed' && (
                                      <SecondaryButton
                                        className="mt-2 px-2 py-1 text-[11px]"
                                        onClick={() => void handleRunNow(report.id)}
                                      >
                                        Retry Failed Run
                                      </SecondaryButton>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}
      </div>
    </NeoBrutalistLayout>
  );
}
