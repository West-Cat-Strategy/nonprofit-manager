/**
 * Query Parameter Helpers
 * Utilities for parsing and validating query parameters from HTTP requests
 */
/**
 * Parse a query parameter as a string
 */
export declare const getString: (value: unknown) => string | undefined;
/**
 * Parse a query parameter as a number
 */
export declare const getNumber: (value: unknown) => number | undefined;
/**
 * Parse a query parameter as an integer
 */
export declare const getInteger: (value: unknown) => number | undefined;
/**
 * Parse a query parameter as a boolean
 * Accepts: 'true', 'false', '1', '0'
 */
export declare const getBoolean: (value: unknown) => boolean | undefined;
/**
 * Parse a query parameter as an array (comma-separated values)
 */
export declare const getArray: (value: unknown) => string[] | undefined;
/**
 * Parse a query parameter as a date string (ISO format)
 */
export declare const getDateString: (value: unknown) => string | undefined;
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
export declare const extractPagination: (query: Record<string, unknown>, options?: ExtractPaginationOptions) => PaginationParams;
/**
 * Calculate offset from page and limit for SQL queries
 */
export declare const getOffset: (page: number, limit: number) => number;
/**
 * Resolve a safe ORDER BY clause from a user-provided sort field.
 * Uses an allowlist mapping from external sort keys to SQL column names.
 */
export declare const resolveSort: (sortBy: string | undefined, sortOrder: string | undefined, sortColumnMap: Record<string, string>, defaultSortKey: string) => {
    sortColumn: string;
    sortOrder: "ASC" | "DESC";
};
//# sourceMappingURL=queryHelpers.d.ts.map