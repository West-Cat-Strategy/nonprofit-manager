import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import * as zlib from 'zlib';
import pool from '@config/database';

export interface BackupExportOptions {
  filename?: string;
  includeSecrets?: boolean;
  compress?: boolean;
}

interface TableColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
}

const DEFAULT_SECRET_FIELDS: Record<string, string[]> = {
  users: ['password_hash', 'mfa_totp_secret_enc', 'mfa_totp_pending_secret_enc'],
  portal_users: ['password_hash'],
  portal_admins: ['password_hash'],
  user_invitations: ['token'],
  portal_invitations: ['token'],
};

const EXPORT_CHUNK_SIZE = 1000;
const DEFAULT_EXPORT_DIR = path.join(os.tmpdir(), 'nonprofit-manager', 'exports');

const quoteIdentifier = (value: string): string => `"${value.replace(/"/g, '""')}"`;

async function writeChunk(stream: NodeJS.WritableStream, chunk: string): Promise<void> {
  if (stream.write(chunk)) return;
  await new Promise<void>((resolve, reject) => {
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      stream.off('drain', onDrain);
      stream.off('error', onError);
    };

    stream.on('drain', onDrain);
    stream.on('error', onError);
  });
}

function sanitizeFilename(input: string | undefined, fallbackBase: string): string {
  const base = (input || fallbackBase)
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

  return base || fallbackBase;
}

function toUtcTimestampForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(
    date.getUTCHours()
  )}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

export class BackupService {
  private exportDir: string;

  constructor() {
    this.exportDir = process.env.BACKUP_EXPORT_DIR || DEFAULT_EXPORT_DIR;
  }

