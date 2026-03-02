import { Fragment, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import NeoBrutalistLayout from '../../components/neo-brutalist/NeoBrutalistLayout';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createScheduledReport,
  deleteScheduledReport,
  fetchScheduledReportRuns,
  fetchScheduledReports,
  runScheduledReportNow,
  toggleScheduledReport,
} from '../../store/slices/scheduledReportsSlice';
import { fetchSavedReports } from '../../store/slices/savedReportsSlice';
import type { ScheduledReportFrequency, ScheduledReportFormat } from '../../types/scheduledReport';

const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const defaultForm = {
  saved_report_id: '',
  name: '',
  recipients: '',
  format: 'csv' as ScheduledReportFormat,
  frequency: 'weekly' as ScheduledReportFrequency,
  timezone: localTimezone,
  hour: '9',
  minute: '0',
  day_of_week: '1',
  day_of_month: '1',
};

const formatSchedule = (frequency: ScheduledReportFrequency, dayOfWeek?: number | null, dayOfMonth?: number | null): string => {
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
  const dispatch = useAppDispatch();
  const { reports, runsByReportId, loading, error } = useAppSelector((state) => state.scheduledReports);
  const { reports: savedReports } = useAppSelector((state) => state.savedReports);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [historyReportId, setHistoryReportId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchScheduledReports());
    dispatch(fetchSavedReports());
  }, [dispatch]);

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => new Date(a.next_run_at).getTime() - new Date(b.next_run_at).getTime()),
    [reports]
  );

  const clearForm = () => {
    setForm(defaultForm);
  };

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();

    const recipients = form.recipients
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!form.saved_report_id || recipients.length === 0) {
      return;
    }

    await dispatch(
      createScheduledReport({
        saved_report_id: form.saved_report_id,
        name: form.name || undefined,
        recipients,
        format: form.format,
        frequency: form.frequency,
        timezone: form.timezone,
        hour: Number(form.hour),
        minute: Number(form.minute),
        day_of_week: form.frequency === 'weekly' ? Number(form.day_of_week) : undefined,
        day_of_month: form.frequency === 'monthly' ? Number(form.day_of_month) : undefined,
      })
    );

    await dispatch(fetchScheduledReports());
    clearForm();
    setShowCreate(false);
  };

  const handleOpenHistory = async (scheduledReportId: string) => {
    if (historyReportId === scheduledReportId) {
      setHistoryReportId(null);
      return;
    }

    setHistoryReportId(scheduledReportId);
    await dispatch(fetchScheduledReportRuns({ scheduledReportId, limit: 20 }));
  };

  return (
    <NeoBrutalistLayout pageTitle="SCHEDULED REPORTS">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-[var(--app-text)]">Scheduled Reports</h1>
            <p className="text-sm text-[var(--app-text-muted)] mt-1">
              Schedule recurring report delivery with run history and on-demand execution.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((prev) => !prev)}
            className="px-4 py-2 border-2 border-[var(--app-border)] bg-[var(--loop-cyan)] text-black font-bold shadow-[3px_3px_0px_0px_var(--shadow-color)]"
          >
            {showCreate ? 'Cancel' : 'New Schedule'}
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-6 border-2 border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[4px_4px_0px_0px_var(--shadow-color)]"
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col text-sm font-bold">
                Saved Report
                <select
                  required
                  value={form.saved_report_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, saved_report_id: event.target.value, name: prev.name || savedReports.find((report) => report.id === event.target.value)?.name || '' }))}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <option value="">Select saved report</option>
                  {savedReports.map((report) => (
                    <option key={report.id} value={report.id}>{report.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col text-sm font-bold">
                Schedule Name
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>

              <label className="flex flex-col text-sm font-bold md:col-span-2">
                Recipients (comma-separated emails)
                <input
                  required
                  value={form.recipients}
                  onChange={(event) => setForm((prev) => ({ ...prev, recipients: event.target.value }))}
                  placeholder="ops@example.org, director@example.org"
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>

              <label className="flex flex-col text-sm font-bold">
                Frequency
                <select
                  value={form.frequency}
                  onChange={(event) => setForm((prev) => ({ ...prev, frequency: event.target.value as ScheduledReportFrequency }))}
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
                  value={form.format}
                  onChange={(event) => setForm((prev) => ({ ...prev, format: event.target.value as ScheduledReportFormat }))}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">XLSX</option>
                </select>
              </label>

              <label className="flex flex-col text-sm font-bold">
                Timezone
                <input
                  value={form.timezone}
                  onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                  className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                />
              </label>

              <label className="flex flex-col text-sm font-bold">
                Time (HH:MM)
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={form.hour}
                    onChange={(event) => setForm((prev) => ({ ...prev, hour: event.target.value }))}
                    className="w-1/2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                  />
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={form.minute}
                    onChange={(event) => setForm((prev) => ({ ...prev, minute: event.target.value }))}
                    className="w-1/2 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                  />
                </div>
              </label>

              {form.frequency === 'weekly' && (
                <label className="flex flex-col text-sm font-bold">
                  Day of Week
                  <select
                    value={form.day_of_week}
                    onChange={(event) => setForm((prev) => ({ ...prev, day_of_week: event.target.value }))}
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

              {form.frequency === 'monthly' && (
                <label className="flex flex-col text-sm font-bold">
                  Day of Month
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={form.day_of_month}
                    onChange={(event) => setForm((prev) => ({ ...prev, day_of_month: event.target.value }))}
                    className="mt-1 border-2 border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2"
                  />
                </label>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setShowCreate(false);
                }}
                className="border-2 border-[var(--app-border)] px-4 py-2 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="border-2 border-[var(--app-border)] bg-[var(--loop-green)] px-4 py-2 font-bold text-black"
              >
                Save Schedule
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mb-4 border-2 border-red-600 bg-red-100 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto border-2 border-[var(--app-border)] bg-[var(--app-surface)] shadow-[4px_4px_0px_0px_var(--shadow-color)]">
          <table className="min-w-full divide-y divide-[var(--app-border)] text-sm">
            <thead className="bg-[var(--app-surface-muted)]">
              <tr>
                <th className="px-3 py-2 text-left font-black uppercase">Name</th>
                <th className="px-3 py-2 text-left font-black uppercase">Recipients</th>
                <th className="px-3 py-2 text-left font-black uppercase">Schedule</th>
                <th className="px-3 py-2 text-left font-black uppercase">Next Run</th>
                <th className="px-3 py-2 text-left font-black uppercase">Status</th>
                <th className="px-3 py-2 text-left font-black uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-6">Loading schedules...</td></tr>
              ) : sortedReports.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6">No schedules created yet.</td></tr>
              ) : (
                sortedReports.map((report) => (
                  <Fragment key={report.id}>
                    <tr key={report.id} className="border-t border-[var(--app-border)]">
                      <td className="px-3 py-2">
                        <div className="font-bold">{report.name}</div>
                        <div className="text-xs text-[var(--app-text-muted)]">Format: {report.format.toUpperCase()}</div>
                      </td>
                      <td className="px-3 py-2">{report.recipients.join(', ')}</td>
                      <td className="px-3 py-2">
                        {formatSchedule(report.frequency, report.day_of_week, report.day_of_month)}<br />
                        <span className="text-xs text-[var(--app-text-muted)]">{String(report.hour).padStart(2, '0')}:{String(report.minute).padStart(2, '0')} ({report.timezone})</span>
                      </td>
                      <td className="px-3 py-2">{new Date(report.next_run_at).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 text-xs font-bold ${report.is_active ? 'bg-green-100 text-green-700' : 'bg-app-surface-muted text-app-text-muted'}`}>
                          {report.is_active ? 'ACTIVE' : 'PAUSED'}
                        </span>
                        {report.last_error && (
                          <div className="mt-1 text-xs text-red-700">{report.last_error}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => void dispatch(toggleScheduledReport({ scheduledReportId: report.id }))}
                            className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold"
                          >
                            {report.is_active ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void dispatch(runScheduledReportNow(report.id))}
                            className="border-2 border-[var(--app-border)] bg-[var(--loop-yellow)] px-2 py-1 text-xs font-bold"
                          >
                            Run Now
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleOpenHistory(report.id)}
                            className="border-2 border-[var(--app-border)] px-2 py-1 text-xs font-bold"
                          >
                            {historyReportId === report.id ? 'Hide Runs' : 'View Runs'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm('Delete this schedule?')) return;
                              void dispatch(deleteScheduledReport(report.id));
                            }}
                            className="border-2 border-red-600 bg-red-100 px-2 py-1 text-xs font-bold text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {historyReportId === report.id && (
                      <tr>
                        <td colSpan={6} className="px-3 py-3 bg-[var(--app-surface-muted)]">
                          <p className="font-bold mb-2">Recent Runs</p>
                          {(runsByReportId[report.id] || []).length === 0 ? (
                            <p className="text-xs text-[var(--app-text-muted)]">No run history yet.</p>
                          ) : (
                            <div className="space-y-1 text-xs">
                              {(runsByReportId[report.id] || []).map((run) => (
                                <div key={run.id} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--app-border)] px-2 py-1">
                                  <span className="font-bold uppercase">{run.status}</span>
                                  <span>{new Date(run.started_at).toLocaleString()}</span>
                                  <span>{run.rows_count ?? 0} rows</span>
                                  <span>{run.error_message || run.file_name || '-'}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </NeoBrutalistLayout>
  );
}
