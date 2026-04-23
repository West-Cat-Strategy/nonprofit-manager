import type { ScheduledReport, ScheduledReportRun } from '@app-types/scheduledReport';

export interface ScheduledReportRow extends Omit<ScheduledReport, 'recipients'> {
  recipients: string[] | null;
}

export interface ScheduledReportRunRow extends Omit<ScheduledReportRun, 'recipients'> {
  recipients: string[] | null;
}

const parseMetadata = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
};

const toIsoDateTime = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return value.toISOString();
};

export const mapScheduledReport = (row: ScheduledReportRow): ScheduledReport => ({
  ...row,
  recipients: row.recipients || [],
  last_run_at: toIsoDateTime(row.last_run_at),
  next_run_at: toIsoDateTime(row.next_run_at) || new Date(row.next_run_at).toISOString(),
  processing_started_at: toIsoDateTime(row.processing_started_at),
  created_at: toIsoDateTime(row.created_at) || new Date(row.created_at).toISOString(),
  updated_at: toIsoDateTime(row.updated_at) || new Date(row.updated_at).toISOString(),
});

export const mapScheduledReportRun = (row: ScheduledReportRunRow): ScheduledReportRun => {
  const metadata = parseMetadata(row.metadata);

  return {
    ...row,
    metadata,
    reportExportJobId:
      typeof metadata?.reportExportJobId === 'string' ? metadata.reportExportJobId : null,
    recipients: row.recipients || [],
    started_at: toIsoDateTime(row.started_at) || new Date(row.started_at).toISOString(),
    completed_at: toIsoDateTime(row.completed_at),
    created_at: toIsoDateTime(row.created_at) || new Date(row.created_at).toISOString(),
  };
};
