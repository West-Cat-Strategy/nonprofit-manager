"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSqlToDatasets = parseSqlToDatasets;
const infer_1 = require("../infer");
const utils_1 = require("../utils");
function stripSqlComments(sql) {
    let out = sql.replace(/--.*$/gm, '');
    out = out.replace(/\/\*[\s\S]*?\*\//g, '');
    return out;
}
function normalizeSqlIdent(ident) {
    const s = ident.trim();
    const unquoted = s.replace(/^["'`]|["'`]$/g, '');
    const parts = unquoted.split('.');
    return parts[parts.length - 1];
}
function parseCreateTable(sql) {
    const statements = [];
    const re = /create\s+table\s+([a-zA-Z0-9_."`]+)\s*\(([\s\S]*?)\)\s*;/gi;
    let m;
    while ((m = re.exec(sql))) {
        const table = normalizeSqlIdent(m[1]);
        const body = m[2];
        const items = (0, utils_1.splitSqlListTopLevel)(body);
        const columns = [];
        for (const item of items) {
            const trimmed = item.trim();
            if (!trimmed)
                continue;
            if (/^(constraint|primary\s+key|foreign\s+key|unique|check)\b/i.test(trimmed))
                continue;
            const tokens = trimmed.split(/\s+/);
            if (tokens.length < 2)
                continue;
            const colName = normalizeSqlIdent(tokens[0]);
            if (!colName)
                continue;
            columns.push(colName);
        }
        if (columns.length)
            statements.push({ table, columns: (0, utils_1.uniq)(columns) });
    }
    return statements;
}
function parseValuesGroups(valuesBody) {
    const rows = [];
    let i = 0;
    while (i < valuesBody.length) {
        while (i < valuesBody.length && /\s|,/.test(valuesBody[i]))
            i++;
        if (valuesBody[i] !== '(')
            break;
        i++;
        let depth = 1;
        let current = '';
        let inSingle = false;
        let inDouble = false;
        const row = [];
        while (i < valuesBody.length && depth > 0) {
            const ch = valuesBody[i];
            if (ch === "'" && !inDouble) {
                inSingle = !inSingle;
                current += ch;
                i++;
                continue;
            }
            if (ch === '"' && !inSingle) {
                inDouble = !inDouble;
                current += ch;
                i++;
                continue;
            }
            if (!inSingle && !inDouble) {
                if (ch === '(')
                    depth++;
                if (ch === ')')
                    depth--;
                if (ch === ',' && depth === 1) {
                    row.push(current.trim());
                    current = '';
                    i++;
                    continue;
                }
            }
            if (depth > 0)
                current += ch;
            i++;
        }
        row.push(current.trim());
        rows.push(row);
    }
    return rows;
}
function parseInsert(sql, createTableColumns) {
    const statements = [];
    const reWithCols = /insert\s+into\s+([a-zA-Z0-9_."`]+)\s*\(([\s\S]*?)\)\s*values\s*([\s\S]*?);/gi;
    const reNoCols = /insert\s+into\s+([a-zA-Z0-9_."`]+)\s*values\s*([\s\S]*?);/gi;
    let m;
    while ((m = reWithCols.exec(sql))) {
        const table = normalizeSqlIdent(m[1]);
        const cols = (0, utils_1.splitSqlListTopLevel)(m[2]).map((c) => normalizeSqlIdent(c));
        const rows = parseValuesGroups(m[3].trim());
        statements.push({ table, columns: cols, rows });
    }
    while ((m = reNoCols.exec(sql))) {
        // Avoid double-counting inserts that also matched the with-cols regex.
        if (m[0].includes('(') && m[0].toLowerCase().includes(') values'))
            continue;
        const table = normalizeSqlIdent(m[1]);
        const cols = createTableColumns.get(table) ?? [];
        const rows = parseValuesGroups(m[2].trim());
        statements.push({ table, columns: cols, rows });
    }
    return statements;
}
function parseSelect(sql) {
    const statements = [];
    const re = /select\s+([\s\S]*?)\s+from\s+([a-zA-Z0-9_."`]+)/gi;
    let m;
    while ((m = re.exec(sql))) {
        const selectList = m[1];
        const from = normalizeSqlIdent(m[2]);
        const items = (0, utils_1.splitSqlListTopLevel)(selectList);
        const columns = [];
        for (const item of items) {
            const trimmed = item.trim();
            if (!trimmed)
                continue;
            if (trimmed === '*')
                continue;
            const asMatch = trimmed.match(/\s+as\s+([a-zA-Z0-9_."`]+)\s*$/i);
            if (asMatch) {
                columns.push(normalizeSqlIdent(asMatch[1]));
                continue;
            }
            const tokens = trimmed.split(/\s+/);
            if (tokens.length >= 2) {
                const last = tokens[tokens.length - 1];
                if (/^[a-zA-Z0-9_."`]+$/.test(last) && !/[()]/.test(last)) {
                    columns.push(normalizeSqlIdent(last));
                    continue;
                }
            }
            const dotParts = trimmed.split('.');
            columns.push(normalizeSqlIdent(dotParts[dotParts.length - 1]));
        }
        if (columns.length)
            statements.push({ name: `SELECT:${from}`, columns: (0, utils_1.uniq)(columns) });
    }
    return statements;
}
function buildDataset(name, columnNames, rows, meta) {
    const normalizedHeaders = columnNames.map((h) => (0, utils_1.normalizeName)(h) || h);
    const warnings = [];
    if ((0, utils_1.uniq)(normalizedHeaders).length !== normalizedHeaders.length) {
        warnings.push('Some column names normalize to the same value; collisions may occur.');
    }
    const columns = columnNames.map((col, idx) => {
        const values = rows.map((r) => r[col] ?? null);
        const nonEmptyCount = values.filter((v) => v !== null && String(v).trim() !== '').length;
        const uniqueCount = new Set(values.filter((v) => v !== null)).size;
        const samples = (0, utils_1.take)(values.filter((v) => v !== null), 25);
        const lengths = samples.map((s) => s.length);
        const minLength = lengths.length ? Math.min(...lengths) : 0;
        const maxLength = lengths.length ? Math.max(...lengths) : 0;
        const avgLength = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
        const inferred = (0, infer_1.inferColumn)(values);
        return {
            name: col,
            normalizedName: normalizedHeaders[idx],
            inferredType: inferred.inferredType,
            inferredTypeConfidence: inferred.confidence,
            inferenceStats: inferred.stats,
            detectedPatterns: inferred.patterns,
            nonEmptyCount,
            uniqueCount,
            nullishCount: values.length - nonEmptyCount,
            nonEmptyRatio: (0, utils_1.safeRatio)(nonEmptyCount, values.length),
            uniqueRatio: (0, utils_1.safeRatio)(uniqueCount, Math.max(1, nonEmptyCount)),
            minLength,
            maxLength,
            avgLength,
            samples,
        };
    });
    return {
        sourceType: 'sql',
        name,
        columnNames,
        rowCount: rows.length,
        sampleRows: (0, utils_1.take)(rows, 25),
        columns,
        warnings,
        meta,
    };
}
function normalizeSqlValue(raw) {
    const v = raw.trim();
    const unquoted = v.replace(/^'(.*)'$/s, '$1').replace(/^"(.*)"$/s, '$1');
    if (/^null$/i.test(unquoted))
        return null;
    return unquoted === '' ? null : unquoted;
}
function parseSqlToDatasets(sql, options = {}) {
    const cleaned = stripSqlComments(sql);
    const datasets = [];
    const creates = parseCreateTable(cleaned);
    const createColumnsByTable = new Map();
    for (const c of creates)
        createColumnsByTable.set(c.table, c.columns);
    for (const c of creates) {
        datasets.push(buildDataset(`${options.name ?? 'SQL'}:CREATE_TABLE:${c.table}`, c.columns, [], {
            table: c.table,
            statementType: 'create_table',
        }));
    }
    const inserts = parseInsert(cleaned, createColumnsByTable);
    for (const ins of inserts) {
        if (ins.columns.length === 0) {
            const ds = buildDataset(`${options.name ?? 'SQL'}:INSERT:${ins.table}`, [], [], {
                table: ins.table,
                statementType: 'insert',
            });
            ds.warnings.push('INSERT statement has no column list and no prior CREATE TABLE columns were found.');
            datasets.push(ds);
            continue;
        }
        const rows = [];
        for (const r of ins.rows.slice(0, options.maxSampleRows ?? 50)) {
            const obj = {};
            for (let i = 0; i < ins.columns.length; i++) {
                obj[ins.columns[i]] = r[i] === undefined ? null : normalizeSqlValue(r[i]);
            }
            rows.push(obj);
        }
        datasets.push(buildDataset(`${options.name ?? 'SQL'}:INSERT:${ins.table}`, ins.columns, rows, {
            table: ins.table,
            statementType: 'insert',
            sampledRows: rows.length,
        }));
    }
    const selects = parseSelect(cleaned);
    for (const sel of selects) {
        datasets.push(buildDataset(`${options.name ?? 'SQL'}:${sel.name}`, sel.columns, [], { statementType: 'select' }));
    }
    if (datasets.length === 0) {
        const ds = buildDataset(options.name ?? 'SQL', [], [], {});
        ds.warnings.push('No CREATE TABLE / INSERT / SELECT patterns detected.');
        datasets.push(ds);
    }
    return datasets;
}
//# sourceMappingURL=sql.js.map