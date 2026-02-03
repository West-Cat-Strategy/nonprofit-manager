import type { IngestDataset } from '../types';
import { inferColumn } from '../infer';
import { normalizeName, safeRatio, take, uniq } from '../utils';

export interface CsvParseOptions {
  name?: string;
  maxRows?: number;
  hasHeader?: boolean | 'auto';
  delimiter?: string | 'auto';
}

type CsvRecord = string[];

function detectDelimiter(text: string): string {
  const candidates = [',', '\t', ';', '|'];
  const counts = new Map<string, number>();
  for (const c of candidates) counts.set(c, 0);

  let inQuotes = false;
  const sample = text.slice(0, 16 * 1024);
  for (let i = 0; i < sample.length; i++) {
    const ch = sample[i];
    if (ch === '"') {
      if (inQuotes && sample[i + 1] === '"') {
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && counts.has(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    if (!inQuotes && ch === '\n') break; // use first record as primary signal
  }

  let best = ',';
  let bestCount = -1;
  for (const [delim, count] of counts.entries()) {
    if (count > bestCount) {
      best = delim;
      bestCount = count;
    }
  }
  return best;
}

function parseCsvRecords(input: string, delimiter: string, maxRecords: number): { records: CsvRecord[]; truncated: boolean } {
  const records: CsvRecord[] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;

  // Normalize newlines and strip BOM
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const pushField = () => {
    record.push(field);
    field = '';
  };
  const pushRecord = () => {
    // ignore completely empty record
    if (record.length === 1 && record[0].trim() === '') {
      record = [];
      return;
    }
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === delimiter) {
      pushField();
      continue;
    }

    if (!inQuotes && ch === '\n') {
      pushField();
      pushRecord();
      if (records.length >= maxRecords) {
        return { records, truncated: true };
      }
      continue;
    }

    field += ch;
  }

  // flush last record if any content
  if (field.length > 0 || record.length > 0) {
    pushField();
    pushRecord();
  }

  return { records, truncated: false };
}

function looksLikeHeader(first: string[], second?: string[]): boolean {
  const a = first.map((v) => String(v ?? '').trim());
  if (a.length === 0) return false;

  // Header rows tend to be unique-ish, non-numeric, and shorter.
  const unique = new Set(a.map((v) => v.toLowerCase())).size === a.length;
  const nonEmpty = a.filter(Boolean).length;
  const numericish = a.filter((v) => /^-?\d+(\.\d+)?$/.test(v)).length;
  const tooLong = a.filter((v) => v.length > 80).length;

  if (!unique) return false;
  if (nonEmpty / a.length < 0.6) return false;
  if (numericish / a.length > 0.2) return false;
  if (tooLong > 0) return false;

  // If we have a second row, prefer header when the first row is mostly strings and the second row has mixed types.
  if (second && second.length > 0) {
    const b = second.map((v) => String(v ?? '').trim());
    const bNumericish = b.filter((v) => /^-?\d+(\.\d+)?$/.test(v)).length;
    if (bNumericish / Math.max(1, b.length) > numericish / Math.max(1, a.length)) return true;
  }

  return true;
}

function toRowObject(headers: string[], values: string[]): Record<string, string | null> {
  const row: Record<string, string | null> = {};
  for (let i = 0; i < headers.length; i++) {
    const v = values[i] ?? '';
    const s = String(v).trim();
    row[headers[i]] = s === '' ? null : s;
  }
  return row;
}

export function parseCsvToDataset(input: string, options: CsvParseOptions = {}): IngestDataset {
  const maxRows = options.maxRows ?? 2000;
  const warnings: string[] = [];

  const delimiter =
    options.delimiter && options.delimiter !== 'auto' ? options.delimiter : detectDelimiter(input);

  const { records, truncated } = parseCsvRecords(input, delimiter, maxRows + 1);
  const rows = records.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));

  if (rows.length === 0) {
    return {
      sourceType: 'csv',
      name: options.name ?? 'CSV',
      columnNames: [],
      rowCount: 0,
      sampleRows: [],
      columns: [],
      warnings: ['No rows detected.'],
      meta: { delimiter: delimiter === '\t' ? '\\t' : delimiter, hasHeader: false, truncated },
    };
  }

  const headerMode = options.hasHeader ?? 'auto';
  const firstRow = rows[0];
  const secondRow = rows[1];
  const hasHeader = headerMode === 'auto' ? looksLikeHeader(firstRow, secondRow) : headerMode;

  const headers = hasHeader
    ? firstRow.map((h, i) => {
        const s = String(h ?? '').trim();
        return s ? s : `column_${i + 1}`;
      })
    : firstRow.map((_, i) => `column_${i + 1}`);

  const dataRows = (hasHeader ? rows.slice(1) : rows).slice(0, maxRows);
  const rowObjects = dataRows.map((r) => toRowObject(headers, r));
  const sampleRows = take(rowObjects, 25);

  const normalizedHeaders = headers.map((h) => normalizeName(h) || h);
  if (uniq(normalizedHeaders).length !== normalizedHeaders.length) {
    warnings.push('Some column names normalize to the same value; collisions may occur.');
  }

  const columns = headers.map((name, idx) => {
    const values = rowObjects.map((r) => r[name] ?? null);
    const nonEmpty = values.filter((v) => v !== null).length;
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
      nonEmptyCount: nonEmpty,
      uniqueCount,
      nullishCount: values.length - nonEmpty,
      nonEmptyRatio: safeRatio(nonEmpty, values.length),
      uniqueRatio: safeRatio(uniqueCount, Math.max(1, nonEmpty)),
      minLength,
      maxLength,
      avgLength,
      samples,
    };
  });

  return {
    sourceType: 'csv',
    name: options.name ?? 'CSV',
    columnNames: headers,
    rowCount: rowObjects.length,
    sampleRows,
    columns,
    warnings,
    meta: {
      delimiter: delimiter === '\t' ? '\\t' : delimiter,
      hasHeader,
      truncated,
    },
  };
}

