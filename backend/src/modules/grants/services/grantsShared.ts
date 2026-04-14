import { randomInt } from 'crypto';
import type { Pool } from 'pg';
import type { GrantPagination } from '@app-types/grant';

export type GrantQueryClient = Pick<Pool, 'query'>;
export type GrantRow = Record<string, any>;

export interface GrantPaginateOptions<T> {
  client?: GrantQueryClient;
  baseFrom: string;
  selectColumns: string;
  conditions: string[];
  values: unknown[];
  orderBy: string;
  page: number;
  limit: number;
  mapper: (row: GrantRow) => T;
}

export const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

export const toIsoString = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
};

export const toNullableIsoString = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return toIsoString(value);
};

export const toJsonObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Fall through to the empty object.
    }
  }

  return {};
};

export const normalizeGrantNumber = (prefix: string): string => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const sequence = String(randomInt(0, 100000)).padStart(5, '0');
  return `${prefix}-${stamp}-${sequence}`;
};

export const buildPagination = (
  page: number,
  limit: number,
  total: number
): GrantPagination => ({
  page,
  limit,
  total,
  total_pages: limit > 0 ? Math.ceil(total / limit) : 0,
});

export const addSearchCondition = (
  conditions: string[],
  values: unknown[],
  columns: string[],
  search?: string
): void => {
  if (!search || search.trim().length === 0) {
    return;
  }

  values.push(`%${search.trim()}%`);
  const placeholder = `$${values.length}`;
  conditions.push(`(${columns.map((column) => `${column} ILIKE ${placeholder}`).join(' OR ')})`);
};
