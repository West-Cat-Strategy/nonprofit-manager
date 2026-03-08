import ExcelJS from 'exceljs';
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

const parseCsvRows = (
  buffer: Buffer,
  headers: string[],
  hasHeader: boolean
): Array<Record<string, string | null>> => {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const delimiter = detectDelimiter(text);
  const rawLines = text.split('\n').filter((line) => line.length > 0);
  const dataLines = hasHeader ? rawLines.slice(1) : rawLines;

  return dataLines
    .map((line) => parseCsvLine(line, delimiter))
    .map((values) => {
      const row: Record<string, string | null> = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim() ?? '';
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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const worksheet =
    (sheetName ? workbook.getWorksheet(sheetName) : undefined) ?? workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const rows: Array<Record<string, string | null>> = [];
  let sourceRowNumber = 0;

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    sourceRowNumber += 1;
    if (hasHeader && sourceRowNumber === 1) {
      return;
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
        output[header] = result === null || result === undefined ? null : String(result).trim() || null;
        return;
      }

      output[header] = String(rawValue).trim() || null;
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
  const preview = await ingestPreviewFromBuffer({
    buffer,
    filename: originalName,
    mimeType,
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
    format: normalizeImportFormat(originalName, mimeType),
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