  async createBackupFile(options: BackupExportOptions): Promise<string> {
    const includeSecrets = Boolean(options.includeSecrets);
    const compress = options.compress !== false;

    const now = new Date();
    const defaultName = `nonprofit-manager-backup-${toUtcTimestampForFilename(now)}${
      includeSecrets ? '-full' : ''
    }`;
    const filenameBase = sanitizeFilename(options.filename, defaultName);
    const extension = compress ? '.json.gz' : '.json';
    const filepath = path.join(this.exportDir, `${filenameBase}${extension}`);
    await fs.promises.mkdir(this.exportDir, { recursive: true });
    await this.pruneOldExports();

    const tables = await this.listPublicTables();

    const fileStream = fs.createWriteStream(filepath);
    if (!compress) {
      await this.writeBackupJson(fileStream, tables, { includeSecrets, generatedAt: now });
      await new Promise<void>((resolve, reject) => {
        fileStream.on('finish', resolve);
        fileStream.on('error', reject);
        fileStream.end();
      });
      return filepath;
    }

    const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_SPEED });
    const gzipWrite = async (): Promise<void> => {
      await this.writeBackupJson(gzip, tables, { includeSecrets, generatedAt: now });
      gzip.end();
    };

    await Promise.all([pipeline(gzip, fileStream), gzipWrite()]);

    return filepath;
  }

  async deleteExport(filepath: string): Promise<void> {
    try {
      await fs.promises.unlink(filepath);
    } catch {
      // ignore
    }
  }

  private async listPublicTables(): Promise<string[]> {
    const excludedFromEnv = (process.env.BACKUP_EXCLUDED_TABLES || '')
      .split(',')
      .map((table) => table.trim())
      .filter(Boolean);
    const defaultExcludedInTests =
      process.env.NODE_ENV === 'test'
        ? ['audit_log', 'portal_activity_logs', 'api_key_usage']
        : [];
    const excludedTables = Array.from(new Set([...excludedFromEnv, ...defaultExcludedInTests]));

    const result = await pool.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND NOT (table_name = ANY($1::text[]))
        ORDER BY table_name ASC
      `,
      [excludedTables]
    );

    return result.rows.map((r) => r.table_name as string);
  }

  private async getTableColumns(tableName: string): Promise<TableColumnInfo[]> {
    const result = await pool.query(
      `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position ASC
      `,
      [tableName]
    );

    return result.rows.map((r) => ({
      name: r.column_name as string,
      dataType: r.data_type as string,
      isNullable: (r.is_nullable as string) === 'YES',
    }));
  }

  private redactRow(tableName: string, row: Record<string, unknown>): Record<string, unknown> {
    const fields = DEFAULT_SECRET_FIELDS[tableName];
    if (!fields || fields.length === 0) return row;

    const cloned: Record<string, unknown> = { ...row };
    for (const field of fields) {
      if (field in cloned) cloned[field] = null;
    }
    return cloned;
  }

  private async writeBackupJson(
    stream: NodeJS.WritableStream,
    tables: string[],
    meta: { includeSecrets: boolean; generatedAt: Date }
  ): Promise<void> {
    const rowCounts: Record<string, number> = {};

    await writeChunk(
      stream,
      `{"meta":${JSON.stringify({
        generated_at: meta.generatedAt.toISOString(),
        schema: 'public',
        include_secrets: meta.includeSecrets,
        table_count: tables.length,
      })},"tables":{`
    );

    let firstTable = true;
    for (const tableName of tables) {
      const columns = await this.getTableColumns(tableName);
      const columnNames = columns.map((column) => column.name);
      const selectColumnsSql = columnNames.map((columnName) => quoteIdentifier(columnName)).join(', ');
      const tableIdentifier = quoteIdentifier(tableName);
      const idColumn = columns.find((column) => column.name === 'id');
      let offset = 0;
      let lastSeenId: string | number | null = null;
      let tableRowCount = 0;

      if (!firstTable) await writeChunk(stream, ',');
      firstTable = false;

      await writeChunk(stream, `${JSON.stringify(tableName)}:{`);

      await writeChunk(
        stream,
        `"columns":${JSON.stringify(
          columns.map((c) => ({ name: c.name, data_type: c.dataType, is_nullable: c.isNullable }))
        )},`
      );

      await writeChunk(stream, `"rows":[`);

      let firstRow = true;
      while (true) {
        const chunkResult = idColumn
          ? await pool.query(
            lastSeenId === null
              ? `SELECT ${selectColumnsSql}
                 FROM ${tableIdentifier}
                 ORDER BY ${quoteIdentifier(idColumn.name)} ASC
                 LIMIT $1`
              : `SELECT ${selectColumnsSql}
                 FROM ${tableIdentifier}
                 WHERE ${quoteIdentifier(idColumn.name)} > $2
                 ORDER BY ${quoteIdentifier(idColumn.name)} ASC
                 LIMIT $1`,
            lastSeenId === null ? [EXPORT_CHUNK_SIZE] : [EXPORT_CHUNK_SIZE, lastSeenId]
          )
          : await pool.query(
            `SELECT ${selectColumnsSql}
             FROM ${tableIdentifier}
             LIMIT $1 OFFSET $2`,
            [EXPORT_CHUNK_SIZE, offset]
          );

        const chunkRows = chunkResult.rows as Record<string, unknown>[];
        if (chunkRows.length === 0) {
          break;
        }

        tableRowCount += chunkRows.length;
        if (idColumn) {
          const nextCursor = chunkRows[chunkRows.length - 1]?.[idColumn.name];
          lastSeenId = typeof nextCursor === 'string' || typeof nextCursor === 'number'
            ? nextCursor
            : String(nextCursor ?? '');
        } else {
          offset += chunkRows.length;
        }

        for (const rawRow of chunkRows) {
          const row = meta.includeSecrets ? rawRow : this.redactRow(tableName, rawRow);
          if (!firstRow) await writeChunk(stream, ',');
          firstRow = false;
          await writeChunk(stream, JSON.stringify(row));
        }
      }

      await writeChunk(stream, `]}`);
      rowCounts[tableName] = tableRowCount;
    }

    await writeChunk(stream, `},"row_counts":${JSON.stringify(rowCounts)}}`);
  }

  private async pruneOldExports(): Promise<void> {
    const retentionDays = Number.parseInt(process.env.BACKUP_EXPORT_RETENTION_DAYS || '', 10);
    if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
      return;
    }

    const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const entries = await fs.promises.readdir(this.exportDir, { withFileTypes: true });

    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const filepath = path.join(this.exportDir, entry.name);
          const stats = await fs.promises.stat(filepath);
          if (stats.mtimeMs < cutoffMs) {
            await fs.promises.unlink(filepath).catch(() => undefined);
          }
        })
    );
  }
}
