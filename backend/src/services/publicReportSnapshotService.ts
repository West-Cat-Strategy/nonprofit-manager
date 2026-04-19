import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import { ReportService } from '@modules/reports/services/reportService';
import type { ReportDefinition, ReportEntity } from '@app-types/report';

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_SNAPSHOT_ROW_CAP = 10_000;
const SNAPSHOT_SUBDIR = 'report-snapshots';
const SCOPED_REPORT_ENTITIES: ReportEntity[] = ['cases', 'opportunities'];

interface SavedReportRow {
  id: string;
  name: string;
  entity: ReportEntity;
  created_by: string | null;
  report_definition: ReportDefinition | string;
}

export type PublicLinkLifecycleState = 'active' | 'expired' | 'revoked' | 'purged';

export interface PublicReportSnapshotMeta {
  token: string;
  report_id: string;
  report_name: string;
  entity: ReportEntity;
  rows_count: number;
  lifecycle_state: PublicLinkLifecycleState;
  expires_at: string | null;
  created_at: string;
  available_formats: ('csv' | 'xlsx')[];
}

interface SnapshotRow {
  id: string;
  saved_report_id: string;
  token: string;
  status: PublicLinkLifecycleState;
  rows_count: number;
  csv_file_path: string | null;
  xlsx_file_path: string | null;
  expires_at: string | Date | null;
  revoked_at: string | Date | null;
  retention_until: string | Date | null;
  purged_at: string | Date | null;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  report_name?: string;
  entity?: ReportEntity;
}

interface ExpiredSnapshotUpdateRow {
  saved_report_id: string;
  token: string;
}

const normalizeIso = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const resolveUploadRoot = (): string => {
  return path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));
};

const ensureWithinUploadRoot = (candidatePath: string): string => {
  const root = resolveUploadRoot();
  const resolvedCandidate = path.resolve(candidatePath);
  const relative = path.relative(root, resolvedCandidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid snapshot file path');
  }
  return resolvedCandidate;
};

const parseDefinition = (value: ReportDefinition | string): ReportDefinition => {
  if (typeof value === 'string') {
    return JSON.parse(value) as ReportDefinition;
  }
  return value;
};

const getExpiryFromInput = (expiresAt?: string): Date | null => {
  if (!expiresAt) return null;
  const parsed = new Date(expiresAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid expiry timestamp');
  }
  return parsed;
};

