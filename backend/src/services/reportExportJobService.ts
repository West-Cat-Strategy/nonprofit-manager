import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Pool, QueryResultRow } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import type { GeneratedTabularFile } from '@modules/shared/export/tabularExport';
import { ReportService } from '@services/reportService';
import type {
  ReportDefinition,
  ReportEntity,
  ReportExportJob,
  ReportExportJobSource,
  ReportExportJobStatus,
} from '@app-types/report';

const DEFAULT_RETENTION_DAYS = 30;
const EXPORT_SUBDIR = 'report-exports';

export class ReportExportJobArtifactNotReadyError extends Error {}
export class ReportExportJobArtifactGoneError extends Error {}

interface ReportExportJobRow extends QueryResultRow {
  id: string;
  organization_id: string;
  saved_report_id: string | null;
  scheduled_report_id: string | null;
  requested_by: string | null;
  job_source: ReportExportJobSource;
  name: string;
  entity: ReportEntity;
  format: 'csv' | 'xlsx';
  status: ReportExportJobStatus;
  definition: ReportDefinition | string;
  filter_hash: string;
  idempotency_key: string | null;
  rows_count: string | number | null;
  runtime_ms: string | number | null;
  failure_message: string | null;
  artifact_path: string | null;
  artifact_content_type: string | null;
  artifact_file_name: string | null;
  artifact_size_bytes: string | number | null;
  artifact_expires_at: string | Date | null;
  retention_until: string | Date | null;
  metadata: Record<string, unknown> | string | null;
  started_at: string | Date | null;
  completed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface CreateReportExportJobInput {
  organizationId: string;
  requestedBy?: string | null;
  savedReportId?: string | null;
  scheduledReportId?: string | null;
  source?: ReportExportJobSource;
  definition: ReportDefinition;
  format: 'csv' | 'xlsx';
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
}

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveUploadRoot = (): string =>
  path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));

const ensureWithinUploadRoot = (candidatePath: string): string => {
  const root = resolveUploadRoot();
  const resolvedCandidate = path.resolve(candidatePath);
  const relative = path.relative(root, resolvedCandidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid report export artifact path');
  }
  return resolvedCandidate;
};

