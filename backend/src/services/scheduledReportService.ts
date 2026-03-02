import { Pool } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import { ReportService } from '@services/reportService';
import { sendMail } from '@services/emailService';
import type {
  CreateScheduledReportDTO,
  ScheduledReport,
  ScheduledReportFrequency,
  ScheduledReportRun,
  ToggleScheduledReportDTO,
  UpdateScheduledReportDTO,
} from '@app-types/scheduledReport';
import type { ReportDefinition } from '@app-types/report';

const PROCESSING_STALE_TIMEOUT_MINUTES = 15;

interface ScheduledReportRow extends Omit<ScheduledReport, 'recipients'> {
  recipients: string[] | null;
}

interface ScheduledReportRunRow extends Omit<ScheduledReportRun, 'recipients'> {
  recipients: string[] | null;
}

const toIsoDateTime = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return value.toISOString();
};

const mapScheduledReport = (row: ScheduledReportRow): ScheduledReport => ({
  ...row,
  recipients: row.recipients || [],
  last_run_at: toIsoDateTime(row.last_run_at),
  next_run_at: toIsoDateTime(row.next_run_at) || new Date(row.next_run_at).toISOString(),
  processing_started_at: toIsoDateTime(row.processing_started_at),
  created_at: toIsoDateTime(row.created_at) || new Date(row.created_at).toISOString(),
  updated_at: toIsoDateTime(row.updated_at) || new Date(row.updated_at).toISOString(),
});

const mapRun = (row: ScheduledReportRunRow): ScheduledReportRun => ({
  ...row,
  recipients: row.recipients || [],
  started_at: toIsoDateTime(row.started_at) || new Date(row.started_at).toISOString(),
  completed_at: toIsoDateTime(row.completed_at),
  created_at: toIsoDateTime(row.created_at) || new Date(row.created_at).toISOString(),
});

interface TimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cacheKey = timeZone;
  const cached = partsFormatterCache.get(cacheKey);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  });
  partsFormatterCache.set(cacheKey, formatter);
  return formatter;
};

const weekdayToNumber: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const getTimeParts = (date: Date, timeZone: string): TimeParts & { weekday: number } => {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: weekdayToNumber[values.weekday] ?? 0,
  };
};

const comparableFromParts = (parts: TimeParts): number =>
  Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);

const partsToUtcDate = (parts: TimeParts, timeZone: string): Date => {
  let candidate = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  );

  for (let i = 0; i < 3; i += 1) {
    const actual = getTimeParts(candidate, timeZone);
    const diff = comparableFromParts(parts) - comparableFromParts(actual);
    if (diff === 0) break;
    candidate = new Date(candidate.getTime() + diff);
  }

  return candidate;
};

const addDays = (parts: TimeParts, days: number): TimeParts => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
  date.setUTCDate(date.getUTCDate() + days);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
};

const addMonths = (parts: TimeParts, months: number): TimeParts => {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, 1, parts.hour, parts.minute, parts.second));
  date.setUTCMonth(date.getUTCMonth() + months);

  const maxDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const targetDay = Math.min(parts.day, maxDay);
  date.setUTCDate(targetDay);

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
};

const computeNextRunAt = (input: {
  frequency: ScheduledReportFrequency;
  timezone: string;
  hour: number;
  minute: number;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  fromDate?: Date;
}): Date => {
  const now = input.fromDate || new Date();
  const nowParts = getTimeParts(now, input.timezone);

  let candidate: TimeParts = {
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
    hour: input.hour,
    minute: input.minute,
    second: 0,
  };

  if (input.frequency === 'weekly') {
    const targetWeekday = input.dayOfWeek ?? 1;
    const diff = (targetWeekday - nowParts.weekday + 7) % 7;
    candidate = addDays(candidate, diff);
    if (comparableFromParts(candidate) <= comparableFromParts(nowParts)) {
      candidate = addDays(candidate, 7);
    }
    return partsToUtcDate(candidate, input.timezone);
  }

  if (input.frequency === 'monthly') {
    const targetDay = input.dayOfMonth ?? 1;
    const safeDay = Math.max(1, Math.min(28, targetDay));
    candidate.day = safeDay;

    if (comparableFromParts(candidate) <= comparableFromParts(nowParts)) {
      candidate = addMonths(candidate, 1);
      candidate.day = safeDay;
    }
    return partsToUtcDate(candidate, input.timezone);
  }

  if (comparableFromParts(candidate) <= comparableFromParts(nowParts)) {
    candidate = addDays(candidate, 1);
  }

  return partsToUtcDate(candidate, input.timezone);
};

