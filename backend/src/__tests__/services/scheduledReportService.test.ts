import type { ReportDefinition, ReportExportJob } from '@app-types/report';
import type { ScheduledReport } from '@app-types/scheduledReport';
import { ScheduledReportService } from '@modules/scheduledReports/services/scheduledReportService';
import type {
  ScheduledReportRow,
  ScheduledReportRunRow,
} from '@modules/scheduledReports/services/scheduledReportMappers';

const mockPoolQuery = jest.fn();
const sendMail = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('@config/database', () => ({
  __esModule: true,
  default: { query: (...args: unknown[]) => mockPoolQuery(...args) },
}));

jest.mock('@config/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@services/emailService', () => ({
  sendMail: (...args: unknown[]) => sendMail(...args),
}));

const NOW = new Date('2026-04-22T12:34:56.000Z');
const NOW_ISO = NOW.toISOString();

const REPORT_DEFINITION: ReportDefinition = {
  name: 'Opportunity Pipeline Core KPI',
  entity: 'opportunities',
  fields: ['name', 'weighted_amount'],
};

interface SavedReportRow {
  id: string;
  name: string;
  entity: string;
  report_definition: ReportDefinition | string;
}

const queryRows = <T,>(...rows: T[]) => ({ rows });

const buildScheduledReportRow = (
  overrides: Partial<ScheduledReportRow> = {}
): ScheduledReportRow => ({
  id: 'sched-1',
  organization_id: 'org-1',
  saved_report_id: 'saved-1',
  name: 'Opportunity KPI Schedule',
  recipients: ['ops@example.com'],
  format: 'csv',
  frequency: 'daily',
  timezone: 'UTC',
  hour: 9,
  minute: 0,
  day_of_week: null,
  day_of_month: null,
  is_active: true,
  next_run_at: '2026-04-23T09:00:00.000Z',
  last_run_at: null,
  processing_started_at: null,
  last_error: null,
  created_by: 'user-1',
  created_at: NOW_ISO,
  updated_at: NOW_ISO,
  ...overrides,
});

const buildScheduledReportRunRow = (
  overrides: Partial<ScheduledReportRunRow> = {}
): ScheduledReportRunRow => ({
  id: 'run-1',
  scheduled_report_id: 'sched-1',
  status: 'running',
  recipients: ['ops@example.com'],
  started_at: NOW_ISO,
  completed_at: null,
  rows_count: null,
  file_format: null,
  file_name: null,
  error_message: null,
  metadata: {},
  created_at: NOW_ISO,
  ...overrides,
});

const buildSavedReportRow = (overrides: Partial<SavedReportRow> = {}): SavedReportRow => ({
  id: 'saved-1',
  name: 'Opportunity Pipeline Core KPI',
  entity: 'opportunities',
  report_definition: REPORT_DEFINITION,
  ...overrides,
});

const buildExportJob = (overrides: Partial<ReportExportJob> = {}): ReportExportJob => ({
  id: 'job-1',
  organizationId: 'org-1',
  savedReportId: 'saved-1',
  scheduledReportId: 'sched-1',
  requestedBy: 'user-1',
  source: 'scheduled',
  name: REPORT_DEFINITION.name,
  entity: REPORT_DEFINITION.entity,
  format: 'csv',
  status: 'completed',
  definition: REPORT_DEFINITION,
  filterHash: 'hash',
  idempotencyKey: 'scheduled-run:run-1',
  rowsCount: 2,
  runtimeMs: 12,
  failureMessage: null,
  artifactPath: 'report-exports/job-1/opportunities.csv',
  artifactContentType: 'text/csv',
  artifactFileName: 'opportunities.csv',
  artifactSizeBytes: 23,
  artifactExpiresAt: '2026-05-22T12:34:56.000Z',
  retentionUntil: '2026-05-22T12:34:56.000Z',
  metadata: {},
  startedAt: NOW_ISO,
  completedAt: NOW_ISO,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
  ...overrides,
});

const buildScheduledReport = (overrides: Partial<ScheduledReport> = {}): ScheduledReport => ({
  id: 'sched-1',
  organization_id: 'org-1',
  saved_report_id: 'saved-1',
  name: 'Opportunity KPI Schedule',
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
  created_at: NOW_ISO,
  updated_at: NOW_ISO,
  ...overrides,
});

