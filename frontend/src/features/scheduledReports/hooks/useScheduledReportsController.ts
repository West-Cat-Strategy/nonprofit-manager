import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import { scheduledReportsApiClient } from '../api/scheduledReportsApiClient';
import { savedReportsApiClient } from '../../savedReports/api/savedReportsApiClient';
import { reportsApiClient } from '../../reports/api/reportsApiClient';
import { triggerFileDownload } from '../../../services/fileDownload';
import type {
  ScheduledReport,
  ScheduledReportFormat,
  ScheduledReportFrequency,
  ScheduledReportRun,
} from '../../../types/scheduledReport';
import type { SavedReportListItem } from '../../../types/savedReport';

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

export function useScheduledReportsController() {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReportListItem[]>([]);
  const [runsByReportId, setRunsByReportId] = useState<Record<string, ScheduledReportRun[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editTarget, setEditTarget] = useState<ScheduledReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [historyReportId, setHistoryReportId] = useState<string | null>(null);
  const [downloadingExportJobId, setDownloadingExportJobId] = useState<string | null>(null);

  const formatLoadError = useMemo(
    () => formatApiErrorMessageWith('Failed to fetch scheduled reports'),
    []
  );
  const formatCreateError = useMemo(
    () => formatApiErrorMessageWith('Failed to create scheduled report'),
    []
  );
  const formatUpdateError = useMemo(
    () => formatApiErrorMessageWith('Failed to update scheduled report'),
    []
  );
  const formatToggleError = useMemo(
    () => formatApiErrorMessageWith('Failed to update scheduled report status'),
    []
  );
  const formatRunError = useMemo(
    () => formatApiErrorMessageWith('Failed to run scheduled report'),
    []
  );
  const formatDeleteError = useMemo(
    () => formatApiErrorMessageWith('Failed to delete scheduled report'),
    []
  );

  const loadAllScheduledData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [scheduledResponse, savedReportsResponse] = await Promise.all([
        scheduledReportsApiClient.fetchScheduledReports(),
        savedReportsApiClient.fetchSavedReports({ page: 1, limit: 100, summary: true }),
      ]);
      setReports(scheduledResponse);
      setSavedReports(savedReportsResponse.items);
    } catch (loadError) {
      setError(formatLoadError(loadError));
    } finally {
      setLoading(false);
    }
  }, [formatLoadError]);

  useEffect(() => {
    void loadAllScheduledData();
  }, [loadAllScheduledData]);

  const sortedReports = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    const filtered = reports.filter((report) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? report.is_active : !report.is_active);

      if (!matchesStatus) {
        return false;
      }
      if (!term) {
        return true;
      }

      return (
        report.name.toLowerCase().includes(term) ||
        report.recipients.join(',').toLowerCase().includes(term) ||
        report.frequency.toLowerCase().includes(term)
      );
    });

    return filtered.sort(
      (left, right) =>
        new Date(left.next_run_at).getTime() - new Date(right.next_run_at).getTime()
    );
  }, [reports, searchQuery, statusFilter]);

  const clearForm = () => {
    setForm(defaultForm);
  };

  const openEditDialog = (report: ScheduledReport) => {
    setEditTarget(report);
    setForm({
      saved_report_id: report.saved_report_id,
      name: report.name,
      recipients: report.recipients.join(', '),
      format: report.format,
      frequency: report.frequency,
      timezone: report.timezone,
      hour: String(report.hour),
      minute: String(report.minute),
      day_of_week: String(report.day_of_week ?? 1),
      day_of_month: String(report.day_of_month ?? 1),
    });
  };

  const closeEditDialog = () => {
    setEditTarget(null);
    clearForm();
  };

  const handleCreate = async () => {
    const recipients = form.recipients
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!form.saved_report_id || recipients.length === 0) {
      return;
    }

    try {
      const created = await scheduledReportsApiClient.createScheduledReport({
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
      });
      setReports((current) => [created, ...current.filter((report) => report.id !== created.id)]);
      clearForm();
      setShowCreate(false);
    } catch (createError) {
      const message = formatCreateError(createError);
      setError(message);
      window.alert(message);
    }
  };

  const handleOpenHistory = async (scheduledReportId: string) => {
    if (historyReportId === scheduledReportId) {
      setHistoryReportId(null);
      return;
    }

    setHistoryReportId(scheduledReportId);
    try {
      const runs = await scheduledReportsApiClient.fetchScheduledReportRuns(scheduledReportId, 20);
      setRunsByReportId((current) => ({
        ...current,
        [scheduledReportId]: runs,
      }));
    } catch (loadError) {
      setError(formatLoadError(loadError));
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) {
      return;
    }

    const recipients = form.recipients
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return;
    }

    try {
      const updated = await scheduledReportsApiClient.updateScheduledReport(editTarget.id, {
        name: form.name || undefined,
        recipients,
        format: form.format,
        frequency: form.frequency,
        timezone: form.timezone,
        hour: Number(form.hour),
        minute: Number(form.minute),
        day_of_week: form.frequency === 'weekly' ? Number(form.day_of_week) : null,
        day_of_month: form.frequency === 'monthly' ? Number(form.day_of_month) : null,
      });
      setReports((current) =>
        current.map((report) => (report.id === updated.id ? updated : report))
      );
      closeEditDialog();
    } catch (updateError) {
      const message = formatUpdateError(updateError);
      setError(message);
      window.alert(message);
    }
  };

  const handleDownloadRunArtifact = async (run: ScheduledReportRun) => {
    if (!run.reportExportJobId) {
      return;
    }

    setDownloadingExportJobId(run.reportExportJobId);
    try {
      const file = await reportsApiClient.downloadExportJob(
        run.reportExportJobId,
        run.file_name || `scheduled-report.${run.file_format || 'csv'}`
      );
      triggerFileDownload(file);
    } catch (downloadError) {
      console.error('Failed to download scheduled report artifact', downloadError);
      window.alert('Failed to download scheduled report artifact');
    } finally {
      setDownloadingExportJobId((current) =>
        current === run.reportExportJobId ? null : current
      );
    }
  };

  const handleToggleScheduledReport = async (scheduledReportId: string) => {
    try {
      const updated = await scheduledReportsApiClient.toggleScheduledReport(scheduledReportId, {});
      setReports((current) =>
        current.map((report) => (report.id === updated.id ? updated : report))
      );
    } catch (toggleError) {
      const message = formatToggleError(toggleError);
      setError(message);
      window.alert(message);
    }
  };

  const handleRunNow = async (scheduledReportId: string) => {
    try {
      const run = await scheduledReportsApiClient.runScheduledReportNow(scheduledReportId);
      setRunsByReportId((current) => ({
        ...current,
        [scheduledReportId]: [run, ...(current[scheduledReportId] || [])],
      }));
    } catch (runError) {
      const message = formatRunError(runError);
      setError(message);
      window.alert(message);
    }
  };

  const handleDelete = async (scheduledReportId: string) => {
    try {
      await scheduledReportsApiClient.deleteScheduledReport(scheduledReportId);
      setReports((current) => current.filter((report) => report.id !== scheduledReportId));
      setRunsByReportId((current) => {
        const next = { ...current };
        delete next[scheduledReportId];
        return next;
      });
    } catch (deleteError) {
      const message = formatDeleteError(deleteError);
      setError(message);
      window.alert(message);
    }
  };

  return {
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
    reports,
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
  };
}

export default useScheduledReportsController;
