import { describe, expect, it } from 'vitest';
import reducer, {
  clearScheduledReportsError,
  createScheduledReport,
  deleteScheduledReport,
  fetchScheduledReportRuns,
  fetchScheduledReports,
  runScheduledReportNow,
  toggleScheduledReport,
} from '../scheduledReportsSlice';

const makeReport = (overrides: Record<string, unknown> = {}) => ({
  id: 'sr-1',
  organization_id: 'org-1',
  saved_report_id: 'saved-1',
  name: 'Weekly Pipeline',
  recipients: ['ops@example.org'],
  format: 'csv',
  frequency: 'weekly',
  timezone: 'UTC',
  hour: 9,
  minute: 0,
  day_of_week: 1,
  day_of_month: null,
  is_active: true,
  last_run_at: null,
  next_run_at: '2026-03-03T09:00:00.000Z',
  processing_started_at: null,
  last_error: null,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

const makeRun = (overrides: Record<string, unknown> = {}) => ({
  id: 'run-1',
  scheduled_report_id: 'sr-1',
  status: 'success',
  started_at: '2026-03-01T09:00:00.000Z',
  completed_at: '2026-03-01T09:00:01.000Z',
  rows_count: 12,
  file_format: 'csv',
  file_name: 'weekly.csv',
  recipients: ['ops@example.org'],
  error_message: null,
  metadata: null,
  created_at: '2026-03-01T09:00:01.000Z',
  ...overrides,
});

const initialState = {
  reports: [],
  runsByReportId: {},
  loading: false,
  error: null,
};

describe('scheduledReportsSlice reducers', () => {
  it('clears errors', () => {
    const state = reducer({ ...initialState, error: 'boom' }, clearScheduledReportsError());
    expect(state.error).toBeNull();
  });
});

describe('scheduledReportsSlice async reducers', () => {
  it('stores reports from fetch', () => {
    const reports = [makeReport()];
    const state = reducer(
      initialState,
      { type: fetchScheduledReports.fulfilled.type, payload: reports }
    );

    expect(state.reports).toHaveLength(1);
  });

  it('upserts report on create/toggle', () => {
    const created = makeReport();
    const toggled = makeReport({ is_active: false });

    const afterCreate = reducer(
      initialState,
      { type: createScheduledReport.fulfilled.type, payload: created }
    );

    const afterToggle = reducer(
      afterCreate,
      { type: toggleScheduledReport.fulfilled.type, payload: toggled }
    );

    expect(afterToggle.reports[0].is_active).toBe(false);
  });

  it('stores run history and prepends manual run', () => {
    const run = makeRun();

    const withHistory = reducer(
      initialState,
      {
        type: fetchScheduledReportRuns.fulfilled.type,
        payload: { scheduledReportId: 'sr-1', runs: [run] },
      }
    );

    expect(withHistory.runsByReportId['sr-1']).toHaveLength(1);

    const manualRun = makeRun({ id: 'run-2' });
    const afterRunNow = reducer(
      withHistory,
      {
        type: runScheduledReportNow.fulfilled.type,
        payload: { scheduledReportId: 'sr-1', run: manualRun },
      }
    );

    expect(afterRunNow.runsByReportId['sr-1'][0].id).toBe('run-2');
  });

  it('removes schedule and cached runs on delete', () => {
    const state = reducer(
      {
        ...initialState,
        reports: [makeReport()] as never[],
        runsByReportId: {
          'sr-1': [makeRun()] as never[],
        },
      },
      { type: deleteScheduledReport.fulfilled.type, payload: 'sr-1' }
    );

    expect(state.reports).toHaveLength(0);
    expect(state.runsByReportId['sr-1']).toBeUndefined();
  });
});
