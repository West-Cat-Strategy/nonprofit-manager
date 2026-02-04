"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseExcelToDatasets = parseExcelToDatasets;
const xlsx_1 = __importDefault(require("xlsx"));
const infer_1 = require("../infer");
const utils_1 = require("../utils");
function looksLikeHeader(first, second) {
    const a = first.map((v) => (v === null || v === undefined ? '' : String(v).trim()));
    if (a.length === 0)
        return false;
    const nonEmpty = a.filter(Boolean).length;
    const unique = new Set(a.map((v) => v.toLowerCase())).size === a.length;
    const numericish = a.filter((v) => /^-?\d+(\.\d+)?$/.test(v)).length;
    if (!unique)
        return false;
    if (nonEmpty / a.length < 0.6)
        return false;
    if (numericish / a.length > 0.2)
        return false;
    if (second) {
        const b = second.map((v) => (v === null || v === undefined ? '' : String(v).trim()));
        const bNumericish = b.filter((v) => /^-?\d+(\.\d+)?$/.test(v)).length;
        if (bNumericish / Math.max(1, b.length) > numericish / Math.max(1, a.length))
            return true;
    }
    return true;
}
function toRowObject(headers, values) {
    const row = {};
    for (let i = 0; i < headers.length; i++) {
        const v = values[i];
        if (v === null || v === undefined) {
            row[headers[i]] = null;
            continue;
        }
        const s = String(v).trim();
        row[headers[i]] = s === '' ? null : s;
    }
    return row;
}
function parseExcelToDatasets(buffer, options = {}) {
    const maxRows = options.maxRows ?? 5000;
    const workbook = xlsx_1.default.read(buffer, { type: 'buffer' });
    const sheetNames = options.sheetName && workbook.SheetNames.includes(options.sheetName)
        ? [options.sheetName]
        : workbook.SheetNames;
    const datasets = [];
    for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet)
            continue;
        const rows = xlsx_1.default.utils.sheet_to_json(sheet, { header: 1, defval: null });
        const nonEmptyRows = rows.filter((r) => r.some((v) => v !== null && v !== undefined && String(v).trim()));
        const warnings = [];
        if (nonEmptyRows.length === 0) {
            datasets.push({
                sourceType: 'excel',
                name: `${options.name ?? 'Excel'}:${sheetName}`,
                columnNames: [],
                rowCount: 0,
                sampleRows: [],
                columns: [],
                warnings: ['No rows detected in sheet.'],
                meta: { sheetName },
            });
            continue;
        }
        const headerMode = options.hasHeader ?? 'auto';
        const firstRow = nonEmptyRows[0];
        const secondRow = nonEmptyRows[1];
        const hasHeader = headerMode === 'auto' ? looksLikeHeader(firstRow, secondRow) : headerMode;
        const headers = hasHeader
            ? firstRow.map((h, i) => {
                const s = h === null || h === undefined ? '' : String(h).trim();
                return s ? s : `column_${i + 1}`;
            })
            : firstRow.map((_, i) => `column_${i + 1}`);
        const normalizedHeaders = headers.map((h) => (0, utils_1.normalizeName)(h) || h);
        if ((0, utils_1.uniq)(normalizedHeaders).length !== normalizedHeaders.length) {
            warnings.push('Some column names normalize to the same value; collisions may occur.');
        }
        const dataRows = (hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows).slice(0, maxRows);
        const rowObjects = dataRows.map((r) => toRowObject(headers, r));
        const columns = headers.map((name, idx) => {
            const values = rowObjects.map((r) => r[name] ?? null);
            const nonEmptyCount = values.filter((v) => v !== null).length;
            const uniqueCount = new Set(values.filter((v) => v !== null)).size;
            const samples = (0, utils_1.take)(values.filter((v) => v !== null), 25);
            const lengths = samples.map((s) => s.length);
            const minLength = lengths.length ? Math.min(...lengths) : 0;
            const maxLength = lengths.length ? Math.max(...lengths) : 0;
            const avgLength = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
            const inferred = (0, infer_1.inferColumn)(values);
            return {
                name,
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
        datasets.push({
            sourceType: 'excel',
            name: `${options.name ?? 'Excel'}:${sheetName}`,
            columnNames: headers,
            rowCount: rowObjects.length,
            sampleRows: (0, utils_1.take)(rowObjects, 25),
            columns,
            warnings,
            meta: {
                sheetName,
                hasHeader,
                truncated: nonEmptyRows.length - (hasHeader ? 1 : 0) > maxRows,
            },
        });
    }
    return datasets;
}
//# sourceMappingURL=excel.js.map