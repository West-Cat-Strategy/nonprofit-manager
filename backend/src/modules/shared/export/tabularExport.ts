import ExcelJS from 'exceljs';
import type { Response } from 'express';

export type TabularExportFormat = 'csv' | 'xlsx';
export type LegacyTabularExportFormat = TabularExportFormat | 'excel' | 'xslx';

export interface TabularExportColumn<Row> {
  key: string;
  header: string;
  width?: number;
  map?: (row: Row) => unknown;
}

export interface TabularExportSheet<Row> {
  name: string;
  columns: readonly TabularExportColumn<Row>[];
  rows: readonly Row[];
}

export interface GeneratedTabularFile {
  buffer: Buffer;
  contentType: string;
  extension: TabularExportFormat;
  filename: string;
}

export interface BuildTabularExportOptions<Row> {
  format: LegacyTabularExportFormat;
  filename?: string;
  fallbackBaseName: string;
  sheets: readonly TabularExportSheet<Row>[];
}

const DEFAULT_FILENAME_LIMIT = 80;
const DANGEROUS_SPREADSHEET_PREFIX = /^\s*[=+\-@]/;
const EXCEL_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CSV_CONTENT_TYPE = 'text/csv; charset=utf-8';

const isDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

const normalizeSheetName = (name: string, fallback: string): string => {
  const trimmed = name.trim().replace(/[:\\/?*\[\]]/g, ' ');
  const collapsed = trimmed.replace(/\s+/g, ' ').trim();
  const safe = collapsed.length > 0 ? collapsed : fallback;
  return safe.slice(0, 31);
};

const normalizeScalar = (value: unknown): string | number | boolean | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeScalar(item))
      .filter((item): item is string | number | boolean => item !== null)
      .join('; ');
  }

  if (isDate(value)) {
    return value.toISOString();
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return DANGEROUS_SPREADSHEET_PREFIX.test(value) ? `'${value}` : value;
  }

  return DANGEROUS_SPREADSHEET_PREFIX.test(String(value)) ? `'${String(value)}` : String(value);
};

const toCellValue = <Row>(
  row: Row,
  column: TabularExportColumn<Row>
): string | number | boolean | null => {
  const rawValue = column.map ? column.map(row) : (row as Record<string, unknown>)[column.key];
  return normalizeScalar(rawValue);
};

const quoteCsvCell = (value: string | number | boolean | null): string => {
  if (value === null) {
    return '';
  }

  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
};

export const sanitizeExportFilename = (
  input: string | undefined,
  fallbackBaseName: string,
  maxLength = DEFAULT_FILENAME_LIMIT
): string => {
  const rawBaseName = (input ?? fallbackBaseName).split('/').pop() ?? fallbackBaseName;
  const withoutExtension = rawBaseName.replace(/\.(csv|xlsx|excel|xslx)$/i, '');
  const sanitized = withoutExtension
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, maxLength);

  return sanitized.length > 0 ? sanitized : fallbackBaseName;
};

export const normalizeTabularExportFormat = (
  format: LegacyTabularExportFormat | string | undefined
): TabularExportFormat => {
  if (!format) {
    return 'csv';
  }

  const normalized = format.toLowerCase();
  if (normalized === 'csv') {
    return 'csv';
  }
  if (normalized === 'xlsx' || normalized === 'excel' || normalized === 'xslx') {
    return 'xlsx';
  }

  throw new Error(`Unsupported export format: ${format}`);
};

export const buildTabularExport = async <Row>(
  options: BuildTabularExportOptions<Row>
): Promise<GeneratedTabularFile> => {
  const format = normalizeTabularExportFormat(options.format);
  const filenameBase = sanitizeExportFilename(options.filename, options.fallbackBaseName);
  const sheets = options.sheets.length > 0 ? options.sheets : [{ name: 'Export', columns: [], rows: [] }];

  if (format === 'csv') {
    const sheet = sheets[0];
    const headerRow = sheet.columns.map((column) => quoteCsvCell(column.header)).join(',');
    const dataRows = sheet.rows.map((row) =>
      sheet.columns
        .map((column) => quoteCsvCell(toCellValue(row, column)))
        .join(',')
    );
    const csv = [headerRow, ...dataRows].join('\n');

    return {
      buffer: Buffer.from(csv, 'utf8'),
      contentType: CSV_CONTENT_TYPE,
      extension: 'csv',
      filename: `${filenameBase}.csv`,
    };
  }

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  sheets.forEach((sheet, index) => {
    const worksheet = workbook.addWorksheet(
      normalizeSheetName(sheet.name, `Sheet ${index + 1}`)
    );
    worksheet.columns = sheet.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? Math.min(50, Math.max(14, column.header.length + 4)),
    }));

    sheet.rows.forEach((row) => {
      const outputRow: Record<string, string | number | boolean | null> = {};
      sheet.columns.forEach((column) => {
        outputRow[column.key] = toCellValue(row, column);
      });
      worksheet.addRow(outputRow);
    });

    const header = worksheet.getRow(1);
    header.font = { bold: true };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEDEDED' },
    };
  });

  const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  return {
    buffer,
    contentType: EXCEL_CONTENT_TYPE,
    extension: 'xlsx',
    filename: `${filenameBase}.xlsx`,
  };
};

export const setTabularDownloadHeaders = (
  res: Response,
  file: GeneratedTabularFile
): void => {
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.setHeader('Content-Length', file.buffer.length.toString());
};
