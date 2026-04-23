import {
  mapScheduledReport,
  mapScheduledReportRun,
  type ScheduledReportRow,
  type ScheduledReportRunRow,
} from '@modules/scheduledReports/services/scheduledReportMappers';

const buildScheduledReportRow = (
  overrides: Partial<ScheduledReportRow> = {}
): ScheduledReportRow => ({
  id: 'sched-1',
  organization_id: 'org-1',
  saved_report_id: 'saved-1',
  name: 'Weekly pipeline',
  recipients: ['ops@example.com'],
  format: 'csv',
  frequency: 'daily',
  timezone: 'UTC',
  hour: 9,
  minute: 0,
  day_of_week: null,
  day_of_month: null,
  is_active: true,
  last_run_at: null,
  next_run_at: '2026-04-23T09:00:00.000Z',
  processing_started_at: null,
  last_error: null,
  created_by: 'user-1',
  created_at: '2026-04-22T12:34:56.000Z',
  updated_at: '2026-04-22T12:34:56.000Z',
  ...overrides,
});

const buildScheduledReportRunRow = (
  overrides: Partial<ScheduledReportRunRow> = {}
): ScheduledReportRunRow => ({
  id: 'run-1',
  scheduled_report_id: 'sched-1',
  status: 'running',
  recipients: ['ops@example.com'],
  started_at: '2026-04-22T12:34:56.000Z',
  completed_at: null,
  rows_count: null,
  file_format: null,
  file_name: null,
  error_message: null,
  metadata: null,
  created_at: '2026-04-22T12:34:56.000Z',
  ...overrides,
});

describe('scheduledReportMappers', () => {
  it('maps scheduled report rows with null recipients and normalized timestamps', () => {
    const result = mapScheduledReport(
      buildScheduledReportRow({
        recipients: null,
        last_run_at: '2026-04-21T22:00:00-07:00',
        next_run_at: '2026-04-23T09:00:00-07:00',
        processing_started_at: new Date('2026-04-22T12:00:00.000Z') as never,
        created_at: new Date('2026-04-20T08:15:30.000Z') as never,
        updated_at: '2026-04-22T05:34:56-07:00',
      })
    );

    expect(result.recipients).toEqual([]);
    expect(result.last_run_at).toBe('2026-04-22T05:00:00.000Z');
    expect(result.next_run_at).toBe('2026-04-23T16:00:00.000Z');
    expect(result.processing_started_at).toBe('2026-04-22T12:00:00.000Z');
    expect(result.created_at).toBe('2026-04-20T08:15:30.000Z');
    expect(result.updated_at).toBe('2026-04-22T12:34:56.000Z');
  });

  it('falls back to Date coercion when required scheduled report timestamps are null', () => {
    const result = mapScheduledReport(
      buildScheduledReportRow({
        next_run_at: null as never,
        created_at: null as never,
        updated_at: null as never,
      })
    );

    expect(result.next_run_at).toBe('1970-01-01T00:00:00.000Z');
    expect(result.created_at).toBe('1970-01-01T00:00:00.000Z');
    expect(result.updated_at).toBe('1970-01-01T00:00:00.000Z');
  });

  it('returns null metadata for invalid json payloads and preserves invalid timestamp strings', () => {
    const result = mapScheduledReportRun(
      buildScheduledReportRunRow({
        metadata: '{not-valid-json' as never,
        started_at: 'not-a-date',
        created_at: 'still-not-a-date',
      })
    );

    expect(result.metadata).toBeNull();
    expect(result.reportExportJobId).toBeNull();
    expect(result.started_at).toBe('not-a-date');
    expect(result.created_at).toBe('still-not-a-date');
  });

  it('parses string metadata, normalizes timestamps, and extracts a string report export job id', () => {
    const result = mapScheduledReportRun(
      buildScheduledReportRunRow({
        recipients: null,
        metadata: JSON.stringify({
          reportExportJobId: 'job-1',
          manual: true,
        }) as never,
        started_at: '2026-04-22T12:34:56-07:00',
        completed_at: new Date('2026-04-22T20:00:00.000Z') as never,
        created_at: new Date('2026-04-22T19:34:56.000Z') as never,
      })
    );

    expect(result.recipients).toEqual([]);
    expect(result.metadata).toEqual({
      reportExportJobId: 'job-1',
      manual: true,
    });
    expect(result.reportExportJobId).toBe('job-1');
    expect(result.started_at).toBe('2026-04-22T19:34:56.000Z');
    expect(result.completed_at).toBe('2026-04-22T20:00:00.000Z');
    expect(result.created_at).toBe('2026-04-22T19:34:56.000Z');
  });

  it('falls back to Date coercion when required run timestamps are null', () => {
    const result = mapScheduledReportRun(
      buildScheduledReportRunRow({
        started_at: null as never,
        created_at: null as never,
      })
    );

    expect(result.started_at).toBe('1970-01-01T00:00:00.000Z');
    expect(result.created_at).toBe('1970-01-01T00:00:00.000Z');
  });

  it('drops array metadata payloads because only object metadata is supported', () => {
    const result = mapScheduledReportRun(
      buildScheduledReportRunRow({
        metadata: ['unexpected', 'array'] as never,
      })
    );

    expect(result.metadata).toBeNull();
    expect(result.reportExportJobId).toBeNull();
  });

  it('preserves object metadata and only extracts report export job ids when they are strings', () => {
    const result = mapScheduledReportRun(
      buildScheduledReportRunRow({
        metadata: {
          reportExportJobId: 42,
          reason: 'not-a-string',
        } as never,
      })
    );

    expect(result.metadata).toEqual({
      reportExportJobId: 42,
      reason: 'not-a-string',
    });
    expect(result.reportExportJobId).toBeNull();
  });
});