const createService = (): ScheduledReportService =>
  new ScheduledReportService({ query: mockPoolQuery } as never);

const installExportJobStubs = (
  service: ScheduledReportService,
  overrides: {
    createAndProcessJob?: jest.Mock;
    readArtifact?: jest.Mock;
  } = {}
) => {
  const createAndProcessJob =
    overrides.createAndProcessJob || jest.fn().mockResolvedValue(buildExportJob());
  const readArtifact = overrides.readArtifact || jest.fn().mockResolvedValue(Buffer.from('csv-data'));

  (service as never as { reportExportJobs: unknown }).reportExportJobs = {
    createAndProcessJob,
    readArtifact,
  };

  return { createAndProcessJob, readArtifact };
};

describe('ScheduledReportService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    mockPoolQuery.mockReset();
    sendMail.mockReset();
    sendMail.mockResolvedValue(true);
    mockLoggerError.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists scheduled reports in organization scope', async () => {
    mockPoolQuery.mockResolvedValueOnce(
      queryRows(
        buildScheduledReportRow({
          recipients: null,
        }),
        buildScheduledReportRow({
          id: 'sched-2',
          recipients: ['finance@example.com'],
          next_run_at: '2026-04-24T09:00:00.000Z',
        })
      )
    );

    const service = createService();
    const reports = await service.listScheduledReports('org-1');

    expect(mockPoolQuery).toHaveBeenCalledWith(expect.stringContaining('FROM scheduled_reports'), [
      'org-1',
    ]);
    expect(reports).toEqual([
      expect.objectContaining({
        id: 'sched-1',
        recipients: [],
      }),
      expect.objectContaining({
        id: 'sched-2',
        recipients: ['finance@example.com'],
      }),
    ]);
  });

  it('creates a scheduled report with default scheduling fields', async () => {
    const insertedRow = buildScheduledReportRow({
      name: 'Opportunity Pipeline Core KPI',
      next_run_at: '2026-04-23T09:00:00.000Z',
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(buildSavedReportRow()))
      .mockResolvedValueOnce(queryRows(insertedRow));

    const service = createService();
    const result = await service.createScheduledReport('org-1', 'user-1', {
      saved_report_id: 'saved-1',
      recipients: ['ops@example.com'],
      frequency: 'daily',
    });

    expect(result).toMatchObject({
      name: 'Opportunity Pipeline Core KPI',
      format: 'csv',
      timezone: 'UTC',
      hour: 9,
      minute: 0,
      is_active: true,
      next_run_at: '2026-04-23T09:00:00.000Z',
    });

    expect(mockPoolQuery.mock.calls[1][1]).toEqual([
      'org-1',
      'saved-1',
      'Opportunity Pipeline Core KPI',
      ['ops@example.com'],
      'csv',
      'daily',
      'UTC',
      9,
      0,
      null,
      null,
      true,
      '2026-04-23T09:00:00.000Z',
      'user-1',
    ]);
  });

  it('rejects scheduled report creation when the saved report is inaccessible', async () => {
    mockPoolQuery.mockResolvedValueOnce(queryRows());

    const service = createService();

    await expect(
      service.createScheduledReport('org-1', 'user-1', {
        saved_report_id: 'saved-1',
        recipients: ['ops@example.com'],
        frequency: 'daily',
      })
    ).rejects.toThrow('Saved report not found or inaccessible');

    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
  });

  it('returns null when updating a missing scheduled report', async () => {
    mockPoolQuery.mockResolvedValueOnce(queryRows());

    const service = createService();
    const result = await service.updateScheduledReport('org-1', 'missing', 'user-1', {
      name: 'Renamed report',
    });

    expect(result).toBeNull();
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
  });

  it('preserves next_run_at when updating without schedule changes', async () => {
    const currentRow = buildScheduledReportRow({
      next_run_at: '2026-05-01T09:00:00.000Z',
      day_of_week: 2,
    });
    const updatedRow = buildScheduledReportRow({
      name: 'Renamed schedule',
      next_run_at: currentRow.next_run_at,
      day_of_week: 2,
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(currentRow))
      .mockResolvedValueOnce(queryRows(updatedRow));

    const service = createService();
    const result = await service.updateScheduledReport('org-1', 'sched-1', 'user-2', {
      name: 'Renamed schedule',
    });

    expect(mockPoolQuery.mock.calls[1][1][12]).toBe('2026-05-01T09:00:00.000Z');
    expect(result?.next_run_at).toBe('2026-05-01T09:00:00.000Z');
  });

  it('recomputes next_run_at when the schedule changes', async () => {
    const currentRow = buildScheduledReportRow({
      next_run_at: '2026-04-23T09:00:00.000Z',
    });
    const updatedRow = buildScheduledReportRow({
      hour: 15,
      next_run_at: '2026-04-22T15:00:00.000Z',
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(currentRow))
      .mockResolvedValueOnce(queryRows(updatedRow));

    const service = createService();
    const result = await service.updateScheduledReport('org-1', 'sched-1', 'user-2', {
      hour: 15,
    });

    expect(mockPoolQuery.mock.calls[1][1][12]).toBe('2026-04-22T15:00:00.000Z');
    expect(result?.next_run_at).toBe('2026-04-22T15:00:00.000Z');
  });

  it('accepts explicit nullable schedule day fields during updates', async () => {
    const currentRow = buildScheduledReportRow({
      frequency: 'weekly',
      day_of_week: 2,
      day_of_month: null,
      next_run_at: '2026-04-23T09:00:00.000Z',
    });
    const updatedRow = buildScheduledReportRow({
      frequency: 'monthly',
      day_of_week: null,
      day_of_month: 5,
      next_run_at: '2026-05-05T09:00:00.000Z',
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(currentRow))
      .mockResolvedValueOnce(queryRows(updatedRow));

    const service = createService();
    const result = await service.updateScheduledReport('org-1', 'sched-1', 'user-2', {
      frequency: 'monthly',
      day_of_week: null,
      day_of_month: 5,
    });

    expect(mockPoolQuery.mock.calls[1][1][9]).toBeNull();
    expect(mockPoolQuery.mock.calls[1][1][10]).toBe(5);
    expect(result).toMatchObject({
      frequency: 'monthly',
      day_of_week: null,
      day_of_month: 5,
      next_run_at: '2026-05-05T09:00:00.000Z',
    });
  });

  it('returns null when an update race leaves no row to return', async () => {
    mockPoolQuery
      .mockResolvedValueOnce(queryRows(buildScheduledReportRow()))
      .mockResolvedValueOnce(queryRows());

    const service = createService();

    await expect(
      service.updateScheduledReport('org-1', 'sched-1', 'user-2', {
        name: 'Lost update',
      })
    ).resolves.toBeNull();
  });

  it('keeps the current next_run_at when toggling a report inactive', async () => {
    const currentRow = buildScheduledReportRow({
      next_run_at: '2026-04-23T09:00:00.000Z',
      is_active: true,
    });
    const toggledRow = buildScheduledReportRow({
      next_run_at: currentRow.next_run_at,
      is_active: false,
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(currentRow))
      .mockResolvedValueOnce(queryRows(toggledRow));

    const service = createService();
    const result = await service.toggleScheduledReport('org-1', 'sched-1', 'user-2', {
      is_active: false,
    });

    expect(mockPoolQuery.mock.calls[1][1]).toEqual([
      'org-1',
      'sched-1',
      false,
      '2026-04-23T09:00:00.000Z',
      'user-2',
    ]);
    expect(result?.is_active).toBe(false);
  });

  it('recomputes next_run_at when toggling a report active', async () => {
    const currentRow = buildScheduledReportRow({
      hour: 18,
      is_active: false,
      next_run_at: '2026-04-01T09:00:00.000Z',
    });
    const toggledRow = buildScheduledReportRow({
      hour: 18,
      is_active: true,
      next_run_at: '2026-04-22T18:00:00.000Z',
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(currentRow))
      .mockResolvedValueOnce(queryRows(toggledRow));

    const service = createService();
    const result = await service.toggleScheduledReport('org-1', 'sched-1', 'user-2', {
      is_active: true,
    });

    expect(mockPoolQuery.mock.calls[1][1]).toEqual([
      'org-1',
      'sched-1',
      true,
      '2026-04-22T18:00:00.000Z',
      'user-2',
    ]);
    expect(result?.is_active).toBe(true);
    expect(result?.next_run_at).toBe('2026-04-22T18:00:00.000Z');
  });

  it('returns null when toggling a missing scheduled report', async () => {
    mockPoolQuery.mockResolvedValueOnce(queryRows());

    const service = createService();

    await expect(service.toggleScheduledReport('org-1', 'missing', 'user-2', {})).resolves.toBeNull();
    expect(mockPoolQuery).toHaveBeenCalledTimes(1);
  });

  it('inverts the current active state when toggle input omits is_active and handles empty update results', async () => {
    mockPoolQuery
      .mockResolvedValueOnce(
        queryRows(
          buildScheduledReportRow({
            is_active: true,
            next_run_at: '2026-04-23T09:00:00.000Z',
          })
        )
      )
      .mockResolvedValueOnce(queryRows());

    const service = createService();

    await expect(service.toggleScheduledReport('org-1', 'sched-1', 'user-2', {})).resolves.toBeNull();
    expect(mockPoolQuery.mock.calls[1][1]).toEqual([
      'org-1',
      'sched-1',
      false,
      '2026-04-23T09:00:00.000Z',
      'user-2',
    ]);
  });

  it('returns null when manually running a missing scheduled report', async () => {
    mockPoolQuery.mockResolvedValueOnce(queryRows());

    const service = createService();

    await expect(service.runScheduledReportNow('org-1', 'missing')).resolves.toBeNull();
  });

  it('passes organization scope into report generation during manual execution', async () => {
    const scheduledReportRow = buildScheduledReportRow();
    const runningRunRow = buildScheduledReportRunRow();
    const finalizedRunRow = buildScheduledReportRunRow({
      status: 'success',
      completed_at: NOW_ISO,
      rows_count: 2,
      file_format: 'csv',
      file_name: 'opportunities.csv',
      metadata: {
        recipientsCount: 1,
        manual: true,
        reportExportJobId: 'job-1',
      },
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(scheduledReportRow))
      .mockResolvedValueOnce(queryRows(runningRunRow))
      .mockResolvedValueOnce(
        queryRows(
          buildSavedReportRow({
            report_definition: JSON.stringify(REPORT_DEFINITION),
          })
        )
      )
      .mockResolvedValueOnce(queryRows(finalizedRunRow))
      .mockResolvedValueOnce(queryRows());

    const service = createService();
    const { createAndProcessJob, readArtifact } = installExportJobStubs(service, {
      createAndProcessJob: jest.fn().mockResolvedValue(buildExportJob()),
      readArtifact: jest.fn().mockResolvedValue(Buffer.from('name,weighted_amount')),
    });

    const run = await service.runScheduledReportNow('org-1', 'sched-1');

    expect(createAndProcessJob).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        savedReportId: 'saved-1',
        scheduledReportId: 'sched-1',
        source: 'scheduled',
        format: 'csv',
        requestedBy: 'user-1',
        definition: REPORT_DEFINITION,
        metadata: {
          scheduledReportId: 'sched-1',
          manual: true,
        },
      })
    );
    expect(readArtifact).toHaveBeenCalledWith(expect.objectContaining({ id: 'job-1' }));
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['ops@example.com'],
        subject: 'Scheduled Report: Opportunity KPI Schedule',
        attachments: [
          expect.objectContaining({
            filename: 'opportunities.csv',
            content: Buffer.from('name,weighted_amount'),
          }),
        ],
      })
    );
    expect(run).toMatchObject({
      status: 'success',
      recipients: ['ops@example.com'],
      reportExportJobId: 'job-1',
    });
  });

  it('uses a null requestedBy fallback and zero-row messaging when export metadata omits both', async () => {
    const scheduledReportRow = buildScheduledReportRow({
      created_by: null,
      recipients: ['ops@example.com'],
    });
    const finalizedRunRow = buildScheduledReportRunRow({
      status: 'success',
      completed_at: NOW_ISO,
      rows_count: 0,
      file_format: 'csv',
      file_name: 'opportunities_report_2026-04-22.csv',
      metadata: {
        recipientsCount: 1,
        manual: true,
        reportExportJobId: 'job-1',
      },
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(scheduledReportRow))
      .mockResolvedValueOnce(queryRows(buildScheduledReportRunRow()))
      .mockResolvedValueOnce(queryRows(buildSavedReportRow()))
      .mockResolvedValueOnce(queryRows(finalizedRunRow))
      .mockResolvedValueOnce(queryRows());

    const service = createService();
    const { createAndProcessJob } = installExportJobStubs(service, {
      createAndProcessJob: jest.fn().mockResolvedValue(
        buildExportJob({
          requestedBy: null,
          rowsCount: null,
          artifactFileName: null,
        })
      ),
    });

    await expect(service.runScheduledReportNow('org-1', 'sched-1')).resolves.toMatchObject({
      status: 'success',
      reportExportJobId: 'job-1',
    });

    expect(createAndProcessJob).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedBy: null,
      })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Rows: 0'),
        html: expect.stringContaining('Rows: 0'),
        attachments: [
          expect.objectContaining({
            filename: 'opportunities_report_2026-04-22.csv',
          }),
        ],
      })
    );
  });

  it('marks delivery as skipped when the scheduled report has no recipients', async () => {
    const scheduledReportRow = buildScheduledReportRow({ recipients: [] });
    const runningRunRow = buildScheduledReportRunRow({ recipients: [] });
    const finalizedRunRow = buildScheduledReportRunRow({
      recipients: [],
      status: 'skipped',
      completed_at: NOW_ISO,
      rows_count: 0,
      file_format: 'csv',
      file_name: 'opportunities_report_2026-04-22.csv',
      metadata: {
        recipientsCount: 0,
        manual: true,
        reportExportJobId: 'job-1',
      },
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(scheduledReportRow))
      .mockResolvedValueOnce(queryRows(runningRunRow))
      .mockResolvedValueOnce(queryRows(buildSavedReportRow()))
      .mockResolvedValueOnce(queryRows(finalizedRunRow))
      .mockResolvedValueOnce(queryRows());

    const service = createService();
    installExportJobStubs(service, {
      createAndProcessJob: jest.fn().mockResolvedValue(
        buildExportJob({
          rowsCount: 0,
          artifactFileName: null,
        })
      ),
    });

    const run = await service.runScheduledReportNow('org-1', 'sched-1');

    expect(sendMail).not.toHaveBeenCalled();
    expect(run).toMatchObject({
      status: 'skipped',
      reportExportJobId: 'job-1',
    });
  });

  it('marks delivery as failed when email sending returns false', async () => {
    sendMail.mockResolvedValueOnce(false);

    const finalizedRunRow = buildScheduledReportRunRow({
      status: 'failed',
      completed_at: NOW_ISO,
      rows_count: 2,
      file_format: 'csv',
      file_name: 'opportunities.csv',
      error_message: 'Email delivery failed',
      metadata: {
        recipientsCount: 1,
        manual: true,
        reportExportJobId: 'job-1',
      },
    });

    mockPoolQuery
      .mockResolvedValueOnce(queryRows(buildScheduledReportRow()))
      .mockResolvedValueOnce(queryRows(buildScheduledReportRunRow()))
      .mockResolvedValueOnce(queryRows(buildSavedReportRow()))
      .mockResolvedValueOnce(queryRows(finalizedRunRow))
      .mockResolvedValueOnce(queryRows());

    const service = createService();
    installExportJobStubs(service);

    const run = await service.runScheduledReportNow('org-1', 'sched-1');

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(run).toMatchObject({
      status: 'failed',
      error_message: 'Email delivery failed',
      reportExportJobId: 'job-1',
    });
  });

  it('fails a manual execution when the export job does not complete', async () => {
    mockPoolQuery
      .mockResolvedValueOnce(queryRows(buildScheduledReportRow()))
      .mockResolvedValueOnce(queryRows(buildScheduledReportRunRow()))
      .mockResolvedValueOnce(queryRows(buildSavedReportRow()))
      .mockResolvedValueOnce(
        queryRows(
          buildScheduledReportRunRow({
            status: 'failed',
            completed_at: NOW_ISO,
            error_message: 'Export did not finish',
          })
        )
      )
      .mockResolvedValueOnce(queryRows());

    const service = createService();
    const { createAndProcessJob, readArtifact } = installExportJobStubs(service, {
      createAndProcessJob: jest.fn().mockResolvedValue(
        buildExportJob({
          status: 'failed',
          failureMessage: 'Export did not finish',
          artifactPath: null,
          artifactFileName: null,
          rowsCount: null,
        })
      ),
    });

    await expect(service.runScheduledReportNow('org-1', 'sched-1')).rejects.toThrow(
      'Export did not finish'
    );

    expect(readArtifact).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(createAndProcessJob).toHaveBeenCalledTimes(1);
    expect(mockPoolQuery.mock.calls[4][1]).toEqual(['sched-1', 'Export did not finish']);
  });

  it('uses the default export failure message when the job fails silently', async () => {
    mockPoolQuery
      .mockResolvedValueOnce(queryRows(buildScheduledReportRow()))
      .mockResolvedValueOnce(queryRows(buildScheduledReportRunRow()))
      .mockResolvedValueOnce(queryRows(buildSavedReportRow()))
      .mockResolvedValueOnce(
        queryRows(
          buildScheduledReportRunRow({
            status: 'failed',
            completed_at: NOW_ISO,
            error_message: 'Report export job failed',
          })
        )
      )
      .mockResolvedValueOnce(queryRows());

    const service = createService();
    installExportJobStubs(service, {
      createAndProcessJob: jest.fn().mockResolvedValue(
        buildExportJob({
          status: 'failed',
          failureMessage: null,
          rowsCount: null,
          artifactFileName: null,
        })
      ),
    });

    await expect(service.runScheduledReportNow('org-1', 'sched-1')).rejects.toThrow(
      'Report export job failed'
    );
    expect(mockPoolQuery.mock.calls[4][1]).toEqual(['sched-1', 'Report export job failed']);
  });

  it('records an unknown error message when execution throws a non-Error value', async () => {
    mockPoolQuery
      .mockResolvedValueOnce(queryRows(buildScheduledReportRow()))
      .mockResolvedValueOnce(queryRows(buildScheduledReportRunRow()))
      .mockResolvedValueOnce(queryRows(buildSavedReportRow()))
      .mockResolvedValueOnce(
        queryRows(
          buildScheduledReportRunRow({
            status: 'failed',
            completed_at: NOW_ISO,
            error_message: 'Unknown error',
          })
        )
      )
      .mockResolvedValueOnce(queryRows());

    const service = createService();
    installExportJobStubs(service, {
      createAndProcessJob: jest.fn().mockRejectedValue('boom'),
    });

    await expect(service.runScheduledReportNow('org-1', 'sched-1')).rejects.toBe('boom');
    expect(mockPoolQuery.mock.calls[4][1]).toEqual(['sched-1', 'Unknown error']);
  });

  it('fails a manual execution when the saved report definition is missing', async () => {
    mockPoolQuery
      .mockResolvedValueOnce(queryRows(buildScheduledReportRow()))
      .mockResolvedValueOnce(queryRows(buildScheduledReportRunRow()))
      .mockResolvedValueOnce(queryRows())
      .mockResolvedValueOnce(
        queryRows(
          buildScheduledReportRunRow({
            status: 'failed',
            completed_at: NOW_ISO,
            error_message: 'Saved report definition not found',
          })
        )
      )
      .mockResolvedValueOnce(queryRows());

    const service = createService();
    const { createAndProcessJob } = installExportJobStubs(service);

    await expect(service.runScheduledReportNow('org-1', 'sched-1')).rejects.toThrow(
      'Saved report definition not found'
    );

    expect(createAndProcessJob).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(mockPoolQuery.mock.calls[4][1]).toEqual(['sched-1', 'Saved report definition not found']);
  });

  it('claims due reports and maps the returned batch', async () => {
    mockPoolQuery.mockResolvedValueOnce(
      queryRows(
        buildScheduledReportRow({
          recipients: null,
          processing_started_at: new Date('2026-04-22T12:40:00.000Z') as never,
        }),
        buildScheduledReportRow({
          id: 'sched-2',
          recipients: ['second@example.com'],
          next_run_at: '2026-04-23T10:00:00.000Z',
        })
      )
    );

    const service = createService();
    const claimed = await service.claimDueReports(2);

    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('FOR UPDATE SKIP LOCKED'),
      [2]
    );
    expect(claimed).toEqual([
      expect.objectContaining({
        id: 'sched-1',
        recipients: [],
        processing_started_at: '2026-04-22T12:40:00.000Z',
      }),
      expect.objectContaining({
        id: 'sched-2',
        recipients: ['second@example.com'],
      }),
    ]);
  });

  it('deletes a scheduled report only when a row is returned', async () => {
    mockPoolQuery
      .mockResolvedValueOnce(queryRows({ id: 'sched-1' }))
      .mockResolvedValueOnce(queryRows());

    const service = createService();

    await expect(service.deleteScheduledReport('org-1', 'sched-1')).resolves.toBe(true);
    await expect(service.deleteScheduledReport('org-1', 'missing')).resolves.toBe(false);

    expect(mockPoolQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('DELETE FROM scheduled_reports'),
      ['org-1', 'sched-1']
    );
    expect(mockPoolQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM scheduled_reports'),
      ['org-1', 'missing']
    );
  });

  it('lists scheduled report runs with the default limit and mapped metadata', async () => {
    mockPoolQuery.mockResolvedValueOnce(
      queryRows(
        buildScheduledReportRunRow({
          metadata: JSON.stringify({
            reportExportJobId: 'job-1',
            manual: false,
          }) as never,
        }),
        buildScheduledReportRunRow({
          id: 'run-2',
          metadata: null,
        })
      )
    );

    const service = createService();
    const runs = await service.listScheduledReportRuns('org-1', 'sched-1');

    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('FROM scheduled_report_runs runs'),
      ['org-1', 'sched-1', 20]
    );
    expect(runs).toEqual([
      expect.objectContaining({
        id: 'run-1',
        reportExportJobId: 'job-1',
        metadata: {
          reportExportJobId: 'job-1',
          manual: false,
        },
      }),
      expect.objectContaining({
        id: 'run-2',
        metadata: null,
        reportExportJobId: null,
      }),
    ]);
  });

  it('creates running run records with the provided recipients', async () => {
    mockPoolQuery.mockResolvedValueOnce(
      queryRows(
        buildScheduledReportRunRow({
          recipients: null,
        })
      )
    );

    const service = createService();
    const run = await service.createRunRecord('sched-1', ['ops@example.com', 'finance@example.com']);

    expect(mockPoolQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO scheduled_report_runs'),
      ['sched-1', ['ops@example.com', 'finance@example.com']]
    );
    expect(run).toEqual(
      expect.objectContaining({
        id: 'run-1',
        recipients: [],
        status: 'running',
      })
    );
  });

  it('continues processing claimed reports after one execution failure', async () => {
    const service = createService();
    const executeReport = jest.spyOn(service as never, 'executeReport' as never);

    executeReport
      .mockRejectedValueOnce(new Error('first run failed'))
      .mockResolvedValueOnce(
        buildScheduledReportRunRow({
          id: 'run-2',
          scheduled_report_id: 'sched-2',
          status: 'success',
          completed_at: NOW_ISO,
        }) as never
      );

    const processed = await service.processClaimedReports([
      buildScheduledReport({ id: 'sched-1' }),
      buildScheduledReport({ id: 'sched-2' }),
    ]);

    expect(processed).toBe(2);
    expect(executeReport).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 'sched-1' }),
      false
    );
    expect(executeReport).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 'sched-2' }),
      false
    );
    expect(mockLoggerError).toHaveBeenCalledWith('Scheduled report execution failed', {
      scheduledReportId: 'sched-1',
      error: expect.any(Error),
    });
  });
});
