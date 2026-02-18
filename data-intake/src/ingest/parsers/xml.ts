import { XMLParser } from 'fast-xml-parser';
import type { IngestDataset } from '../types';
import { datasetFromRows, uniq } from '../utils';

export interface XmlParseOptions {
  name?: string;
  maxRows?: number;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function flattenShallow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    if (Array.isArray(value)) continue;

    if (isPlainObject(value)) {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (!isPlainObject(subValue) && !Array.isArray(subValue)) {
          out[`${key}_${subKey}`] = subValue;
        }
      }
      continue;
    }

    out[key] = value;
  }

  return out;
}

function findRepeatingArray(node: unknown, depth = 0): { path: string; rows: unknown[] } | null {
  if (!isPlainObject(node) || depth > 4) return null;

  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value) && value.length > 0 && value.every((v) => isPlainObject(v))) {
      return { path: key, rows: value };
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (isPlainObject(value)) {
      const nested = findRepeatingArray(value, depth + 1);
      if (nested) return { path: `${key}.${nested.path}`, rows: nested.rows };
    }
  }

  return null;
}

export function parseXmlToDatasets(input: string, options: XmlParseOptions = {}): IngestDataset[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: 'attr_',
    trimValues: true,
  });

  const parsed = parser.parse(input) as unknown;
  const name = options.name ?? 'XML';
  const maxRows = options.maxRows ?? 5000;

  if (!isPlainObject(parsed)) {
    return [{
      sourceType: 'xml',
      name,
      columnNames: [],
      rowCount: 0,
      sampleRows: [],
      columns: [],
      warnings: ['XML payload has no object structure.'],
    }];
  }

  const found = findRepeatingArray(parsed);
  if (!found) {
    const asRow = flattenShallow(parsed);
    return [datasetFromRows({ sourceType: 'xml', name, columnNames: Object.keys(asRow), rows: [asRow] })];
  }

  const rows = found.rows.slice(0, maxRows).map((row) => flattenShallow(row as Record<string, unknown>));
  const columns = uniq(rows.flatMap((row) => Object.keys(row)));
  const dataset = datasetFromRows({
    sourceType: 'xml',
    name: `${name}:${found.path}`,
    columnNames: columns,
    rows,
    meta: { detectedPath: found.path },
  });

  return [dataset];
}
