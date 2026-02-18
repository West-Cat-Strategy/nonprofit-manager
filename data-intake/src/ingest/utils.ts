import type { IngestDataset } from './types';

export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function uniq<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

export function take<T>(values: T[], limit: number): T[] {
  if (values.length <= limit) return values;
  return values.slice(0, limit);
}

export function safeRatio(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return numerator / denominator;
}

export function splitSqlListTopLevel(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
      continue;
    }
    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
      continue;
    }
    if (!inSingle && !inDouble) {
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function isNullish(v: string | null | undefined): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim().toLowerCase();
  return s === '' || s === 'null' || s === 'nil' || s === 'n/a' || s === 'na';
}

function toValue(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  const value = String(input).trim();
  return value === '' ? null : value;
}

export function datasetFromRows(params: {
  sourceType: IngestDataset['sourceType'];
  name: string;
  columnNames: string[];
  rows: Array<Record<string, unknown>>;
  warnings?: string[];
  meta?: Record<string, unknown>;
  rowLimit?: number;
}): IngestDataset {
  const { inferColumn } = require('./infer') as typeof import('./infer');
  const rowLimit = params.rowLimit ?? 5000;
  const warnings = [...(params.warnings ?? [])];

  const normalizedHeaders = params.columnNames.map((h) => normalizeName(h) || h);
  if (uniq(normalizedHeaders).length !== normalizedHeaders.length) {
    warnings.push('Some column names normalize to the same value; collisions may occur.');
  }

  const normalizedRows = params.rows.slice(0, rowLimit).map((row) => {
    const out: Record<string, string | null> = {};
    for (const col of params.columnNames) {
      out[col] = toValue((row as Record<string, unknown>)[col]);
    }
    return out;
  });

  const columns = params.columnNames.map((name, idx) => {
    const values = normalizedRows.map((r) => r[name] ?? null);
    const nonEmptyCount = values.filter((v) => v !== null).length;
    const uniqueCount = new Set(values.filter((v) => v !== null)).size;
    const samples = take(values.filter((v): v is string => v !== null), 25);

    const lengths = samples.map((s) => s.length);
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
      minLength: lengths.length ? Math.min(...lengths) : 0,
      maxLength: lengths.length ? Math.max(...lengths) : 0,
      avgLength: lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0,
      samples,
    };
  });

  return {
    sourceType: params.sourceType,
    name: params.name,
    columnNames: params.columnNames,
    rowCount: normalizedRows.length,
    sampleRows: take(normalizedRows, 25),
    columns,
    warnings,
    meta: params.meta,
  };
}
