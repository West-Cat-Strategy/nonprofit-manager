import { ingestPreviewFromBuffer } from '../../../ingest/preview';
import { schemaRegistry } from '../../../ingest/schemaRegistry';
import type {
  ColumnMatchSuggestion,
  IngestDataset,
} from '../../../ingest/types';

export type PeopleImportEntity = 'accounts' | 'contacts' | 'volunteers';
export type SupportedImportFileFormat = 'csv' | 'xlsx';

export interface ImportFieldOption {
  field: string;
  label: string;
}

export interface ImportFieldCandidate {
  field: string;
  score: number;
  reasons: string[];
}

export interface ParsedPeopleImportFile {
  format: SupportedImportFileFormat;
  dataset: IngestDataset;
  rows: Array<Record<string, string | null>>;
  detectedColumns: string[];
  fieldOptions: ImportFieldOption[];
  mapping: Record<string, string>;
  mappingCandidates: Record<string, ImportFieldCandidate[]>;
  warnings: string[];
}

const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
]);

const EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const PEOPLE_IMPORT_LIMITS = {
  maxRows: 10_000,
  maxColumns: 100,
  maxCells: 250_000,
  maxCellLength: 5_000,
  maxXlsxExpandedBytes: 25 * 1024 * 1024,
  maxXlsxWorksheets: 10,
} as const;

const createImportValidationError = (message: string): Error =>
  Object.assign(new Error(message), {
    statusCode: 400,
    code: 'validation_error',
  });

const loadExcelJs = async (): Promise<typeof import('exceljs')> => import('exceljs');

const normalizeImportFormat = (
  originalName: string | undefined,
  mimeType: string | undefined
): SupportedImportFileFormat => {
  const extension = originalName?.split('.').pop()?.toLowerCase();
  if (extension === 'csv') {
    return 'csv';
  }
  if (extension === 'xlsx' || extension === 'xslx') {
    return 'xlsx';
  }

  if (mimeType && CSV_MIME_TYPES.has(mimeType)) {
    return 'csv';
  }
  if (mimeType && EXCEL_MIME_TYPES.has(mimeType)) {
    return 'xlsx';
  }

  throw new Error('Only CSV and XLSX files are supported for people imports');
};

const assertColumnBudget = (columnCount: number): void => {
  if (columnCount > PEOPLE_IMPORT_LIMITS.maxColumns) {
    throw createImportValidationError(
      `People import files cannot contain more than ${PEOPLE_IMPORT_LIMITS.maxColumns} columns`
    );
  }
};

const assertCellLengthBudget = (value: string): void => {
  if (value.length > PEOPLE_IMPORT_LIMITS.maxCellLength) {
    throw createImportValidationError(
      `People import cell values cannot exceed ${PEOPLE_IMPORT_LIMITS.maxCellLength} characters`
    );
  }
};

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && character === delimiter) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
};

const detectDelimiter = (csvText: string): string => {
  const firstLine = csvText.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const candidates = [',', '\t', ';', '|'];

  return candidates.reduce(
    (best, candidate) => {
      const count = (firstLine.match(new RegExp(`\\${candidate}`, 'g')) ?? []).length;
      return count > best.count ? { delimiter: candidate, count } : best;
    },
    { delimiter: ',', count: -1 }
  ).delimiter;
};

const splitCsvRecords = (text: string, maxRecords?: number): string[] => {
  const records: string[] = [];
  let current = '';
  let inQuotes = false;

  const pushRecord = () => {
    records.push(current);
    if (maxRecords !== undefined && records.length > maxRecords) {
      throw createImportValidationError(
        `People import files cannot contain more than ${PEOPLE_IMPORT_LIMITS.maxRows} data rows`
      );
    }
    current = '';
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      current += character;

      if (inQuotes && next === '"') {
        current += next;
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === '\n' && !inQuotes) {
      pushRecord();
      continue;
    }

    current += character;
  }

  if (current.length > 0) {
    pushRecord();
  }

  return records;
};

const validateCsvImportBudgets = (buffer: Buffer): void => {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const delimiter = detectDelimiter(text);
  const rawRecords = splitCsvRecords(text, PEOPLE_IMPORT_LIMITS.maxRows + 1)
    .filter((record) => record.length > 0);
  let totalCells = 0;

  rawRecords.forEach((record) => {
    const values = parseCsvLine(record, delimiter);
    assertColumnBudget(values.length);
    totalCells += values.length;
    if (totalCells > PEOPLE_IMPORT_LIMITS.maxCells) {
      throw createImportValidationError(
        `People import files cannot contain more than ${PEOPLE_IMPORT_LIMITS.maxCells} cells`
      );
    }
    values.forEach(assertCellLengthBudget);
  });
};