const validateTimezone = (timezone: string): void => {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error('Invalid timezone');
  }
};

const validateScheduleFields = (
  frequency: ScheduledReportFrequency,
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined
): void => {
  if (frequency === 'weekly' && dayOfWeek !== null && dayOfWeek !== undefined) {
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      throw new Error('day_of_week must be between 0 and 6');
    }
  }

  if (frequency === 'monthly' && dayOfMonth !== null && dayOfMonth !== undefined) {
    if (dayOfMonth < 1 || dayOfMonth > 28) {
      throw new Error('day_of_month must be between 1 and 28');
    }
  }
};

export class ScheduledReportService {
  private readonly reportService: ReportService;

  constructor(private readonly db: Pool) {
    this.reportService = new ReportService(db);
  }

  async listScheduledReports(organizationId: string): Promise<ScheduledReport[]> {
    const result = await this.db.query<ScheduledReportRow>(
      `SELECT *
       FROM scheduled_reports
       WHERE organization_id = $1
       ORDER BY created_at DESC`,
      [organizationId]
    );

    return result.rows.map(mapScheduledReport);
  }

  async getScheduledReportById(
    organizationId: string,
    scheduledReportId: string
  ): Promise<ScheduledReport | null> {
    const result = await this.db.query<ScheduledReportRow>(
      `SELECT *
       FROM scheduled_reports
       WHERE organization_id = $1
         AND id = $2
       LIMIT 1`,
      [organizationId, scheduledReportId]
    );

    if (result.rows.length === 0) return null;
    return mapScheduledReport(result.rows[0]);
  }

  async createScheduledReport(
    organizationId: string,
    userId: string,
    data: CreateScheduledReportDTO
  ): Promise<ScheduledReport> {
    validateTimezone(data.timezone || 'UTC');

    const reportResult = await this.db.query<{
      id: string;
      name: string;
      report_definition: ReportDefinition | string;
    }>(
      `SELECT id, name, report_definition
       FROM saved_reports
       WHERE id = $1
         AND (created_by = $2 OR is_public = TRUE)
       LIMIT 1`,
      [data.saved_report_id, userId]
    );

    if (reportResult.rows.length === 0) {
      throw new Error('Saved report not found or inaccessible');
    }

    const timezone = data.timezone || 'UTC';
    const frequency = data.frequency;
    const hour = data.hour ?? 9;
    const minute = data.minute ?? 0;
    const dayOfWeek = data.day_of_week ?? null;
    const dayOfMonth = data.day_of_month ?? null;

    validateScheduleFields(frequency, dayOfWeek, dayOfMonth);

    const nextRunAt = computeNextRunAt({
      frequency,
      timezone,
      hour,
      minute,
      dayOfWeek,
      dayOfMonth,
    });

    const result = await this.db.query<ScheduledReportRow>(
      `INSERT INTO scheduled_reports (
         organization_id,
         saved_report_id,
         name,
         recipients,
         format,
         frequency,
         timezone,
         hour,
         minute,
         day_of_week,
         day_of_month,
         is_active,
         next_run_at,
         created_by,
         modified_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
       RETURNING *`,
      [
        organizationId,
        data.saved_report_id,
        data.name || reportResult.rows[0].name,
        data.recipients,
        data.format || 'csv',
        frequency,
        timezone,
        hour,
        minute,
        dayOfWeek,
        dayOfMonth,
        data.is_active ?? true,
        nextRunAt.toISOString(),
        userId,
      ]
    );

    return mapScheduledReport(result.rows[0]);
  }

