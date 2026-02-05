import type { IngestPreviewResult, IngestSourceType } from './types';
import { schemaRegistry } from './schemaRegistry';
import { parseCsvToDataset } from './parsers/csv';
import { parseExcelToDatasets } from './parsers/excel';
import { parseSqlToDatasets } from './parsers/sql';
import { suggestSchemaMatches } from './matcher';

function inferFormatFromFilename(filename: string | undefined): IngestSourceType | undefined {
  if (!filename) return undefined;
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return 'excel';
  if (lower.endsWith('.sql')) return 'sql';
  return undefined;
}

function inferFormatFromMime(mime: string | undefined): IngestSourceType | undefined {
  if (!mime) return undefined;
  const m = mime.toLowerCase();
  if (m.includes('spreadsheet') || m.includes('excel')) return 'excel';
  if (m.includes('csv')) return 'csv';
  if (m.includes('sql')) return 'sql';
  return undefined;
}

function inferFormatFromContent(text: string): IngestSourceType | undefined {
  const sample = text.slice(0, 4096).toLowerCase();
  if (/\bcreate\s+table\b/.test(sample) || /\binsert\s+into\b/.test(sample) || /\bselect\b/.test(sample)) return 'sql';
  // very light CSV sniff: has a delimiter-like first line with multiple separators
  const firstLine = sample.split(/\r?\n/)[0] ?? '';
  const comma = (firstLine.match(/,/g) ?? []).length;
  const tab = (firstLine.match(/\t/g) ?? []).length;
  const semi = (firstLine.match(/;/g) ?? []).length;
  const pipe = (firstLine.match(/\|/g) ?? []).length;
  const best = Math.max(comma, tab, semi, pipe);
  if (best >= 2) return 'csv';
  return undefined;
}

export function ingestPreviewFromText(params: {
  text: string;
  format: IngestSourceType;
  name?: string;
}): IngestPreviewResult {
  const name = params.name ?? params.format.toUpperCase();
  const datasets =
    params.format === 'csv'
      ? [parseCsvToDataset(params.text, { name })]
      : params.format === 'sql'
        ? parseSqlToDatasets(params.text, { name })
        : [];

  const schemaSuggestions = datasets.map((d) => suggestSchemaMatches(d, schemaRegistry));
  return { datasets, schemaSuggestions };
}

export function ingestPreviewFromTextAuto(params: { text: string; name?: string }): IngestPreviewResult {
  const format = inferFormatFromContent(params.text) ?? 'csv';
  return ingestPreviewFromText({ format, text: params.text, name: params.name ?? format.toUpperCase() });
}

export async function ingestPreviewFromBuffer(params: {
  buffer: Buffer;
  filename?: string;
  mimeType?: string;
  format?: IngestSourceType;
  sheetName?: string;
  name?: string;
}): Promise<IngestPreviewResult> {
  const filenameHint = inferFormatFromFilename(params.filename);
  const mimeHint = inferFormatFromMime(params.mimeType);

  let format = params.format ?? filenameHint ?? mimeHint;
  if (!format || format === 'csv' || format === 'sql') {
    // For text-like inputs, sniff content when ambiguous.
    const asText = params.buffer.toString('utf8');
    format = format ?? inferFormatFromContent(asText) ?? 'csv';
  }

  const name = params.name ?? params.filename ?? format.toUpperCase();

  const datasets =
    format === 'excel'
      ? await parseExcelToDatasets(params.buffer, { name, sheetName: params.sheetName })
      : format === 'sql'
        ? parseSqlToDatasets(params.buffer.toString('utf8'), { name })
        : [parseCsvToDataset(params.buffer.toString('utf8'), { name })];

  const schemaSuggestions = datasets.map((d) => suggestSchemaMatches(d, schemaRegistry));
  return { datasets, schemaSuggestions };
}
