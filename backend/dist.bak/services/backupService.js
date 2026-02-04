"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const promises_1 = require("stream/promises");
const zlib = __importStar(require("zlib"));
const database_1 = __importDefault(require("../config/database"));
const DEFAULT_SECRET_FIELDS = {
    users: ['password_hash', 'mfa_totp_secret_enc', 'mfa_totp_pending_secret_enc'],
    portal_users: ['password_hash'],
    portal_admins: ['password_hash'],
    user_invitations: ['token'],
    portal_invitations: ['token'],
};
async function writeChunk(stream, chunk) {
    if (stream.write(chunk))
        return;
    await new Promise((resolve, reject) => {
        stream.once('drain', resolve);
        stream.once('error', reject);
    });
}
function sanitizeFilename(input, fallbackBase) {
    const base = (input || fallbackBase)
        .trim()
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 100);
    return base || fallbackBase;
}
function toUtcTimestampForFilename(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}
class BackupService {
    constructor() {
        this.exportDir = path.join(__dirname, '../../exports');
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }
    async createBackupFile(options) {
        const includeSecrets = Boolean(options.includeSecrets);
        const compress = options.compress !== false;
        const now = new Date();
        const defaultName = `nonprofit-manager-backup-${toUtcTimestampForFilename(now)}${includeSecrets ? '-full' : ''}`;
        const filenameBase = sanitizeFilename(options.filename, defaultName);
        const extension = compress ? '.json.gz' : '.json';
        const filepath = path.join(this.exportDir, `${filenameBase}${extension}`);
        const tables = await this.listPublicTables();
        const fileStream = fs.createWriteStream(filepath);
        if (!compress) {
            await this.writeBackupJson(fileStream, tables, { includeSecrets, generatedAt: now });
            await new Promise((resolve, reject) => {
                fileStream.on('finish', resolve);
                fileStream.on('error', reject);
                fileStream.end();
            });
            return filepath;
        }
        const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_SPEED });
        const gzipWrite = async () => {
            await this.writeBackupJson(gzip, tables, { includeSecrets, generatedAt: now });
            gzip.end();
        };
        await Promise.all([(0, promises_1.pipeline)(gzip, fileStream), gzipWrite()]);
        return filepath;
    }
    async deleteExport(filepath) {
        try {
            await fs.promises.unlink(filepath);
        }
        catch {
            // ignore
        }
    }
    async listPublicTables() {
        const result = await database_1.default.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name ASC
      `);
        return result.rows.map((r) => r.table_name);
    }
    async getTableColumns(tableName) {
        const result = await database_1.default.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position ASC
      `, [tableName]);
        return result.rows.map((r) => ({
            name: r.column_name,
            dataType: r.data_type,
            isNullable: r.is_nullable === 'YES',
        }));
    }
    redactRow(tableName, row) {
        const fields = DEFAULT_SECRET_FIELDS[tableName];
        if (!fields || fields.length === 0)
            return row;
        const cloned = { ...row };
        for (const field of fields) {
            if (field in cloned)
                cloned[field] = null;
        }
        return cloned;
    }
    async writeBackupJson(stream, tables, meta) {
        const rowCounts = {};
        await writeChunk(stream, `{"meta":${JSON.stringify({
            generated_at: meta.generatedAt.toISOString(),
            schema: 'public',
            include_secrets: meta.includeSecrets,
            table_count: tables.length,
        })},"tables":{`);
        let firstTable = true;
        for (const tableName of tables) {
            const columns = await this.getTableColumns(tableName);
            const dataResult = await database_1.default.query(`SELECT * FROM "${tableName}"`);
            rowCounts[tableName] = dataResult.rowCount || dataResult.rows.length;
            if (!firstTable)
                await writeChunk(stream, ',');
            firstTable = false;
            await writeChunk(stream, `${JSON.stringify(tableName)}:{`);
            await writeChunk(stream, `"columns":${JSON.stringify(columns.map((c) => ({ name: c.name, data_type: c.dataType, is_nullable: c.isNullable })))},`);
            await writeChunk(stream, `"rows":[`);
            let firstRow = true;
            for (const rawRow of dataResult.rows) {
                const row = meta.includeSecrets ? rawRow : this.redactRow(tableName, rawRow);
                if (!firstRow)
                    await writeChunk(stream, ',');
                firstRow = false;
                await writeChunk(stream, JSON.stringify(row));
            }
            await writeChunk(stream, `]}`);
        }
        await writeChunk(stream, `},"row_counts":${JSON.stringify(rowCounts)}}`);
    }
}
exports.BackupService = BackupService;
//# sourceMappingURL=backupService.js.map