import ExcelJS from 'exceljs';
import type { IngestDataset } from '../types';
import { datasetFromRows } from '../utils';

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
  if (!unique || nonEmpty / a.length < 0.6 || numericish / a.length > 0.2) return false;

  if (second) {
    const b = second.map((v) => (v === null || v === undefined ? '' : String(v).trim()));
    const bNumericish = b.filter((v) => /^-?\d+(\.\d+)?$/.test(v)).length;
    if (bNumericish / Math.max(1, b.length) > numericish / Math.max(1, a.length)) return true;
  }

  return true;
}

function getCellValue(cell: ExcelJS.Cell): unknown {
  if (!cell || cell.value === null || cell.value === undefined) return null;
  const value = cell.value;

  if (typeof value === 'object') {
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((rt: { text?: string }) => rt.text || '').join('');
    }
    if ('result' in value) return value.result;
    if ('text' in value) return value.text;
    if (value instanceof Date) return value.toISOString();
  }

  return value;
}

export async function parseExcelToDatasets(buffer: Buffer, options: ExcelParseOptions = {}): Promise<IngestDataset[]> {
  const maxRows = options.maxRows ?? 5000;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheetNames = options.sheetName && workbook.worksheets.some((ws) => ws.name === options.sheetName)
    ? [options.sheetName]
    : workbook.worksheets.map((ws) => ws.name);

  const datasets: IngestDataset[] = [];

  for (const sheetName of sheetNames) {
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) continue;

    const rows: unknown[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const rowValues: unknown[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        while (rowValues.length < colNumber - 1) rowValues.push(null);
        rowValues.push(getCellValue(cell));
      });
      rows.push(rowValues);
    });

    const nonEmptyRows = rows.filter((r) => r.some((v) => v !== null && v !== undefined && String(v).trim()));
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

    const hasHeader = (options.hasHeader ?? 'auto') === 'auto'
      ? looksLikeHeader(nonEmptyRows[0], nonEmptyRows[1])
      : options.hasHeader;

    const headers = (hasHeader ? nonEmptyRows[0] : nonEmptyRows[0].map((_, i) => `column_${i + 1}`)).map((h, i) => {
      const s = h === null || h === undefined ? '' : String(h).trim();
      return s || `column_${i + 1}`;
    });

    const dataRows = (hasHeader ? nonEmptyRows.slice(1) : nonEmptyRows).slice(0, maxRows);
    const rowsAsObjects = dataRows.map((r) => {
      const out: Record<string, unknown> = {};
      for (let i = 0; i < headers.length; i++) out[headers[i]] = r[i] ?? null;
      return out;
    });

    datasets.push(datasetFromRows({
      sourceType: 'excel',
      name: `${options.name ?? 'Excel'}:${sheetName}`,
      columnNames: headers,
      rows: rowsAsObjects,
      meta: { sheetName, hasHeader, truncated: nonEmptyRows.length - (hasHeader ? 1 : 0) > maxRows },
    }));
  }

  return datasets;
}
