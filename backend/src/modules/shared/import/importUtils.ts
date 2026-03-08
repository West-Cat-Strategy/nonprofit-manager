import type { IngestDataset } from '../../../ingest/types';

export interface ImportRowError {
  row_number: number;
  messages: string[];
}

export const getImportRowNumber = (dataset: IngestDataset, rowIndex: number): number => {
  const headerOffset = dataset.meta?.hasHeader ? 2 : 1;
  return rowIndex + headerOffset;
};

export const toTrimmedString = (value: string | null | undefined): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const toNullableString = (value: string | null | undefined): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = toTrimmedString(value);
  return trimmed ?? null;
};

export const parseBooleanLike = (value: string | null | undefined): boolean | undefined => {
  const normalized = toTrimmedString(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return undefined;
};

export const parseNumberLike = (value: string | null | undefined): number | undefined => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return undefined;
  }

  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : undefined;
};

export const parseDelimitedList = (value: string | null | undefined): string[] | undefined => {
  const normalized = toTrimmedString(value);
  if (!normalized) {
    return undefined;
  }

  const values = normalized
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return values.length > 0 ? Array.from(new Set(values)) : undefined;
};

export const getMappedValue = (
  row: Record<string, string | null>,
  mapping: Record<string, string>,
  field: string
): string | null | undefined => {
  const sourceColumn = Object.entries(mapping).find(([, mappedField]) => mappedField === field)?.[0];
  if (!sourceColumn) {
    return undefined;
  }

  return row[sourceColumn];
};

export const hasMappedField = (mapping: Record<string, string>, field: string): boolean => {
  return Object.values(mapping).includes(field);
};

export const hasAnyMappedValue = (
  row: Record<string, string | null>,
  mapping: Record<string, string>
): boolean => {
  return Object.keys(mapping).some((sourceColumn) => {
    const value = row[sourceColumn];
    return value !== null && value !== undefined && value.trim().length > 0;
  });
};

export const findDuplicateMappedFields = (mapping: Record<string, string>): string[] => {
  const counts = new Map<string, number>();
  Object.values(mapping).forEach((field) => {
    counts.set(field, (counts.get(field) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([field]) => field);
};