const stableSerialize = (value: unknown): string => {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return `{${entries
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`)
      .join(',')}}`;
  }
  return JSON.stringify(String(value));
};

const hashFilters = (definition: ReportDefinition): string =>
  crypto
    .createHash('sha256')
    .update(stableSerialize(definition.filters || []))
    .digest('hex');

const parseDefinition = (value: ReportDefinition | string): ReportDefinition => {
  if (typeof value === 'string') {
    return JSON.parse(value) as ReportDefinition;
  }
  return value;
};

const parseMetadata = (
  value: ReportExportJobRow['metadata']
): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return value;
};

const normalizeIso = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toNumber = (value: string | number | null): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapRowToJob = (row: ReportExportJobRow): ReportExportJob => ({
  id: row.id,
  organizationId: row.organization_id,
  savedReportId: row.saved_report_id,
  scheduledReportId: row.scheduled_report_id,
  requestedBy: row.requested_by,
  source: row.job_source,
  name: row.name,
  entity: row.entity,
  format: row.format,
  status: row.status,
  definition: parseDefinition(row.definition),
  filterHash: row.filter_hash,
  idempotencyKey: row.idempotency_key,
  rowsCount: toNumber(row.rows_count),
  runtimeMs: toNumber(row.runtime_ms),
  failureMessage: row.failure_message,
  artifactPath: row.artifact_path,
  artifactContentType: row.artifact_content_type,
  artifactFileName: row.artifact_file_name,
  artifactSizeBytes: toNumber(row.artifact_size_bytes),
  artifactExpiresAt: normalizeIso(row.artifact_expires_at),
  retentionUntil: normalizeIso(row.retention_until),
  metadata: parseMetadata(row.metadata),
  startedAt: normalizeIso(row.started_at),
  completedAt: normalizeIso(row.completed_at),
  createdAt: normalizeIso(row.created_at) || new Date().toISOString(),
  updatedAt: normalizeIso(row.updated_at) || new Date().toISOString(),
});

export class ReportExportJobService {
  private readonly reportService: ReportService;

  constructor(private readonly db: Pool) {
    this.reportService = new ReportService(db);
  }

  private getRetentionUntil(): string {
    const retentionDays = parsePositiveInt(process.env.REPORT_EXPORT_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
    return new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString();
  }

  private async writeArtifact(jobId: string, file: GeneratedTabularFile): Promise<string> {
    const relativeDir = path.posix.join(EXPORT_SUBDIR, jobId);
    const relativePath = path.posix.join(relativeDir, file.filename);
    const fullPath = ensureWithinUploadRoot(path.join(resolveUploadRoot(), relativePath));

    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, file.buffer);

    return relativePath;
  }

  private isArtifactExpired(job: ReportExportJob): boolean {
    const expiry = job.artifactExpiresAt || job.retentionUntil;
    if (!expiry) return false;

    const parsed = new Date(expiry);
    return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= Date.now();
  }

  async createJob(input: CreateReportExportJobInput): Promise<ReportExportJob> {
    const idempotencyKey = input.idempotencyKey?.trim() || null;

    if (idempotencyKey) {
      const existing = await this.db.query<ReportExportJobRow>(
        `SELECT *
         FROM report_export_jobs
         WHERE organization_id = $1
           AND idempotency_key = $2
         LIMIT 1`,
        [input.organizationId, idempotencyKey]
      );
      if (existing.rows[0]) {
        return mapRowToJob(existing.rows[0]);
      }
    }

    const result = await this.db.query<ReportExportJobRow>(
      `INSERT INTO report_export_jobs (
         organization_id,
         saved_report_id,
         scheduled_report_id,
         requested_by,
         job_source,
         name,
         entity,
         format,
         status,
         definition,
         filter_hash,
         idempotency_key,
         retention_until,
         metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9::jsonb, $10, $11, $12, $13::jsonb)
       RETURNING *`,
      [
        input.organizationId,
        input.savedReportId || null,
        input.scheduledReportId || null,
        input.requestedBy || null,
        input.source || 'manual',
        input.definition.name,
        input.definition.entity,
        input.format,
        JSON.stringify(input.definition),
        hashFilters(input.definition),
        idempotencyKey,
        this.getRetentionUntil(),
        JSON.stringify(input.metadata || {}),
      ]
    );

    return mapRowToJob(result.rows[0]);
  }

  async getJob(organizationId: string, jobId: string): Promise<ReportExportJob | null> {
    const result = await this.db.query<ReportExportJobRow>(
      `SELECT *
       FROM report_export_jobs
       WHERE organization_id = $1
         AND id = $2
       LIMIT 1`,
      [organizationId, jobId]
    );

    return result.rows[0] ? mapRowToJob(result.rows[0]) : null;
  }

  async listJobs(organizationId: string, limit: number = 25): Promise<ReportExportJob[]> {
    const result = await this.db.query<ReportExportJobRow>(
      `SELECT *
       FROM report_export_jobs
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [organizationId, limit]
    );

    return result.rows.map(mapRowToJob);
  }

  async processJob(jobId: string): Promise<ReportExportJob> {
    const claimedResult = await this.db.query<ReportExportJobRow>(
      `UPDATE report_export_jobs
       SET status = 'processing',
           started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND status IN ('pending', 'failed')
       RETURNING *`,
      [jobId]
    );

    const currentJob =
      claimedResult.rows[0] ||
      (await this.db.query<ReportExportJobRow>(
        `SELECT * FROM report_export_jobs WHERE id = $1 LIMIT 1`,
        [jobId]
      )).rows[0];

    if (!currentJob) {
      throw new Error('Report export job not found');
    }

    if (currentJob.status === 'completed') {
      return mapRowToJob(currentJob);
    }
    if (currentJob.status === 'processing') {
      return mapRowToJob(currentJob);
    }

    const startedAt = Date.now();

    try {
      const generated = await this.reportService.generateReport(parseDefinition(currentJob.definition), {
        organizationId: currentJob.organization_id,
      });
      const file = await this.reportService.exportReport(generated, currentJob.format);
      const artifactPath = await this.writeArtifact(currentJob.id, file);
      const runtimeMs = Date.now() - startedAt;

      const result = await this.db.query<ReportExportJobRow>(
        `UPDATE report_export_jobs
         SET status = 'completed',
             rows_count = $2,
             runtime_ms = $3,
             artifact_path = $4,
             artifact_content_type = $5,
             artifact_file_name = $6,
             artifact_size_bytes = $7,
             artifact_expires_at = retention_until,
             completed_at = CURRENT_TIMESTAMP,
             failure_message = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [
          currentJob.id,
          generated.data.length,
          runtimeMs,
          artifactPath,
          file.contentType,
          file.filename,
          file.buffer.length,
        ]
      );

      return mapRowToJob(result.rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown export job failure';
      logger.error('Report export job failed', { error, jobId });

      const failed = await this.db.query<ReportExportJobRow>(
        `UPDATE report_export_jobs
         SET status = 'failed',
             failure_message = $2,
             completed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [currentJob.id, message]
      );

      return mapRowToJob(failed.rows[0]);
    }
  }

  async createAndProcessJob(input: CreateReportExportJobInput): Promise<ReportExportJob> {
    const job = await this.createJob(input);
    if (job.status === 'completed') {
      return job;
    }
    if (job.status === 'processing') {
      return job;
    }
    return this.processJob(job.id);
  }

  async readArtifact(job: ReportExportJob): Promise<Buffer> {
    if (job.status !== 'completed') {
      throw new ReportExportJobArtifactNotReadyError('Report export job is not complete');
    }

    if (!job.artifactPath) {
      throw new ReportExportJobArtifactGoneError('Report export artifact is unavailable');
    }

    if (this.isArtifactExpired(job)) {
      throw new ReportExportJobArtifactGoneError('Report export artifact has expired');
    }

    const fullPath = ensureWithinUploadRoot(path.join(resolveUploadRoot(), job.artifactPath));
    try {
      return await fs.promises.readFile(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
        throw new ReportExportJobArtifactGoneError('Report export artifact has been pruned');
      }
      throw error;
    }
  }

  async readArtifactFile(job: ReportExportJob): Promise<GeneratedTabularFile> {
    const buffer = await this.readArtifact(job);
    const contentType =
      job.artifactContentType ||
      (job.format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv');
    const filename =
      job.artifactFileName || `${job.name.replace(/\s+/g, '_').toLowerCase()}.${job.format}`;

    return {
      buffer,
      contentType,
      extension: job.format,
      filename,
    };
  }
}

export const reportExportJobService = new ReportExportJobService(pool);
export default reportExportJobService;