const hasSnapshotExpired = (snapshot: SnapshotRow): boolean => {
  if (!snapshot.expires_at) return false;
  const expiresAt = new Date(snapshot.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() <= Date.now();
};

const resolveAvailableFormats = (snapshot: SnapshotRow): ('csv' | 'xlsx')[] => {
  const formats: ('csv' | 'xlsx')[] = [];
  if (snapshot.csv_file_path) formats.push('csv');
  if (snapshot.xlsx_file_path) formats.push('xlsx');
  return formats;
};

export class PublicReportSnapshotService {
  private readonly reportService: ReportService;

  constructor(private readonly db: Pool) {
    this.reportService = new ReportService(db);
  }

  private getRetentionDays(): number {
    return parsePositiveInt(process.env.REPORT_PUBLIC_SNAPSHOT_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
  }

  private getSnapshotRowCap(): number {
    return parsePositiveInt(process.env.REPORT_PUBLIC_SNAPSHOT_ROW_CAP, DEFAULT_SNAPSHOT_ROW_CAP);
  }

  private buildRetentionUntil(): string {
    const retentionDays = this.getRetentionDays();
    const retention = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);
    return retention.toISOString();
  }

  private generateToken(): string {
    return crypto.randomBytes(24).toString('base64url');
  }

  private async writeSnapshotFiles(args: {
    snapshotId: string;
    csv: Buffer;
    xlsx: Buffer;
  }): Promise<{ csvPath: string; xlsxPath: string }> {
    const dirRelative = path.posix.join(SNAPSHOT_SUBDIR, args.snapshotId);
    const csvRelative = path.posix.join(dirRelative, 'report.csv');
    const xlsxRelative = path.posix.join(dirRelative, 'report.xlsx');
    const csvFull = ensureWithinUploadRoot(path.join(resolveUploadRoot(), csvRelative));
    const xlsxFull = ensureWithinUploadRoot(path.join(resolveUploadRoot(), xlsxRelative));

    await fs.promises.mkdir(path.dirname(csvFull), { recursive: true });
    await fs.promises.writeFile(csvFull, args.csv);
    await fs.promises.writeFile(xlsxFull, args.xlsx);

    return {
      csvPath: csvRelative,
      xlsxPath: xlsxRelative,
    };
  }

  private async safeDeleteSnapshotFiles(snapshot: SnapshotRow): Promise<void> {
    const candidates = [snapshot.csv_file_path, snapshot.xlsx_file_path].filter(Boolean) as string[];
    for (const relative of candidates) {
      try {
        const full = ensureWithinUploadRoot(path.join(resolveUploadRoot(), relative));
        await fs.promises.unlink(full);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          logger.warn('Failed to delete snapshot file during retention cleanup', {
            snapshotId: snapshot.id,
            filePath: relative,
            error,
          });
        }
      }
    }
  }

  private async fetchSavedReportForSnapshot(reportId: string): Promise<SavedReportRow | null> {
    const result = await this.db.query<SavedReportRow>(
      `SELECT id, name, entity, created_by, report_definition
       FROM saved_reports
       WHERE id = $1
       LIMIT 1`,
      [reportId]
    );
    return result.rows[0] ?? null;
  }

  private assertSnapshotOwnerOrAdmin(
    savedReport: SavedReportRow,
    actorUserId: string,
    actorRole: string
  ): void {
    if (actorRole === 'admin') return;
    if (savedReport.created_by && savedReport.created_by === actorUserId) return;
    throw new Error('Only report owner or admin can manage public links');
  }

  private applySnapshotLimit(definition: ReportDefinition): ReportDefinition {
    const cap = this.getSnapshotRowCap();
    const requested = definition.limit ?? cap;
    return {
      ...definition,
      limit: Math.min(requested, cap),
    };
  }

  private assertScopeAvailability(entity: ReportEntity, organizationId?: string): void {
    if (!SCOPED_REPORT_ENTITIES.includes(entity)) return;
    if (!organizationId) {
      throw new Error('Organization scope is required for this report');
    }
  }

  private async markSnapshotExpired(snapshot: SnapshotRow): Promise<void> {
    const retentionUntil = this.buildRetentionUntil();
    await this.db.query(
      `UPDATE saved_report_public_snapshots
       SET status = 'expired',
           retention_until = COALESCE(retention_until, $2::timestamptz),
           updated_at = NOW()
       WHERE id = $1`,
      [snapshot.id, retentionUntil]
    );
    await this.db.query(
      `UPDATE saved_reports
       SET public_token = CASE WHEN public_token = $2 THEN NULL ELSE public_token END,
           updated_at = NOW()
       WHERE id = $1`,
      [snapshot.saved_report_id, snapshot.token]
    );
  }

  private async getSnapshotByTokenRaw(token: string): Promise<SnapshotRow | null> {
    const result = await this.db.query<SnapshotRow>(
      `SELECT s.*, r.name AS report_name, r.entity
       FROM saved_report_public_snapshots s
       INNER JOIN saved_reports r ON r.id = s.saved_report_id
       WHERE s.token = $1
       LIMIT 1`,
      [token]
    );
    return result.rows[0] ?? null;
  }

  async createSnapshotForPublicLink(args: {
    savedReportId: string;
    actorUserId: string;
    actorRole: string;
    organizationId?: string;
    expiresAt?: string;
  }): Promise<{ token: string; url: string }> {
    const savedReport = await this.fetchSavedReportForSnapshot(args.savedReportId);
    if (!savedReport) {
      throw new Error('Report not found');
    }

    this.assertSnapshotOwnerOrAdmin(savedReport, args.actorUserId, args.actorRole);
    this.assertScopeAvailability(savedReport.entity, args.organizationId);

    const parsedDefinition = parseDefinition(savedReport.report_definition);
    const cappedDefinition = this.applySnapshotLimit(parsedDefinition);
    const generated = await this.reportService.generateReport(cappedDefinition, {
      organizationId: args.organizationId,
    });

    const snapshotId = crypto.randomUUID();
    const token = this.generateToken();
    const csv = await this.reportService.exportReport(generated, 'csv');
    const xlsx = await this.reportService.exportReport(generated, 'xlsx');
    const files = await this.writeSnapshotFiles({
      snapshotId,
      csv: csv.buffer,
      xlsx: xlsx.buffer,
    });

    const expiresDate = getExpiryFromInput(args.expiresAt);
    const expiresIso = expiresDate?.toISOString() ?? null;
    const retentionUntil =
      expiresDate && expiresIso && expiresDate.getTime() <= Date.now()
        ? this.buildRetentionUntil()
        : null;

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE saved_report_public_snapshots
         SET status = 'revoked',
             revoked_at = NOW(),
             retention_until = COALESCE(retention_until, $2::timestamptz),
             updated_at = NOW()
         WHERE saved_report_id = $1
           AND status = 'active'`,
        [args.savedReportId, this.buildRetentionUntil()]
      );

      await client.query(
        `INSERT INTO saved_report_public_snapshots (
           id,
           saved_report_id,
           token,
           status,
           rows_count,
           csv_file_path,
           xlsx_file_path,
           expires_at,
           retention_until,
           created_by
         )
         VALUES ($1, $2, $3, 'active', $4, $5, $6, $7, $8, $9)`,
        [
          snapshotId,
          args.savedReportId,
          token,
          generated.data.length,
          files.csvPath,
          files.xlsxPath,
          expiresIso,
          retentionUntil,
          args.actorUserId,
        ]
      );

      await client.query(
        `UPDATE saved_reports
         SET public_token = $2,
             share_settings = CASE
               WHEN $3::timestamptz IS NULL THEN COALESCE(share_settings, '{}'::jsonb) - 'expires_at'
               ELSE jsonb_set(
                 COALESCE(share_settings, '{}'::jsonb),
                 '{expires_at}',
                 to_jsonb($3::timestamptz)
               )
             END,
             updated_at = NOW()
         WHERE id = $1`,
        [args.savedReportId, token, expiresIso]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      await this.safeDeleteSnapshotFiles({
        id: snapshotId,
        saved_report_id: args.savedReportId,
        token,
        status: 'active',
        rows_count: generated.data.length,
        csv_file_path: files.csvPath,
        xlsx_file_path: files.xlsxPath,
        expires_at: expiresIso,
        revoked_at: null,
        retention_until: retentionUntil,
        purged_at: null,
        created_by: args.actorUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      throw error;
    } finally {
      client.release();
    }

    return { token, url: `/public/reports/${token}` };
  }

  async revokePublicLink(args: {
    savedReportId: string;
    actorUserId: string;
    actorRole: string;
  }): Promise<void> {
    const savedReport = await this.fetchSavedReportForSnapshot(args.savedReportId);
    if (!savedReport) {
      throw new Error('Report not found');
    }
    this.assertSnapshotOwnerOrAdmin(savedReport, args.actorUserId, args.actorRole);

    const retentionUntil = this.buildRetentionUntil();
    await this.db.query(
      `UPDATE saved_report_public_snapshots
       SET status = CASE
         WHEN status = 'purged' THEN status
         ELSE 'revoked'
       END,
           revoked_at = COALESCE(revoked_at, NOW()),
           retention_until = COALESCE(retention_until, $2::timestamptz),
           updated_at = NOW()
       WHERE saved_report_id = $1
         AND status IN ('active', 'expired', 'revoked')`,
      [args.savedReportId, retentionUntil]
    );

    await this.db.query(
      `UPDATE saved_reports
       SET public_token = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [args.savedReportId]
    );
  }

  async getPublicSnapshotMeta(token: string): Promise<PublicReportSnapshotMeta | null> {
    const snapshot = await this.getSnapshotByTokenRaw(token);
    if (!snapshot) return null;

    if (snapshot.status === 'active' && hasSnapshotExpired(snapshot)) {
      await this.markSnapshotExpired(snapshot);
      const refreshed = await this.getSnapshotByTokenRaw(token);
      if (!refreshed) return null;
      return {
        token: refreshed.token,
        report_id: refreshed.saved_report_id,
        report_name: refreshed.report_name || 'Saved Report',
        entity: refreshed.entity || 'contacts',
        rows_count: refreshed.rows_count,
        lifecycle_state: refreshed.status,
        expires_at: normalizeIso(refreshed.expires_at),
        created_at: normalizeIso(refreshed.created_at) || new Date().toISOString(),
        available_formats: resolveAvailableFormats(refreshed),
      };
    }

    return {
      token: snapshot.token,
      report_id: snapshot.saved_report_id,
      report_name: snapshot.report_name || 'Saved Report',
      entity: snapshot.entity || 'contacts',
      rows_count: snapshot.rows_count,
      lifecycle_state: snapshot.status,
      expires_at: normalizeIso(snapshot.expires_at),
      created_at: normalizeIso(snapshot.created_at) || new Date().toISOString(),
      available_formats: resolveAvailableFormats(snapshot),
    };
  }

  async getPublicSnapshotDownload(token: string, format: 'csv' | 'xlsx'): Promise<{
    fileName: string;
    contentType: string;
    buffer: Buffer;
  }> {
    const meta = await this.getPublicSnapshotMeta(token);
    if (!meta) {
      throw new Error('Public report not found');
    }
    if (meta.lifecycle_state !== 'active') {
      throw new Error('Public report link is no longer active');
    }

    const snapshot = await this.getSnapshotByTokenRaw(token);
    if (!snapshot) {
      throw new Error('Public report not found');
    }

    const relativePath = format === 'csv' ? snapshot.csv_file_path : snapshot.xlsx_file_path;
    if (!relativePath) {
      throw new Error(`Snapshot format not available: ${format}`);
    }

    const fullPath = ensureWithinUploadRoot(path.join(resolveUploadRoot(), relativePath));
    const buffer = await fs.promises.readFile(fullPath);
    const extension = format === 'xlsx' ? 'xlsx' : 'csv';
    const fileName = `${meta.entity}_public_snapshot_${meta.created_at.slice(0, 10)}.${extension}`;
    const contentType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';

    return {
      fileName,
      contentType,
      buffer,
    };
  }

  private async markDueSnapshotsExpired(): Promise<number> {
    const retentionUntil = this.buildRetentionUntil();

    const expiredResult = await this.db.query<ExpiredSnapshotUpdateRow>(
      `UPDATE saved_report_public_snapshots
       SET status = 'expired',
           retention_until = COALESCE(retention_until, $1::timestamptz),
           updated_at = NOW()
       WHERE status = 'active'
         AND expires_at IS NOT NULL
         AND expires_at <= NOW()
       RETURNING saved_report_id, token`,
      [retentionUntil]
    );

    const expiredTokens = Array.from(
      new Set(expiredResult.rows.map((row) => row.token).filter(Boolean))
    );

    if (expiredTokens.length > 0) {
      await this.db.query(
        `UPDATE saved_reports
         SET public_token = NULL,
             updated_at = NOW()
         WHERE public_token = ANY($1::text[])`,
        [expiredTokens]
      );
    }

    return expiredResult.rowCount ?? expiredResult.rows.length;
  }

  async purgeRetainedSnapshots(batchSize: number): Promise<number> {
    await this.markDueSnapshotsExpired();

    const result = await this.db.query<SnapshotRow>(
      `SELECT id, saved_report_id, token, status, rows_count, csv_file_path, xlsx_file_path,
              expires_at, revoked_at, retention_until, purged_at, created_by, created_at, updated_at
       FROM saved_report_public_snapshots
       WHERE purged_at IS NULL
         AND status IN ('revoked', 'expired')
         AND retention_until IS NOT NULL
         AND retention_until <= NOW()
       ORDER BY retention_until ASC
       LIMIT $1`,
      [batchSize]
    );

    let purged = 0;
    for (const snapshot of result.rows) {
      await this.safeDeleteSnapshotFiles(snapshot);
      await this.db.query(
        `UPDATE saved_report_public_snapshots
         SET status = 'purged',
             csv_file_path = NULL,
             xlsx_file_path = NULL,
             purged_at = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [snapshot.id]
      );
      purged += 1;
    }

    return purged;
  }
}

export const publicReportSnapshotService = new PublicReportSnapshotService(pool);