  async updateScheduledReport(
    organizationId: string,
    scheduledReportId: string,
    userId: string,
    data: UpdateScheduledReportDTO
  ): Promise<ScheduledReport | null> {
    const current = await this.getScheduledReportById(organizationId, scheduledReportId);
    if (!current) return null;

    const timezone = data.timezone ?? current.timezone;
    validateTimezone(timezone);

    const frequency = data.frequency ?? current.frequency;
    const hour = data.hour ?? current.hour;
    const minute = data.minute ?? current.minute;
    const dayOfWeek = data.day_of_week === undefined ? current.day_of_week : data.day_of_week;
    const dayOfMonth = data.day_of_month === undefined ? current.day_of_month : data.day_of_month;

    validateScheduleFields(frequency, dayOfWeek, dayOfMonth);

    const shouldRefreshNextRun =
      data.frequency !== undefined ||
      data.timezone !== undefined ||
      data.hour !== undefined ||
      data.minute !== undefined ||
      data.day_of_week !== undefined ||
      data.day_of_month !== undefined ||
      data.is_active !== undefined;

    const nextRunAt = shouldRefreshNextRun
      ? computeNextRunAt({
          frequency,
          timezone,
          hour,
          minute,
          dayOfWeek,
          dayOfMonth,
        }).toISOString()
      : current.next_run_at;

    const result = await this.db.query<ScheduledReportRow>(
      `UPDATE scheduled_reports
       SET name = COALESCE($3, name),
           recipients = COALESCE($4, recipients),
           format = COALESCE($5, format),
           frequency = COALESCE($6, frequency),
           timezone = COALESCE($7, timezone),
           hour = COALESCE($8, hour),
           minute = COALESCE($9, minute),
           day_of_week = $10,
           day_of_month = $11,
           is_active = COALESCE($12, is_active),
           next_run_at = $13,
           modified_by = $14,
           updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [
        organizationId,
        scheduledReportId,
        data.name ?? null,
        data.recipients ?? null,
        data.format ?? null,
        data.frequency ?? null,
        data.timezone ?? null,
        data.hour ?? null,
        data.minute ?? null,
        dayOfWeek,
        dayOfMonth,
        data.is_active ?? null,
        nextRunAt,
        userId,
      ]
    );

    if (result.rows.length === 0) return null;
    return mapScheduledReport(result.rows[0]);
  }

  async toggleScheduledReport(
    organizationId: string,
    scheduledReportId: string,
    userId: string,
    data: ToggleScheduledReportDTO
  ): Promise<ScheduledReport | null> {
    const current = await this.getScheduledReportById(organizationId, scheduledReportId);
    if (!current) return null;

    const nextState = data.is_active ?? !current.is_active;
    const nextRunAt = nextState
      ? computeNextRunAt({
          frequency: current.frequency,
          timezone: current.timezone,
          hour: current.hour,
          minute: current.minute,
          dayOfWeek: current.day_of_week,
          dayOfMonth: current.day_of_month,
        }).toISOString()
      : current.next_run_at;

    const result = await this.db.query<ScheduledReportRow>(
      `UPDATE scheduled_reports
       SET is_active = $3,
           next_run_at = $4,
           modified_by = $5,
           updated_at = NOW()
       WHERE organization_id = $1
         AND id = $2
       RETURNING *`,
      [organizationId, scheduledReportId, nextState, nextRunAt, userId]
    );

    if (result.rows.length === 0) return null;
    return mapScheduledReport(result.rows[0]);
  }

  async deleteScheduledReport(
    organizationId: string,
    scheduledReportId: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM scheduled_reports
       WHERE organization_id = $1
         AND id = $2
       RETURNING id`,
      [organizationId, scheduledReportId]
    );

    return result.rows.length > 0;
  }

  async listScheduledReportRuns(
    organizationId: string,
    scheduledReportId: string,
    limit = 20
  ): Promise<ScheduledReportRun[]> {
    const result = await this.db.query<ScheduledReportRunRow>(
      `SELECT runs.*
       FROM scheduled_report_runs runs
       INNER JOIN scheduled_reports reports ON reports.id = runs.scheduled_report_id
       WHERE reports.organization_id = $1
         AND reports.id = $2
       ORDER BY runs.created_at DESC
       LIMIT $3`,
      [organizationId, scheduledReportId, limit]
    );

    return result.rows.map(mapRun);
  }

  async createRunRecord(
    scheduledReportId: string,
    recipients: string[]
  ): Promise<ScheduledReportRun> {
    const result = await this.db.query<ScheduledReportRunRow>(
      `INSERT INTO scheduled_report_runs (
         scheduled_report_id,
         status,
         recipients,
         metadata
       )
       VALUES ($1, 'running', $2, '{}'::jsonb)
       RETURNING *`,
      [scheduledReportId, recipients]
    );

    return mapRun(result.rows[0]);
  }

