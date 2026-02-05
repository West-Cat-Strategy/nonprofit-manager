import ExcelJS from 'exceljs';
import type { IngestDataset } from '../types';
import { inferColumn } from '../infer';
import { normalizeName, safeRatio, take, uniq } from '../utils';

export interface ExcelParseOptions {
  name?: string;
  sheetName?: string;
  maxRows?: number;
  hasHeader?: boolean | 'auto';
}

function looksLikeHeader(first: unknown[], second?: unknown[]): boolean {
  const a = first.map((v) => (v === null || v === undefined ? '' : String(v).trim()));
  if (a.length === 0) return false;

  const nonEmpty = a.filter(Boolean).length;
  const unique = new Set(a.map((v) => v.toLowerCase())).size === a.length;
  const numericish = a.filter((v) => /^-?\d+(\.\d+)?$/.test(v)).length;
  if (!unique) return false;
  if (nonEmpty / a.length < 0.6) return false;
  if (numericish / a.length > 0.2) return false;

  if (second) {
    const b = second.map((v) => (v === null || v === undefined ? '' : String(v).trim()));
    const bNumericish = b.filter((v) => /^-?\d+(\.\d+)?$/.test(v)).length;
    if (bNumericish / Math.max(1, b.length) > numericish / Math.max(1, a.length)) return true;
  }

  return true;
}

function toRowObject(headers: string[], values: unknown[]): Record<string, string | null> {
  const row: Record<string, string | null> = {};
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

function getCellValue(cell: ExcelJS.Cell): unknown {
  if (!cell || cell.value === null || cell.value === undefined) {
    return null;
  }

  const value = cell.value;

  // Handle different cell value types
  if (typeof value === 'object') {
    // Rich text
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((rt: { text?: string }) => rt.text || '').join('');
    }
    // Formula result
    if ('result' in value) {
      return value.result;
    }
    // Hyperlink
    if ('text' in value) {
      return value.text;
    }
    // Date
    if (value instanceof Date) {
      return value.toISOString();
    }
  }

  return value;
}

export async function parseExcelToDatasets(buffer: Buffer, options: ExcelParseOptions = {}): Promise<IngestDataset[]> {
  const maxRows = options.maxRows ?? 5000;
  const workbook = new ExcelJS.Workbook();
  // ExcelJS load accepts Buffer in Node.js environments
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheetNames =
    options.sheetName && workbook.worksheets.some(ws => ws.name === options.sheetName)
      ? [options.sheetName]
      : workbook.worksheets.map(ws => ws.name);

  const datasets: IngestDataset[] = [];

  for (const sheetName of sheetNames) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;

    // Convert worksheet to array of arrays
    const rows: unknown[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const rowValues: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Ensure we fill in gaps for empty cells
        while (rowValues.length < colNumber - 1) {
          rowValues.push(null);
        }
        rowValues.push(getCellValue(cell));
      });
      rows.push(rowValues);
    });

    const nonEmptyRows = rows.filter((r) => r.some((v) => v !== null && v !== undefined && String(v).trim()));

    const warnings: string[] = [];
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

    const normalizedHeaders = headers.map((h) => normalizeName(h) || h);
    if (uniq(normalizedHeaders).length !== normalizedHeaders.length) {
      warnings.push('Some column names normalize to the same value; collisions may occur.');
    }

    const dataRows = (hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows).slice(0, maxRows);
    const rowObjects = dataRows.map((r) => toRowObject(headers, r));

    const columns = headers.map((name, idx) => {
      const values = rowObjects.map((r) => r[name] ?? null);
      const nonEmptyCount = values.filter((v) => v !== null).length;
      const uniqueCount = new Set(values.filter((v) => v !== null)).size;
      const samples = take(values.filter((v): v is string => v !== null), 25);

      const lengths = samples.map((s) => s.length);
      const minLength = lengths.length ? Math.min(...lengths) : 0;
      const maxLength = lengths.length ? Math.max(...lengths) : 0;
      const avgLength = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;

      const inferred = inferColumn(values);

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
        nonEmptyRatio: safeRatio(nonEmptyCount, values.length),
        uniqueRatio: safeRatio(uniqueCount, Math.max(1, nonEmptyCount)),
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
      sampleRows: take(rowObjects, 25),
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

// Synchronous wrapper for backward compatibility (uses sync parsing where possible)
export function parseExcelToDatasetsSynced(_buffer: Buffer, _options: ExcelParseOptions = {}): IngestDataset[] {
  // For ExcelJS we need to use the async API, so this is a placeholder
  // that will throw an error if called - callers should use the async version
  throw new Error('parseExcelToDatasetsSynced is not supported with ExcelJS. Use parseExcelToDatasets instead.');
}
