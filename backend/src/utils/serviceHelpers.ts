/**
 * Service Helpers
 * Reusable patterns for common database operations
 */

import { Pool } from 'pg';

type QueryValue = string | number | boolean | Date | null | string[];

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/**
 * Data scope filter for multi-tenant filtering
 */
export interface DataScopeFilter {
  accountIds?: string[];
  contactIds?: string[];
  createdByUserIds?: string[];
}

/**
 * Build WHERE clause conditions from filters
 */
export class QueryBuilder {
  private conditions: string[] = [];
  private params: QueryValue[] = [];
  private paramCount = 1;

  /**
   * Add an equality condition
   */
  addEqual(column: string, value: unknown): this {
    if (value !== undefined && value !== null && value !== '') {
      this.conditions.push(`${column} = $${this.paramCount}`);
      this.params.push(value as QueryValue);
      this.paramCount++;
    }
    return this;
  }

  /**
   * Add a LIKE/ILIKE condition for text search
   */
  addLike(column: string, value: string | undefined, caseInsensitive = true): this {
    if (value) {
      const op = caseInsensitive ? 'ILIKE' : 'LIKE';
      this.conditions.push(`${column} ${op} $${this.paramCount}`);
      this.params.push(`%${value}%`);
      this.paramCount++;
    }
    return this;
  }

  /**
   * Add a multi-column LIKE search (OR conditions)
   */
  addSearch(columns: string[], value: string | undefined): this {
    if (value && columns.length > 0) {
      const searchConditions = columns.map(
        (col) => `${col} ILIKE $${this.paramCount}`
      );
      this.conditions.push(`(${searchConditions.join(' OR ')})`);
      this.params.push(`%${value}%`);
      this.paramCount++;
    }
    return this;
  }

  /**
   * Add a greater than or equal condition
   */
  addGreaterOrEqual(column: string, value: unknown): this {
    if (value !== undefined && value !== null) {
      this.conditions.push(`${column} >= $${this.paramCount}`);
      this.params.push(value as QueryValue);
      this.paramCount++;
    }
    return this;
  }

  /**
   * Add a less than or equal condition
   */
  addLessOrEqual(column: string, value: unknown): this {
    if (value !== undefined && value !== null) {
      this.conditions.push(`${column} <= $${this.paramCount}`);
      this.params.push(value as QueryValue);
      this.paramCount++;
    }
    return this;
  }

  /**
   * Add a date range filter
   */
  addDateRange(
    column: string,
    startDate: string | undefined,
    endDate: string | undefined
  ): this {
    if (startDate) {
      this.conditions.push(`${column} >= $${this.paramCount}`);
      this.params.push(startDate);
      this.paramCount++;
    }
    if (endDate) {
      this.conditions.push(`${column} <= $${this.paramCount}`);
      this.params.push(endDate);
      this.paramCount++;
    }
    return this;
  }

  /**
   * Add an IN condition using ANY
   */
  addIn(column: string, values: string[] | undefined, type = 'uuid'): this {
    if (values && values.length > 0) {
      this.conditions.push(`${column} = ANY($${this.paramCount}::${type}[])`);
      this.params.push(values);
      this.paramCount++;
    }
    return this;
  }

  /**
   * Add data scope filters
   */
  addScope(scope: DataScopeFilter | undefined, columnMap: {
    accountId?: string;
    contactId?: string;
    createdBy?: string;
  }): this {
    if (!scope) return this;

    if (scope.accountIds && scope.accountIds.length > 0 && columnMap.accountId) {
      this.addIn(columnMap.accountId, scope.accountIds);
    }
    if (scope.contactIds && scope.contactIds.length > 0 && columnMap.contactId) {
      this.addIn(columnMap.contactId, scope.contactIds);
    }
    if (scope.createdByUserIds && scope.createdByUserIds.length > 0 && columnMap.createdBy) {
      this.addIn(columnMap.createdBy, scope.createdByUserIds);
    }

    return this;
  }

  /**
   * Add a raw condition
   */
  addRaw(condition: string, ...values: QueryValue[]): this {
    if (values.length > 0) {
      // Replace $N placeholders with correct param numbers
      let adjustedCondition = condition;
      values.forEach((_, index) => {
        adjustedCondition = adjustedCondition.replace(
          `$${index + 1}`,
          `$${this.paramCount + index}`
        );
      });
      this.conditions.push(adjustedCondition);
      this.params.push(...values);
      this.paramCount += values.length;
    } else {
      this.conditions.push(condition);
    }
    return this;
  }

  /**
   * Get the WHERE clause string
   */
  getWhereClause(): string {
    return this.conditions.length > 0
      ? `WHERE ${this.conditions.join(' AND ')}`
      : '';
  }

  /**
   * Get the parameters array
   */
  getParams(): QueryValue[] {
    return this.params;
  }

  /**
   * Get the current parameter count (for adding more params after WHERE)
   */
  getParamCount(): number {
    return this.paramCount;
  }

  /**
   * Add limit and offset params for pagination
   */
  addPagination(limit: number, offset: number): { limitParam: string; offsetParam: string } {
    const limitParam = `$${this.paramCount}`;
    this.params.push(limit);
    this.paramCount++;

    const offsetParam = `$${this.paramCount}`;
    this.params.push(offset);
    this.paramCount++;

    return { limitParam, offsetParam };
  }
}

/**
 * Build dynamic UPDATE SET clause from data object
 */
export function buildUpdateFields(
  data: Record<string, unknown>,
  startParamCount = 1
): {
  fields: string[];
  values: QueryValue[];
  paramCount: number;
} {
  const fields: string[] = [];
  const values: QueryValue[] = [];
  let paramCount = startParamCount;

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value as QueryValue);
      paramCount++;
    }
  });

  return { fields, values, paramCount };
}

/**
 * Calculate pagination values
 */
export function calculatePagination(
  total: number,
  page = 1,
  limit = 20
): {
  offset: number;
  total_pages: number;
  pagination: { total: number; page: number; limit: number; total_pages: number };
} {
  const offset = (page - 1) * limit;
  const total_pages = Math.ceil(total / limit);

  return {
    offset,
    total_pages,
    pagination: {
      total,
      page,
      limit,
      total_pages,
    },
  };
}

/**
 * Execute a count query and return the total
 */
export async function getCount(
  pool: Pool,
  table: string,
  whereClause: string,
  params: QueryValue[]
): Promise<number> {
  const query = `SELECT COUNT(*) FROM ${table} ${whereClause}`;
  const result = await pool.query(query, params);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Generate a sequential number with prefix (e.g., DON-250205-00001)
 */
export async function generateSequentialNumber(
  pool: Pool,
  table: string,
  columnName: string,
  prefix: string
): Promise<string> {
  const countQuery = `
    SELECT COUNT(*) FROM ${table}
    WHERE ${columnName} LIKE $1
  `;
  const result = await pool.query(countQuery, [`${prefix}%`]);
  const count = parseInt(result.rows[0].count) + 1;
  const sequence = String(count).padStart(5, '0');
  return `${prefix}-${sequence}`;
}

/**
 * Generate today's prefix for sequential numbers (e.g., DON-250205)
 */
export function getTodayPrefix(entityPrefix: string): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${entityPrefix}-${year}${month}${day}`;
}