  async markRunResult(
    runId: string,
    payload: {
      status: 'success' | 'failed' | 'skipped';
      rowsCount?: number;
      fileFormat?: 'csv' | 'xlsx';
      fileName?: string;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ScheduledReportRun> {
    const result = await this.db.query<ScheduledReportRunRow>(
      `UPDATE scheduled_report_runs
       SET status = $2,
           completed_at = NOW(),
           rows_count = $3,
           file_format = $4,
           file_name = $5,
           error_message = $6,
           metadata = COALESCE($7::jsonb, metadata)
       WHERE id = $1
       RETURNING *`,
      [
        runId,
        payload.status,
        payload.rowsCount ?? null,
        payload.fileFormat ?? null,
        payload.fileName ?? null,
        payload.errorMessage ?? null,
        payload.metadata ? JSON.stringify(payload.metadata) : null,
      ]
    );

    return mapRun(result.rows[0]);
  }

  async runScheduledReportNow(
    organizationId: string,
    scheduledReportId: string
  ): Promise<ScheduledReportRun | null> {
    const report = await this.getScheduledReportById(organizationId, scheduledReportId);
    if (!report) return null;

    return this.executeReport(report, true);
  }

  async claimDueReports(batchSize: number): Promise<ScheduledReport[]> {
    const result = await this.db.query<ScheduledReportRow>(
      `WITH due AS (
         SELECT id
         FROM scheduled_reports
         WHERE is_active = true
           AND next_run_at <= NOW()
           AND (
             processing_started_at IS NULL
             OR processing_started_at < NOW() - INTERVAL '${PROCESSING_STALE_TIMEOUT_MINUTES} minutes'
           )
         ORDER BY next_run_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE scheduled_reports reports
       SET processing_started_at = NOW(),
           updated_at = NOW()
       FROM due
       WHERE reports.id = due.id
       RETURNING reports.*`,
      [batchSize]
    );

    return result.rows.map(mapScheduledReport);
  }

  async processClaimedReports(claimedReports: ScheduledReport[]): Promise<number> {
    let processed = 0;

    for (const report of claimedReports) {
      processed += 1;
      try {
        await this.executeReport(report, false);
      } catch (error) {
        logger.error('Scheduled report execution failed', {
          scheduledReportId: report.id,
          error,
        });
      }
    }

    return processed;
  }

  private async executeReport(
    report: ScheduledReport,
    isManualRun: boolean
  ): Promise<ScheduledReportRun> {
    const run = await this.createRunRecord(report.id, report.recipients);

    try {
      const savedReportResult = await this.db.query<{
        id: string;
        entity: string;
        report_definition: ReportDefinition | string;
      }>(
        `SELECT id, entity, report_definition
         FROM saved_reports
         WHERE id = $1
         LIMIT 1`,
        [report.saved_report_id]
      );

      if (savedReportResult.rows.length === 0) {
        throw new Error('Saved report definition not found');
      }

      const savedReport = savedReportResult.rows[0];
      const definition =
        typeof savedReport.report_definition === 'string'
          ? (JSON.parse(savedReport.report_definition) as ReportDefinition)
          : (savedReport.report_definition as ReportDefinition);

      const generated = await this.reportService.generateReport(definition);
      const fileBuffer = await this.reportService.exportReport(generated, report.format);
      const fileName = `${savedReport.entity}_report_${new Date().toISOString().slice(0, 10)}.${report.format}`;

      let deliveryStatus: 'success' | 'failed' | 'skipped' = 'success';
      let deliveryError: string | undefined;

      if (report.recipients.length === 0) {
        deliveryStatus = 'skipped';
      } else {
        const delivered = await sendMail({
          to: report.recipients,
          subject: `Scheduled Report: ${report.name}`,
          text: `Your scheduled report "${report.name}" is attached.\n\nRows: ${generated.data.length}`,
          html: `<p>Your scheduled report <strong>${report.name}</strong> is attached.</p><p>Rows: ${generated.data.length}</p>`,
          attachments: [
            {
              filename: fileName,
              content: fileBuffer,
            },
          ],
        });

        if (!delivered) {
          deliveryStatus = 'failed';
          deliveryError = 'Email delivery failed';
        }
      }

      const finalizedRun = await this.markRunResult(run.id, {
        status: deliveryStatus,
        rowsCount: generated.data.length,
        fileFormat: report.format,
        fileName,
        errorMessage: deliveryError,
        metadata: {
          recipientsCount: report.recipients.length,
          manual: isManualRun,
        },
      });

      const nextRunAt = computeNextRunAt({
        frequency: report.frequency,
        timezone: report.timezone,
        hour: report.hour,
        minute: report.minute,
        dayOfWeek: report.day_of_week,
        dayOfMonth: report.day_of_month,
      }).toISOString();

      await this.db.query(
        `UPDATE scheduled_reports
         SET processing_started_at = NULL,
             last_run_at = NOW(),
             next_run_at = $2,
             last_error = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [report.id, nextRunAt]
      );

      return finalizedRun;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.markRunResult(run.id, {
        status: 'failed',
        errorMessage: message,
      });

      await this.db.query(
        `UPDATE scheduled_reports
         SET processing_started_at = NULL,
             last_error = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [report.id, message]
      );

      throw error;
    }
  }
}

export const scheduledReportService = new ScheduledReportService(pool);