const readZipCentralDirectoryExpandedSize = (buffer: Buffer): number | null => {
  const minEocdSize = 22;
  const maxCommentLength = 0xffff;
  const searchStart = Math.max(0, buffer.length - minEocdSize - maxCommentLength);
  let eocdOffset = -1;

  for (let offset = buffer.length - minEocdSize; offset >= searchStart; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset === -1) {
    return null;
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
  if (centralDirectoryEnd > buffer.length) {
    return null;
  }

  let offset = centralDirectoryOffset;
  let expandedSize = 0;
  let entriesSeen = 0;

  while (offset < centralDirectoryEnd && entriesSeen < entryCount) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      return null;
    }

    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    if (uncompressedSize === 0xffffffff) {
      throw createImportValidationError('ZIP64 XLSX imports are not supported by the people import safety budget');
    }

    expandedSize += uncompressedSize;
    if (expandedSize > PEOPLE_IMPORT_LIMITS.maxXlsxExpandedBytes) {
      return expandedSize;
    }

    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    offset += 46 + fileNameLength + extraLength + commentLength;
    entriesSeen += 1;
  }

  return expandedSize;
};

const validateXlsxArchiveBudget = (buffer: Buffer): void => {
  const expandedSize = readZipCentralDirectoryExpandedSize(buffer);
  if (expandedSize === null) {
    return;
  }

  if (expandedSize > PEOPLE_IMPORT_LIMITS.maxXlsxExpandedBytes) {
    throw createImportValidationError(
      `Expanded XLSX imports cannot exceed ${PEOPLE_IMPORT_LIMITS.maxXlsxExpandedBytes} bytes`
    );
  }
};

const validateImportBudgets = (buffer: Buffer, format: SupportedImportFileFormat): void => {
  if (format === 'csv') {
    validateCsvImportBudgets(buffer);
    return;
  }

  validateXlsxArchiveBudget(buffer);
};

const parseCsvRows = (
  buffer: Buffer,
  headers: string[],
  hasHeader: boolean
): Array<Record<string, string | null>> => {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const delimiter = detectDelimiter(text);
  const rawRecords = splitCsvRecords(text).filter((record) => record.length > 0);
  const dataLines = hasHeader ? rawRecords.slice(1) : rawRecords;

  if (dataLines.length > PEOPLE_IMPORT_LIMITS.maxRows) {
    throw createImportValidationError(
      `People import files cannot contain more than ${PEOPLE_IMPORT_LIMITS.maxRows} data rows`
    );
  }

  return dataLines
    .map((line) => parseCsvLine(line, delimiter))
    .map((values) => {
      assertColumnBudget(Math.max(headers.length, values.length));
      const row: Record<string, string | null> = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim() ?? '';
        assertCellLengthBudget(value);
        row[header] = value.length > 0 ? value : null;
      });
      return row;
    })
    .filter((row) => Object.values(row).some((value) => value !== null));
};

const parseExcelRows = async (
  buffer: Buffer,
  headers: string[],
  hasHeader: boolean,
  sheetName?: string
): Promise<Array<Record<string, string | null>>> => {
  const ExcelJS = await loadExcelJs();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  if (workbook.worksheets.length > PEOPLE_IMPORT_LIMITS.maxXlsxWorksheets) {
    throw createImportValidationError(
      `XLSX people imports cannot contain more than ${PEOPLE_IMPORT_LIMITS.maxXlsxWorksheets} worksheets`
    );
  }

  const worksheet =
    (sheetName ? workbook.getWorksheet(sheetName) : undefined) ?? workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  assertColumnBudget(Math.max(headers.length, worksheet.actualColumnCount));

  const rows: Array<Record<string, string | null>> = [];
  let sourceRowNumber = 0;
  let dataRowCount = 0;
  let totalCells = 0;

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    sourceRowNumber += 1;
    if (hasHeader && sourceRowNumber === 1) {
      return;
    }

    dataRowCount += 1;
    if (dataRowCount > PEOPLE_IMPORT_LIMITS.maxRows) {
      throw createImportValidationError(
        `People import files cannot contain more than ${PEOPLE_IMPORT_LIMITS.maxRows} data rows`
      );
    }

    totalCells += headers.length;
    if (totalCells > PEOPLE_IMPORT_LIMITS.maxCells) {
      throw createImportValidationError(
        `People import files cannot contain more than ${PEOPLE_IMPORT_LIMITS.maxCells} cells`
      );
    }

    const output: Record<string, string | null> = {};
    headers.forEach((header, index) => {
      const cell = row.getCell(index + 1);
      const rawValue = cell.value;
      if (rawValue === null || rawValue === undefined) {
        output[header] = null;
        return;
      }

      if (typeof rawValue === 'object' && 'result' in rawValue) {
        const result = rawValue.result;
        const value = result === null || result === undefined ? '' : String(result).trim();
        assertCellLengthBudget(value);
        output[header] = value || null;
        return;
      }

      const value = String(rawValue).trim();
      assertCellLengthBudget(value);
      output[header] = value || null;
    });

    if (Object.values(output).some((value) => value !== null)) {
      rows.push(output);
    }
  });

  return rows;
};

