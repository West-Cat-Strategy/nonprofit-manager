/**
 * Query Parameter Helpers
 * Utilities for parsing and validating query parameters from HTTP requests
 */

/**
 * Parse a query parameter as a string
 */
export const getString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/**
 * Parse a query parameter as a number
 */
export const getNumber = (value: unknown): number | undefined => {
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

/**
 * Parse a query parameter as an integer
 */
export const getInteger = (value: unknown): number | undefined => {
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

/**
 * Parse a query parameter as a boolean
 * Accepts: 'true', 'false', '1', '0'
 */
export const getBoolean = (value: unknown): boolean | undefined => {
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
};

/**
 * Parse a query parameter as an array (comma-separated values)
 */
export const getArray = (value: unknown): string[] | undefined => {
  if (typeof value === 'string') {
    return value.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
  }
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === 'string');
  }
  return undefined;
};

/**
 * Parse a query parameter as a date string (ISO format)
 */
export const getDateString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : value;
  }
  return undefined;
};

/**
 * Standard pagination parameters extraction
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ExtractPaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  allowedSortFields?: string[];
}

/**
 * Extract standard pagination parameters from query object
 */
export const extractPagination = (
  query: Record<string, unknown>,
  options: ExtractPaginationOptions = {}
): PaginationParams => {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
    allowedSortFields,
  } = options;

  const page = getInteger(query.page) ?? defaultPage;
  let limit = getInteger(query.limit) ?? defaultLimit;

  // Enforce max limit
  if (limit > maxLimit) {
    limit = maxLimit;
  }

  const sort_by = getString(query.sort_by);
  const sort_order = getString(query.sort_order) as 'asc' | 'desc' | undefined;

  // Validate sort field if allowedSortFields is specified
  const validSortBy = allowedSortFields && sort_by
    ? allowedSortFields.includes(sort_by) ? sort_by : undefined
    : sort_by;

  // Validate sort order
  const validSortOrder = sort_order === 'asc' || sort_order === 'desc' ? sort_order : undefined;

  return {
    page,
    limit,
    sort_by: validSortBy,
    sort_order: validSortOrder,
  };
};

/**
 * Calculate offset from page and limit for SQL queries
 */
export const getOffset = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

/**
 * Resolve a safe ORDER BY clause from a user-provided sort field.
 * Uses an allowlist mapping from external sort keys to SQL column names.
 */
export const resolveSort = (
  sortBy: string | undefined,
  sortOrder: string | undefined,
  sortColumnMap: Record<string, string>,
  defaultSortKey: string
): { sortColumn: string; sortOrder: 'ASC' | 'DESC' } => {
  const sortColumn =
    (sortBy && sortColumnMap[sortBy]) || sortColumnMap[defaultSortKey] || defaultSortKey;
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return { sortColumn, sortOrder: order };
};
