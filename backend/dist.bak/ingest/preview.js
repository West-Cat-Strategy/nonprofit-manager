"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestPreviewFromText = ingestPreviewFromText;
exports.ingestPreviewFromTextAuto = ingestPreviewFromTextAuto;
exports.ingestPreviewFromBuffer = ingestPreviewFromBuffer;
const schemaRegistry_1 = require("./schemaRegistry");
const csv_1 = require("./parsers/csv");
const excel_1 = require("./parsers/excel");
const sql_1 = require("./parsers/sql");
const matcher_1 = require("./matcher");
function inferFormatFromFilename(filename) {
    if (!filename)
        return undefined;
    const lower = filename.toLowerCase();
    if (lower.endsWith('.csv'))
        return 'csv';
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls'))
        return 'excel';
    if (lower.endsWith('.sql'))
        return 'sql';
    return undefined;
}
function inferFormatFromMime(mime) {
    if (!mime)
        return undefined;
    const m = mime.toLowerCase();
    if (m.includes('spreadsheet') || m.includes('excel'))
        return 'excel';
    if (m.includes('csv'))
        return 'csv';
    if (m.includes('sql'))
        return 'sql';
    return undefined;
}
function inferFormatFromContent(text) {
    const sample = text.slice(0, 4096).toLowerCase();
    if (/\bcreate\s+table\b/.test(sample) || /\binsert\s+into\b/.test(sample) || /\bselect\b/.test(sample))
        return 'sql';
    // very light CSV sniff: has a delimiter-like first line with multiple separators
    const firstLine = sample.split(/\r?\n/)[0] ?? '';
    const comma = (firstLine.match(/,/g) ?? []).length;
    const tab = (firstLine.match(/\t/g) ?? []).length;
    const semi = (firstLine.match(/;/g) ?? []).length;
    const pipe = (firstLine.match(/\|/g) ?? []).length;
    const best = Math.max(comma, tab, semi, pipe);
    if (best >= 2)
        return 'csv';
    return undefined;
}
function ingestPreviewFromText(params) {
    const name = params.name ?? params.format.toUpperCase();
    const datasets = params.format === 'csv'
        ? [(0, csv_1.parseCsvToDataset)(params.text, { name })]
        : params.format === 'sql'
            ? (0, sql_1.parseSqlToDatasets)(params.text, { name })
            : [];
    const schemaSuggestions = datasets.map((d) => (0, matcher_1.suggestSchemaMatches)(d, schemaRegistry_1.schemaRegistry));
    return { datasets, schemaSuggestions };
}
function ingestPreviewFromTextAuto(params) {
    const format = inferFormatFromContent(params.text) ?? 'csv';
    return ingestPreviewFromText({ format, text: params.text, name: params.name ?? format.toUpperCase() });
}
function ingestPreviewFromBuffer(params) {
    const filenameHint = inferFormatFromFilename(params.filename);
    const mimeHint = inferFormatFromMime(params.mimeType);
    let format = params.format ?? filenameHint ?? mimeHint;
    if (!format || format === 'csv' || format === 'sql') {
        // For text-like inputs, sniff content when ambiguous.
        const asText = params.buffer.toString('utf8');
        format = format ?? inferFormatFromContent(asText) ?? 'csv';
    }
    const name = params.name ?? params.filename ?? format.toUpperCase();
    const datasets = format === 'excel'
        ? (0, excel_1.parseExcelToDatasets)(params.buffer, { name, sheetName: params.sheetName })
        : format === 'sql'
            ? (0, sql_1.parseSqlToDatasets)(params.buffer.toString('utf8'), { name })
            : [(0, csv_1.parseCsvToDataset)(params.buffer.toString('utf8'), { name })];
    const schemaSuggestions = datasets.map((d) => (0, matcher_1.suggestSchemaMatches)(d, schemaRegistry_1.schemaRegistry));
    return { datasets, schemaSuggestions };
}
//# sourceMappingURL=preview.js.map