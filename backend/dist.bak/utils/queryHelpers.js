"use strict";
/**
 * Query Parameter Helpers
 * Utilities for parsing and validating query parameters from HTTP requests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSort = exports.getOffset = exports.extractPagination = exports.getDateString = exports.getArray = exports.getBoolean = exports.getInteger = exports.getNumber = exports.getString = void 0;
/**
 * Parse a query parameter as a string
 */
const getString = (value) => typeof value === 'string' ? value : undefined;
exports.getString = getString;
/**
 * Parse a query parameter as a number
 */
const getNumber = (value) => {
    if (typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? undefined : num;
    }
    return undefined;
};
exports.getNumber = getNumber;
/**
 * Parse a query parameter as an integer
 */
const getInteger = (value) => {
    if (typeof value === 'string') {
        const num = parseInt(value, 10);
        return isNaN(num) ? undefined : num;
    }
    return undefined;
};
exports.getInteger = getInteger;
/**
 * Parse a query parameter as a boolean
 * Accepts: 'true', 'false', '1', '0'
 */
const getBoolean = (value) => {
    if (value === 'true' || value === '1')
        return true;
    if (value === 'false' || value === '0')
        return false;
    return undefined;
};
exports.getBoolean = getBoolean;
/**
 * Parse a query parameter as an array (comma-separated values)
 */
const getArray = (value) => {
    if (typeof value === 'string') {
        return value.split(',').map((v) => v.trim()).filter((v) => v.length > 0);
    }
    if (Array.isArray(value)) {
        return value.filter((v) => typeof v === 'string');
    }
    return undefined;
};
exports.getArray = getArray;
/**
 * Parse a query parameter as a date string (ISO format)
 */
const getDateString = (value) => {
    if (typeof value === 'string') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? undefined : value;
    }
    return undefined;
};
exports.getDateString = getDateString;
/**
 * Extract standard pagination parameters from query object
 */
const extractPagination = (query, options = {}) => {
    const { defaultPage = 1, defaultLimit = 20, maxLimit = 100, allowedSortFields, } = options;
    const page = (0, exports.getInteger)(query.page) ?? defaultPage;
    let limit = (0, exports.getInteger)(query.limit) ?? defaultLimit;
    // Enforce max limit
    if (limit > maxLimit) {
        limit = maxLimit;
    }
    const sort_by = (0, exports.getString)(query.sort_by);
    const sort_order = (0, exports.getString)(query.sort_order);
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
exports.extractPagination = extractPagination;
/**
 * Calculate offset from page and limit for SQL queries
 */
const getOffset = (page, limit) => {
    return (page - 1) * limit;
};
exports.getOffset = getOffset;
/**
 * Resolve a safe ORDER BY clause from a user-provided sort field.
 * Uses an allowlist mapping from external sort keys to SQL column names.
 */
const resolveSort = (sortBy, sortOrder, sortColumnMap, defaultSortKey) => {
    const sortColumn = (sortBy && sortColumnMap[sortBy]) || sortColumnMap[defaultSortKey] || defaultSortKey;
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    return { sortColumn, sortOrder: order };
};
exports.resolveSort = resolveSort;
//# sourceMappingURL=queryHelpers.js.map