import type { ReportFormat } from './report';

export type ScheduledReportFrequency = 'daily' | 'weekly' | 'monthly';
export type ScheduledReportRunStatus = 'running' | 'success' | 'failed' | 'skipped';

export interface ScheduledReport {
  id: string;
  organization_id: string;
  saved_report_id: string;
  name: string;
  recipients: string[];
  format: Extract<ReportFormat, 'csv' | 'xlsx'>;
  frequency: ScheduledReportFrequency;
  timezone: string;
  hour: number;
  minute: number;
  day_of_week?: number | null;
  day_of_month?: number | null;
  is_active: boolean;
  last_run_at?: string | null;
  next_run_at: string;
  processing_started_at?: string | null;
  last_error?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledReportRun {
  id: string;
  scheduled_report_id: string;
  status: ScheduledReportRunStatus;
  started_at: string;
  completed_at?: string | null;
  rows_count?: number | null;
  file_format?: 'csv' | 'xlsx' | null;
  file_name?: string | null;
  recipients: string[];
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateScheduledReportDTO {
  saved_report_id: string;
  name?: string;
  recipients: string[];
  format?: 'csv' | 'xlsx';
  frequency: ScheduledReportFrequency;
  timezone?: string;
  hour?: number;
  minute?: number;
  day_of_week?: number;
  day_of_month?: number;
  is_active?: boolean;
}

export interface UpdateScheduledReportDTO {
  name?: string;
  recipients?: string[];
  format?: 'csv' | 'xlsx';
  frequency?: ScheduledReportFrequency;
  timezone?: string;
  hour?: number;
  minute?: number;
  day_of_week?: number | null;
  day_of_month?: number | null;
  is_active?: boolean;
}

export interface ToggleScheduledReportDTO {
  is_active?: boolean;
}
