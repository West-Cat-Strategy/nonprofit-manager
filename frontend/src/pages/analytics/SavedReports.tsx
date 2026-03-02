import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchSavedReports, deleteSavedReport } from '../../store/slices/savedReportsSlice';
import { createScheduledReport } from '../../store/slices/scheduledReportsSlice';
import type { SavedReport } from '../../types/savedReport';
import type { ScheduledReportFormat, ScheduledReportFrequency } from '../../types/scheduledReport';
import ConfirmDialog from '../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../hooks/useConfirmDialog';

const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function SavedReports() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { reports, loading, error } = useAppSelector((state) => state.savedReports);
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();
  const [filterEntity, setFilterEntity] = useState<string>('');
  const [scheduleTarget, setScheduleTarget] = useState<SavedReport | null>(null);
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduledReportFrequency>('weekly');
  const [scheduleFormat, setScheduleFormat] = useState<ScheduledReportFormat>('csv');
  const [scheduleTimezone, setScheduleTimezone] = useState(localTimezone);
  const [scheduleHour, setScheduleHour] = useState('9');
  const [scheduleMinute, setScheduleMinute] = useState('0');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState('1');
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState('1');

  useEffect(() => {
    dispatch(fetchSavedReports());
  }, [dispatch]);

  const handleLoadReport = (report: SavedReport) => {
    // Navigate to report builder with the saved report ID
    navigate(`/reports/builder?load=${report.id}`);
  };

  const handleDeleteReport = async (id: string, name: string) => {
    const confirmed = await confirm(confirmPresets.delete(`Saved Report "${name}"`));
    if (!confirmed) return;
    await dispatch(deleteSavedReport(id));
  };

  const filteredReports = filterEntity
    ? reports.filter((r) => r.entity === filterEntity)
    : reports;

  const resetScheduleDialog = () => {
    setScheduleTarget(null);
    setScheduleRecipients('');
    setScheduleFrequency('weekly');
    setScheduleFormat('csv');
    setScheduleTimezone(localTimezone);
    setScheduleHour('9');
    setScheduleMinute('0');
    setScheduleDayOfWeek('1');
    setScheduleDayOfMonth('1');
  };

  const handleSchedule = async () => {
    if (!scheduleTarget) return;

    const recipients = scheduleRecipients
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return;
    }

    await dispatch(
      createScheduledReport({
        saved_report_id: scheduleTarget.id,
        name: scheduleTarget.name,
        recipients,
        format: scheduleFormat,
        frequency: scheduleFrequency,
        timezone: scheduleTimezone,
        hour: Number(scheduleHour),
        minute: Number(scheduleMinute),
        day_of_week: scheduleFrequency === 'weekly' ? Number(scheduleDayOfWeek) : undefined,
        day_of_month: scheduleFrequency === 'monthly' ? Number(scheduleDayOfMonth) : undefined,
      })
    );

    resetScheduleDialog();
    navigate('/reports/scheduled');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-app-text">Saved Reports</h1>
          <button
            type="button"
            onClick={() => navigate('/reports/builder')}
            className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
          >
            Create New Report
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Filter */}
        <div className="bg-app-surface shadow rounded-lg p-4 mb-6">
          <label htmlFor="filter-entity" className="block text-sm font-medium text-app-text-muted mb-2">
            Filter by Entity
          </label>
          <select
            id="filter-entity"
            value={filterEntity}
            onChange={(e) => setFilterEntity(e.target.value)}
            className="block w-full px-3 py-2 border border-app-input-border rounded-md shadow-sm focus:outline-none focus:ring-app-accent focus:border-app-accent"
          >
            <option value="">All Entities</option>
            <option value="accounts">Accounts</option>
            <option value="contacts">Contacts</option>
            <option value="donations">Donations</option>
            <option value="events">Events</option>
            <option value="volunteers">Volunteers</option>
            <option value="tasks">Tasks</option>
          </select>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent"></div>
            <p className="mt-2 text-app-text-muted">Loading saved reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-app-surface shadow rounded-lg p-12 text-center">
            <p className="text-app-text-muted mb-4">No saved reports found</p>
            <button
              type="button"
              onClick={() => navigate('/reports/builder')}
              className="px-4 py-2 bg-app-accent text-white rounded-lg hover:bg-app-accent-hover"
            >
              Create Your First Report
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="bg-app-surface shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-app-text flex-1">
                    {report.name}
                  </h3>
                  {report.is_public && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                      Public
                    </span>
                  )}
                </div>

                {report.description && (
                  <p className="text-sm text-app-text-muted mb-3">{report.description}</p>
                )}

                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-app-surface-muted text-app-text-muted text-sm rounded-full capitalize">
                    {report.entity}
                  </span>
                </div>

                <div className="text-xs text-app-text-muted mb-4">
                  <div>
                    Created: {new Date(report.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    Updated: {new Date(report.updated_at).toLocaleDateString()}
                  </div>
                  <div className="mt-1">
                    Fields: {report.report_definition.fields.length}
                    {report.report_definition.filters &&
                      report.report_definition.filters.length > 0 &&
                      ` • Filters: ${report.report_definition.filters.length}`}
                    {report.report_definition.sort &&
                      report.report_definition.sort.length > 0 &&
                      ` • Sorting: ${report.report_definition.sort.length}`}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadReport(report)}
                    className="flex-1 px-3 py-2 bg-app-accent text-white text-sm rounded hover:bg-app-accent-hover"
                  >
                    Load & Run
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleTarget(report)}
                    className="px-3 py-2 bg-[var(--loop-cyan)] text-black text-sm rounded border border-black font-bold"
                  >
                    Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteReport(report.id, report.name)}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      {scheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[6px_6px_0px_0px_var(--shadow-color)]">
            <h2 className="text-xl font-black text-[var(--app-text)]">Schedule Report</h2>
            <p className="mt-1 text-sm text-[var(--app-text-muted)]">{scheduleTarget.name}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm font-bold">
                Recipients (comma-separated)
                <input
                  value={scheduleRecipients}
                  onChange={(event) => setScheduleRecipients(event.target.value)}
                  placeholder="ops@example.org, manager@example.org"
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
              <label className="flex flex-col text-sm font-bold">
                Frequency
                <select
                  value={scheduleFrequency}
                  onChange={(event) => setScheduleFrequency(event.target.value as ScheduledReportFrequency)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className="flex flex-col text-sm font-bold">
                Format
                <select
                  value={scheduleFormat}
                  onChange={(event) => setScheduleFormat(event.target.value as ScheduledReportFormat)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">XLSX</option>
                </select>
              </label>
              <label className="flex flex-col text-sm font-bold">
                Timezone
                <input
                  value={scheduleTimezone}
                  onChange={(event) => setScheduleTimezone(event.target.value)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
              <label className="flex flex-col text-sm font-bold">
                Hour
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={scheduleHour}
                  onChange={(event) => setScheduleHour(event.target.value)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
              <label className="flex flex-col text-sm font-bold">
                Minute
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={scheduleMinute}
                  onChange={(event) => setScheduleMinute(event.target.value)}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>
              {scheduleFrequency === 'weekly' && (
                <label className="flex flex-col text-sm font-bold">
                  Day of Week
                  <select
                    value={scheduleDayOfWeek}
                    onChange={(event) => setScheduleDayOfWeek(event.target.value)}
                    className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                    <option value="2">Tuesday</option>
                    <option value="3">Wednesday</option>
                    <option value="4">Thursday</option>
                    <option value="5">Friday</option>
                    <option value="6">Saturday</option>
                  </select>
                </label>
              )}
              {scheduleFrequency === 'monthly' && (
                <label className="flex flex-col text-sm font-bold">
                  Day of Month
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={scheduleDayOfMonth}
                    onChange={(event) => setScheduleDayOfMonth(event.target.value)}
                    className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                  />
                </label>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={resetScheduleDialog}
                className="px-4 py-2 border-2 border-[var(--app-border)] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSchedule()}
                className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] font-bold"
              >
                Save Schedule
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  );
}

export default SavedReports;
