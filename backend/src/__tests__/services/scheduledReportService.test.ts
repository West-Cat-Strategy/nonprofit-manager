const mockPoolQuery = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: { query: mockPoolQuery },
}));

const sendMail = jest.fn().mockResolvedValue(true);
jest.mock('../../services/emailService', () => ({
  sendMail: (...args: unknown[]) => sendMail(...args),
}));

import { ScheduledReportService } from '../../services/scheduledReportService';

describe('ScheduledReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes organization scope into report generation during execution', async () => {
    const nowIso = new Date().toISOString();

    const scheduledReportRow = {
      id: 'sched-1',
      organization_id: 'org-1',
      saved_report_id: 'saved-1',
      name: 'Opportunity KPI Schedule',
      recipients: [],
      format: 'csv',
      frequency: 'daily',
      timezone: 'UTC',
      hour: 9,
      minute: 0,
      day_of_week: null,
      day_of_month: null,
      is_active: true,
      next_run_at: nowIso,
      last_run_at: null,
      processing_started_at: null,
      last_error: null,
      created_by: 'user-1',
      created_at: nowIso,
      updated_at: nowIso,
    };

    const runRow = {
      id: 'run-1',
      scheduled_report_id: 'sched-1',
      status: 'running',
      recipients: [],
      started_at: nowIso,
      completed_at: null,
      rows_count: null,
      file_format: null,
      file_name: null,
      error_message: null,
      metadata: {},
      created_at: nowIso,
    };

    mockPoolQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM scheduled_reports') && sql.includes('AND id = $2') && sql.includes('LIMIT 1')) {
        return { rows: [scheduledReportRow] };
      }

      if (sql.includes('INSERT INTO scheduled_report_runs')) {
        return { rows: [runRow] };
      }

      if (sql.includes('SELECT id, entity, report_definition') && sql.includes('FROM saved_reports')) {
        return {
          rows: [
            {
              id: 'saved-1',
              entity: 'opportunities',
              report_definition: {
                name: 'Opportunity Pipeline Core KPI',
                entity: 'opportunities',
                fields: ['name', 'weighted_amount'],
              },
            },
          ],
        };
      }

      if (sql.includes('UPDATE scheduled_report_runs')) {
        return {
          rows: [
            {
              ...runRow,
              status: 'skipped',
              completed_at: nowIso,
              rows_count: 0,
              file_format: 'csv',
              file_name: 'opportunities_report_2026-03-02.csv',
              metadata: {
                reportExportJobId: 'job-1',
              },
            },
          ],
        };
      }

      if (sql.includes('UPDATE scheduled_reports')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    });

    const service = new ScheduledReportService({ query: mockPoolQuery } as any);
    const createAndProcessJob = jest.fn().mockResolvedValue({
      id: 'job-1',
      organizationId: 'org-1',
      savedReportId: 'saved-1',
      scheduledReportId: 'sched-1',
      requestedBy: 'user-1',
      source: 'scheduled',
      name: 'Opportunity Pipeline Core KPI',
      entity: 'opportunities',
      format: 'csv',
      status: 'completed',
      definition: {
        name: 'Opportunity Pipeline Core KPI',
        entity: 'opportunities',
        fields: ['name', 'weighted_amount'],
      },
      filterHash: 'hash',
      idempotencyKey: 'scheduled-run:run-1',
      rowsCount: 0,
      runtimeMs: 12,
      failureMessage: null,
      artifactPath: 'report-exports/job-1/opportunities.csv',
      artifactContentType: 'text/csv',
      artifactFileName: 'opportunities.csv',
      artifactSizeBytes: 23,
      artifactExpiresAt: nowIso,
      retentionUntil: nowIso,
      metadata: {},
      startedAt: nowIso,
      completedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    const readArtifact = jest.fn().mockResolvedValue(Buffer.from('name,weighted_amount'));

    (service as any).reportExportJobs = {
      createAndProcessJob,
      readArtifact,
    };

    const run = await service.runScheduledReportNow('org-1', 'sched-1');

    expect(createAndProcessJob).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        savedReportId: 'saved-1',
        scheduledReportId: 'sched-1',
        source: 'scheduled',
        format: 'csv',
        requestedBy: 'user-1',
        definition: {
        name: 'Opportunity Pipeline Core KPI',
        entity: 'opportunities',
        fields: ['name', 'weighted_amount'],
        },
      })
    );
    expect(readArtifact).toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
    expect(run).toMatchObject({
      reportExportJobId: 'job-1',
    });
  });
});
