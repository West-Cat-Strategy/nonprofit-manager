import type { IngestDataset } from '../types';
import { datasetFromRows, uniq } from '../utils';

export interface JsonParseOptions {
  name?: string;
  maxRows?: number;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function flattenShallow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (isPlainObject(value)) {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (!isPlainObject(subValue) && !Array.isArray(subValue)) {
          out[`${key}_${subKey}`] = subValue;
        }
      }
      continue;
    }

    if (!Array.isArray(value)) out[key] = value;
  }

  return out;
}

function parseArrayDataset(rows: unknown[], name: string, maxRows: number): IngestDataset {
  const objectRows = rows
    .filter((row): row is Record<string, unknown> => isPlainObject(row))
    .slice(0, maxRows)
    .map(flattenShallow);

  const columns = uniq(objectRows.flatMap((row) => Object.keys(row)));
  return datasetFromRows({ sourceType: 'json', name, columnNames: columns, rows: objectRows });
}

export function parseJsonToDatasets(input: string, options: JsonParseOptions = {}): IngestDataset[] {
  const maxRows = options.maxRows ?? 5000;
  const name = options.name ?? 'JSON';
  const parsed = JSON.parse(input) as unknown;

  if (Array.isArray(parsed)) {
    return [parseArrayDataset(parsed, name, maxRows)];
  }

  if (isPlainObject(parsed)) {
    const arrayEntries = Object.entries(parsed).filter(([, value]) => Array.isArray(value));
    if (arrayEntries.length > 0) {
      return arrayEntries.map(([key, value]) => parseArrayDataset(value as unknown[], `${name}:${key}`, maxRows));
    }

    return [parseArrayDataset([parsed], name, maxRows)];
  }

  return [
    {
      sourceType: 'json',
      name,
      columnNames: [],
      rowCount: 0,
      sampleRows: [],
      columns: [],
      warnings: ['JSON payload does not contain object rows.'],
    },
  ];
}
