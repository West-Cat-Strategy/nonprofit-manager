import type { ScheduledReport } from '../../../types/scheduledReport';

export type ScheduledReportHealthStatus = 'healthy' | 'running' | 'attention' | 'paused';

export interface ScheduledReportHealth {
  status: ScheduledReportHealthStatus;
  label: string;
  detail: string;
}

const parseTimestamp = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

export const formatScheduledReportTimestamp = (value?: string | null): string => {
  const time = parseTimestamp(value);
  return time === null ? 'Not available' : new Date(time).toLocaleString();
};

export const getScheduledReportHealth = (
  report: ScheduledReport,
  now = Date.now()
): ScheduledReportHealth => {
  if (report.last_error) {
    return {
      status: 'attention',
      label: 'Needs attention',
      detail: report.last_error,
    };
  }

  if (!report.is_active) {
    return {
      status: 'paused',
      label: 'Paused',
      detail: `Last run: ${formatScheduledReportTimestamp(report.last_run_at)}`,
    };
  }

  if (report.processing_started_at) {
    return {
      status: 'running',
      label: 'Running',
      detail: `Started: ${formatScheduledReportTimestamp(report.processing_started_at)}`,
    };
  }

  const nextRunAt = parseTimestamp(report.next_run_at);
  if (nextRunAt !== null && nextRunAt < now) {
    return {
      status: 'attention',
      label: 'Needs attention',
      detail: `Overdue since ${formatScheduledReportTimestamp(report.next_run_at)}`,
    };
  }

  return {
    status: 'healthy',
    label: 'On schedule',
    detail: `Next run: ${formatScheduledReportTimestamp(report.next_run_at)}`,
  };
};

export const scheduledReportNeedsAttention = (report: ScheduledReport, now = Date.now()): boolean =>
  getScheduledReportHealth(report, now).status === 'attention';