const parseExplicitMapping = (
  mapping: Record<string, unknown> | undefined,
  fieldOptions: Set<string>
): Record<string, string> => {
  if (!mapping) {
    return {};
  }

  return Object.entries(mapping).reduce<Record<string, string>>((accumulator, [sourceColumn, value]) => {
    if (typeof value !== 'string') {
      return accumulator;
    }

    const trimmed = value.trim();
    if (!trimmed || !fieldOptions.has(trimmed)) {
      return accumulator;
    }

    accumulator[sourceColumn] = trimmed;
    return accumulator;
  }, {});
};

const buildCandidatesForEntity = async (
  buffer: Buffer,
  originalName: string | undefined,
  mimeType: string | undefined,
  entity: PeopleImportEntity
): Promise<{
  dataset: IngestDataset;
  format: SupportedImportFileFormat;
  autoMapping: Record<string, string>;
  mappingCandidates: Record<string, ImportFieldCandidate[]>;
  warnings: string[];
}> => {
  const format = normalizeImportFormat(originalName, mimeType);
  validateImportBudgets(buffer, format);

  const preview = await ingestPreviewFromBuffer({
    buffer,
    filename: originalName,
    mimeType,
    importLimits: {
      maxRows: PEOPLE_IMPORT_LIMITS.maxRows + 1,
      maxColumns: PEOPLE_IMPORT_LIMITS.maxColumns,
      maxCells: PEOPLE_IMPORT_LIMITS.maxCells,
      maxCellLength: PEOPLE_IMPORT_LIMITS.maxCellLength,
      maxWorksheets: PEOPLE_IMPORT_LIMITS.maxXlsxWorksheets,
    },
  });

  const dataset = preview.datasets[0];
  if (!dataset) {
    throw new Error('No importable rows were detected in the uploaded file');
  }

  const warnings = [...dataset.warnings];
  if (preview.datasets.length > 1) {
    warnings.push('Multiple worksheets detected. Only the first worksheet was used.');
  }

  const suggestion = preview.schemaSuggestions[0]?.tables.find((table) => table.table === entity);
  const autoMapping = Object.entries(
    (suggestion?.suggestedMapping ?? {}) as Record<string, string>
  ).reduce<Record<string, string>>((accumulator, [sourceColumn, target]) => {
      const [, field] = target.split('.');
      if (field) {
        accumulator[sourceColumn] = field;
      }
      return accumulator;
    }, {});

  const mappingCandidates = (suggestion?.columnSuggestions ?? []).reduce<Record<string, ImportFieldCandidate[]>>(
    (accumulator, columnSuggestion: ColumnMatchSuggestion) => {
      accumulator[columnSuggestion.sourceColumn] = columnSuggestion.candidates
        .filter((candidate) => candidate.table === entity)
        .map((candidate) => ({
          field: candidate.field,
          score: candidate.score,
          reasons: candidate.reasons,
        }));
      return accumulator;
    },
    {}
  );

  return {
    dataset,
    format,
    autoMapping,
    mappingCandidates,
    warnings,
  };
};

export const parseMultipartJsonField = <T>(value: unknown): T | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    return JSON.parse(value) as T;
  }

  return value as T;
};

export const parsePeopleImportFile = async (
  file: Express.Multer.File,
  entity: PeopleImportEntity,
  explicitMapping?: Record<string, unknown>
): Promise<ParsedPeopleImportFile> => {
  const entitySchema = schemaRegistry.find((table) => table.table === entity);
  if (!entitySchema) {
    throw new Error(`Unsupported import entity: ${entity}`);
  }

  const { dataset, format, autoMapping, mappingCandidates, warnings } = await buildCandidatesForEntity(
    file.buffer,
    file.originalname,
    file.mimetype,
    entity
  );

  const fieldOptions = entitySchema.fields.map((field) => ({
    field: field.field,
    label: field.field.replace(/_/g, ' '),
  }));
  const resolvedExplicitMapping = parseExplicitMapping(
    explicitMapping,
    new Set(fieldOptions.map((option) => option.field))
  );

  const resolvedMapping = { ...autoMapping, ...resolvedExplicitMapping };
  const hasHeader = Boolean(dataset.meta?.hasHeader);
  const rows =
    format === 'csv'
      ? parseCsvRows(file.buffer, dataset.columnNames, hasHeader)
      : await parseExcelRows(
          file.buffer,
          dataset.columnNames,
          hasHeader,
          typeof dataset.meta?.sheetName === 'string' ? dataset.meta.sheetName : undefined
        );

  return {
    format,
    dataset,
    rows,
    detectedColumns: dataset.columnNames,
    fieldOptions,
    mapping: resolvedMapping,
    mappingCandidates,
    warnings,
  };
};
