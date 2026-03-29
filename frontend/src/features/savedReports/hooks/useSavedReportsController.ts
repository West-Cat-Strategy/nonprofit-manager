import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatApiErrorMessageWith } from '../../../utils/apiError';
import { savedReportsApiClient } from '../api/savedReportsApiClient';
import { scheduledReportsApiClient } from '../../scheduledReports/api/scheduledReportsApiClient';
import type {
  SavedReportListItem,
  SharePrincipalRole,
  SharePrincipalUser,
} from '../../../types/savedReport';
import type { ReportEntity } from '../../../types/report';
import type {
  ScheduledReportFormat,
  ScheduledReportFrequency,
} from '../../../types/scheduledReport';

const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const formatLoadError = formatApiErrorMessageWith('Failed to fetch saved reports');
const formatDeleteError = formatApiErrorMessageWith('Failed to delete saved report');
const formatScheduleError = formatApiErrorMessageWith('Failed to create scheduled report');

const toDateTimeLocal = (isoValue?: string): string => {
  if (!isoValue) {
    return '';
  }
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

export function useSavedReportsController() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<SavedReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [filterEntity, setFilterEntity] = useState<ReportEntity | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [scheduleTarget, setScheduleTarget] = useState<SavedReportListItem | null>(null);
  const [shareTarget, setShareTarget] = useState<SavedReportListItem | null>(null);
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduledReportFrequency>('weekly');
  const [scheduleFormat, setScheduleFormat] = useState<ScheduledReportFormat>('csv');
  const [scheduleTimezone, setScheduleTimezone] = useState(localTimezone);
  const [scheduleHour, setScheduleHour] = useState('9');
  const [scheduleMinute, setScheduleMinute] = useState('0');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState('1');
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState('1');
  const [shareSearch, setShareSearch] = useState('');
  const [shareUsers, setShareUsers] = useState<SharePrincipalUser[]>([]);
  const [shareRoles, setShareRoles] = useState<SharePrincipalRole[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);
  const [shareCanEdit, setShareCanEdit] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [publicLinkExpiryLocal, setPublicLinkExpiryLocal] = useState('');
  const [publicLinkToken, setPublicLinkToken] = useState<string | null>(null);
  const [publicLinkUrl, setPublicLinkUrl] = useState<string | null>(null);

  const selectedEntity = filterEntity || undefined;

  const loadSavedReports = useCallback(
    async (page = currentPage) => {
      try {
        setLoading(true);
        setError(null);
        const response = await savedReportsApiClient.fetchSavedReports({
          entity: selectedEntity,
          page,
          limit: pagination.limit,
          summary: true,
        });
        setReports(response.items);
        setPagination(response.pagination);
      } catch (loadError) {
        setError(formatLoadError(loadError));
      } finally {
        setLoading(false);
      }
    },
    [currentPage, pagination.limit, selectedEntity]
  );

  useEffect(() => {
    void loadSavedReports(currentPage);
  }, [currentPage, loadSavedReports]);

  const filteredReports = reports;

  const publicLinkDisplay = useMemo(() => {
    if (!publicLinkToken) {
      return null;
    }
    return publicLinkUrl || `${window.location.origin}/public/reports/${publicLinkToken}`;
  }, [publicLinkToken, publicLinkUrl]);

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

  const handleLoadReport = (report: SavedReportListItem) => {
    navigate(`/reports/builder?load=${report.id}`);
  };

  const handleDeleteReport = async (id: string) => {
    try {
      await savedReportsApiClient.deleteSavedReport(id);
      await loadSavedReports(currentPage);
    } catch (deleteError) {
      const message = formatDeleteError(deleteError);
      setError(message);
      window.alert(message);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleTarget) {
      return;
    }

    const recipients = scheduleRecipients
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return;
    }

    try {
      await scheduledReportsApiClient.createScheduledReport({
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
      });
      resetScheduleDialog();
      navigate('/reports/scheduled');
    } catch (scheduleErrorValue) {
      const message = formatScheduleError(scheduleErrorValue);
      setError(message);
      window.alert(message);
    }
  };

  const loadSharePrincipals = async (search?: string) => {
    setShareBusy(true);
    setShareError(null);
    try {
      const principals = await savedReportsApiClient.fetchSharePrincipals(search, 25);
      setShareUsers(principals.users);
      setShareRoles(principals.roles);
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : 'Failed to load principals';
      setShareError(message);
    } finally {
      setShareBusy(false);
    }
  };

  const openShareDialog = (report: SavedReportListItem) => {
    setShareTarget(report);
    setSelectedUserIds(report.shared_with_users || []);
    setSelectedRoleNames(report.shared_with_roles || []);
    setShareCanEdit(Boolean(report.share_settings?.can_edit));
    setPublicLinkExpiryLocal(toDateTimeLocal(report.share_settings?.expires_at));
    setPublicLinkToken(report.public_token || null);
    setPublicLinkUrl(
      report.public_token ? `${window.location.origin}/public/reports/${report.public_token}` : null
    );
    setShareSearch('');
    void loadSharePrincipals();
  };

  const closeShareDialog = () => {
    setShareTarget(null);
    setShareUsers([]);
    setShareRoles([]);
    setSelectedUserIds([]);
    setSelectedRoleNames([]);
    setShareCanEdit(false);
    setShareBusy(false);
    setShareError(null);
    setPublicLinkExpiryLocal('');
    setPublicLinkToken(null);
    setPublicLinkUrl(null);
  };

  const toggleSelection = (current: string[], nextValue: string): string[] =>
    current.includes(nextValue)
      ? current.filter((value) => value !== nextValue)
      : [...current, nextValue];

  const refreshReportsAfterMutation = async () => {
    await loadSavedReports(currentPage);
  };

  const handleSaveShare = async () => {
    if (!shareTarget) {
      return;
    }
    setShareBusy(true);
    setShareError(null);
    try {
      const updated = await savedReportsApiClient.shareSavedReport(shareTarget.id, {
        user_ids: selectedUserIds,
        role_names: selectedRoleNames,
        share_settings: {
          can_edit: shareCanEdit,
          ...(publicLinkExpiryLocal
            ? { expires_at: new Date(publicLinkExpiryLocal).toISOString() }
            : {}),
        },
      });
      setShareTarget(updated);
      await refreshReportsAfterMutation();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to update sharing';
      setShareError(message);
    } finally {
      setShareBusy(false);
    }
  };

  const handleRemoveShare = async () => {
    if (!shareTarget) {
      return;
    }
    if (selectedUserIds.length === 0 && selectedRoleNames.length === 0) {
      setShareError('Select at least one user or role to remove');
      return;
    }

    setShareBusy(true);
    setShareError(null);
    try {
      const updated = await savedReportsApiClient.removeSavedReportShare(shareTarget.id, {
        user_ids: selectedUserIds,
        role_names: selectedRoleNames,
      });
      setShareTarget(updated);
      setSelectedUserIds([]);
      setSelectedRoleNames([]);
      await refreshReportsAfterMutation();
    } catch (removeError) {
      const message =
        removeError instanceof Error ? removeError.message : 'Failed to remove share access';
      setShareError(message);
    } finally {
      setShareBusy(false);
    }
  };

  const handleGeneratePublicLink = async () => {
    if (!shareTarget) {
      return;
    }
    setShareBusy(true);
    setShareError(null);
    try {
      const response = await savedReportsApiClient.generatePublicLink(
        shareTarget.id,
        publicLinkExpiryLocal ? new Date(publicLinkExpiryLocal).toISOString() : undefined
      );
      setPublicLinkToken(response.token);
      setPublicLinkUrl(`${window.location.origin}${response.url}`);
      await refreshReportsAfterMutation();
    } catch (generateError) {
      const message =
        generateError instanceof Error ? generateError.message : 'Failed to generate public link';
      setShareError(message);
    } finally {
      setShareBusy(false);
    }
  };

  const handleRevokePublicLink = async () => {
    if (!shareTarget) {
      return;
    }
    setShareBusy(true);
    setShareError(null);
    try {
      await savedReportsApiClient.revokePublicLink(shareTarget.id);
      setPublicLinkToken(null);
      setPublicLinkUrl(null);
      await refreshReportsAfterMutation();
    } catch (revokeError) {
      const message =
        revokeError instanceof Error ? revokeError.message : 'Failed to revoke public link';
      setShareError(message);
    } finally {
      setShareBusy(false);
    }
  };

  const handleCopyPublicLink = async () => {
    if (!publicLinkDisplay) {
      return;
    }
    try {
      await navigator.clipboard.writeText(publicLinkDisplay);
    } catch {
      setShareError('Unable to copy link to clipboard');
    }
  };

  return {
    closeShareDialog,
    currentPage,
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
    reports,
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
    selectedEntity,
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
  };
}

export default useSavedReportsController;
