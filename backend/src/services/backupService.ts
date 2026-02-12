import * as fs from 'fs';
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

async function writeChunk(stream: NodeJS.WritableStream, chunk: string): Promise<void> {
  if (stream.write(chunk)) return;
  await new Promise<void>((resolve, reject) => {
    stream.once('drain', resolve);
    stream.once('error', reject);
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
    this.exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
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
    const result = await pool.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC
      `
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
      const dataResult = await pool.query(`SELECT * FROM "${tableName}"`);

      rowCounts[tableName] = dataResult.rowCount || dataResult.rows.length;

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
      for (const rawRow of dataResult.rows as Record<string, unknown>[]) {
        const row = meta.includeSecrets ? rawRow : this.redactRow(tableName, rawRow);
        if (!firstRow) await writeChunk(stream, ',');
        firstRow = false;
        await writeChunk(stream, JSON.stringify(row));
      }

      await writeChunk(stream, `]}`);
    }

    await writeChunk(stream, `},"row_counts":${JSON.stringify(rowCounts)}}`);
  }
}

