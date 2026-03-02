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
    const generateReport = jest.fn().mockResolvedValue({
      definition: {
        name: 'Opportunity Pipeline Core KPI',
        entity: 'opportunities',
        fields: ['name', 'weighted_amount'],
      },
      data: [],
      total_count: 0,
      generated_at: nowIso,
    });
    const exportReport = jest.fn().mockResolvedValue(Buffer.from('name,weighted_amount'));

    (service as any).reportService = {
      generateReport,
      exportReport,
    };

    await service.runScheduledReportNow('org-1', 'sched-1');

    expect(generateReport).toHaveBeenCalledWith(
      {
        name: 'Opportunity Pipeline Core KPI',
        entity: 'opportunities',
        fields: ['name', 'weighted_amount'],
      },
      { organizationId: 'org-1' }
    );
    expect(sendMail).not.toHaveBeenCalled();
  });
});
