import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Pool } from 'pg';
import { ReportExportJobService } from '@services/reportExportJobService';
import { ReportService } from '@modules/reports/services/reportService';

jest.mock('@config/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@modules/reports/services/reportService', () => ({
  ReportService: jest.fn().mockImplementation(() => ({
    generateReport: jest.fn().mockResolvedValue({
      data: [{ id: 'contact-1', email: 'alice@example.com' }],
    }),
    exportReport: jest.fn().mockResolvedValue({
      buffer: Buffer.from('email\nalice@example.com'),
      contentType: 'text/csv',
      extension: 'csv',
      filename: 'contacts.csv',
    }),
  })),
}));

const buildRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'job-1',
  organization_id: 'org-1',
  saved_report_id: null,
  scheduled_report_id: null,
  requested_by: 'user-1',
  job_source: 'manual',
  name: 'Contacts export',
  entity: 'contacts',
  format: 'csv',
  status: 'processing',
  definition: {
    name: 'Contacts export',
    entity: 'contacts',
    fields: ['email'],
  },
  filter_hash: 'hash-1',
  idempotency_key: null,
  rows_count: null,
  runtime_ms: null,
  failure_message: null,
  artifact_path: null,
  artifact_content_type: null,
  artifact_file_name: null,
  artifact_size_bytes: null,
  artifact_expires_at: null,
  retention_until: new Date('2026-06-01T00:00:00.000Z'),
  metadata: {},
  started_at: new Date('2026-05-10T00:00:00.000Z'),
  completed_at: null,
  created_at: new Date('2026-05-10T00:00:00.000Z'),
  updated_at: new Date('2026-05-10T00:00:00.000Z'),
  ...overrides,
});

describe('ReportExportJobService worker processing', () => {
  let uploadDir: string;
  let query: jest.Mock;
  let service: ReportExportJobService;

  beforeEach(() => {
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'report-export-jobs-'));
    process.env.UPLOAD_DIR = uploadDir;
    query = jest.fn();
    service = new ReportExportJobService({ query } as unknown as Pool);
  });

  afterEach(() => {
    delete process.env.UPLOAD_DIR;
    fs.rmSync(uploadDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('continues processing after atomically claiming a pending job', async () => {
    query.mockResolvedValueOnce({ rows: [buildRow()] }).mockResolvedValueOnce({
      rows: [
        buildRow({
          status: 'completed',
          rows_count: 1,
          runtime_ms: 12,
          artifact_path: 'report-exports/job-1/contacts.csv',
          artifact_content_type: 'text/csv',
          artifact_file_name: 'contacts.csv',
          artifact_size_bytes: 23,
          artifact_expires_at: new Date('2026-06-01T00:00:00.000Z'),
          completed_at: new Date('2026-05-10T00:00:01.000Z'),
        }),
      ],
    });

    const job = await service.processJob('job-1');

    expect(job.status).toBe('completed');
    expect(job.rowsCount).toBe(1);
    expect(query.mock.calls[0][0]).toContain("status IN ('pending', 'failed')");
    expect(query.mock.calls[1][0]).toContain("SET status = 'completed'");
    expect(fs.existsSync(path.join(uploadDir, 'report-exports/job-1/contacts.csv'))).toBe(true);

    const reportServiceInstance = (ReportService as jest.Mock).mock.results[0].value;
    expect(reportServiceInstance.generateReport).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'contacts' }),
      { organizationId: 'org-1' }
    );
  });

  it('drains pending report export jobs in oldest-first batches', async () => {
    query
      .mockResolvedValueOnce({ rows: [buildRow({ id: 'job-1' }), buildRow({ id: 'job-2' })] })
      .mockResolvedValueOnce({ rows: [buildRow({ id: 'job-1', status: 'completed' })] })
      .mockResolvedValueOnce({ rows: [buildRow({ id: 'job-2', status: 'completed' })] });

    await expect(service.processPendingJobs(2)).resolves.toBe(2);

    expect(query.mock.calls[0][0]).toContain("WHERE status = 'pending'");
    expect(query.mock.calls[0][0]).toContain("status = 'failed'");
    expect(query.mock.calls[0][0]).not.toContain('FROM retryable');
    expect(query.mock.calls[0][0]).toContain('ORDER BY created_at ASC');
    expect(query.mock.calls[0][0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(query.mock.calls[0][0]).toContain("SET status = 'processing'");
    expect(query.mock.calls[0][1]).toEqual([2, 0, 0]);
    expect(query.mock.calls[1][1]).toEqual([
      'job-1',
      1,
      expect.any(Number),
      'report-exports/job-1/contacts.csv',
      'text/csv',
      'contacts.csv',
      23,
    ]);
    expect(query.mock.calls[2][1]).toEqual([
      'job-2',
      1,
      expect.any(Number),
      'report-exports/job-2/contacts.csv',
      'text/csv',
      'contacts.csv',
      23,
    ]);
  });

  it('can include bounded delayed failed jobs when scheduler retry policy allows it', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          buildRow({
            id: 'job-1',
            status: 'processing',
            failure_message: 'Previous export failure',
            metadata: { workerRetryAttempts: 0 },
          }),
        ],
      })
      .mockResolvedValueOnce({ rows: [buildRow({ id: 'job-1', status: 'completed' })] });

    await expect(
      service.processPendingJobs(2, {
        failedRetryLimit: 1,
        failedRetryDelayMs: 300000,
      })
    ).resolves.toBe(1);

    expect(query.mock.calls[0][0]).toContain("metadata ->> 'workerRetryAttempts'");
    expect(query.mock.calls[0][0]).toContain('END < $2');
    expect(query.mock.calls[0][0]).toContain("$3::double precision * interval '1 millisecond'");
    expect(query.mock.calls[0][1]).toEqual([2, 1, 300000]);
  });
});
