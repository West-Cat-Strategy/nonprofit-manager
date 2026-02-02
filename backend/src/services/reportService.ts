/**
 * Report Service
 * Handles custom report generation and data extraction
 */

import { Pool } from 'pg';
import { logger } from '../config/logger';
import type {
  ReportDefinition,
  ReportResult,
  ReportEntity,
  ReportFilter,
  ReportSort,
} from '../types/report';

export class ReportService {
  constructor(private pool: Pool) {}

  /**
   * Build WHERE clause from filters
   */
  private buildWhereClause(filters: ReportFilter[]): { clause: string; values: unknown[] } {
    if (!filters || filters.length === 0) {
      return { clause: '', values: [] };
    }

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const filter of filters) {
      const field = filter.field;
      
      switch (filter.operator) {
        case 'eq':
          conditions.push(`${field} = $${paramIndex}`);
          values.push(filter.value);
          paramIndex++;
          break;
        case 'ne':
          conditions.push(`${field} != $${paramIndex}`);
          values.push(filter.value);
          paramIndex++;
          break;
        case 'gt':
          conditions.push(`${field} > $${paramIndex}`);
          values.push(filter.value);
          paramIndex++;
          break;
        case 'gte':
          conditions.push(`${field} >= $${paramIndex}`);
          values.push(filter.value);
          paramIndex++;
          break;
        case 'lt':
          conditions.push(`${field} < $${paramIndex}`);
          values.push(filter.value);
          paramIndex++;
          break;
        case 'lte':
          conditions.push(`${field} <= $${paramIndex}`);
          values.push(filter.value);
          paramIndex++;
          break;
        case 'like':
          conditions.push(`${field} ILIKE $${paramIndex}`);
          values.push(`%${filter.value}%`);
          paramIndex++;
          break;
        case 'in':
          if (Array.isArray(filter.value) && filter.value.length > 0) {
            const placeholders = filter.value.map((_, i) => `$${paramIndex + i}`).join(', ');
            conditions.push(`${field} IN (${placeholders})`);
            values.push(...filter.value);
            paramIndex += filter.value.length;
          }
          break;
        case 'between':
          if (Array.isArray(filter.value) && filter.value.length === 2) {
            conditions.push(`${field} BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            values.push(filter.value[0], filter.value[1]);
            paramIndex += 2;
          }
          break;
      }
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      values,
    };
  }

  /**
   * Build ORDER BY clause from sort array
   */
  private buildOrderByClause(sort?: ReportSort[]): string {
    if (!sort || sort.length === 0) {
      return '';
    }

    const orderClauses = sort.map((s) => `${s.field} ${s.direction.toUpperCase()}`);
    return `ORDER BY ${orderClauses.join(', ')}`;
  }

  /**
   * Get table name for entity
   */
  private getTableName(entity: ReportEntity): string {
    const tableMap: Record<ReportEntity, string> = {
      accounts: 'accounts',
      contacts: 'contacts',
      donations: 'donations',
      events: 'events',
      volunteers: 'volunteers v INNER JOIN contacts c ON v.contact_id = c.id',
      tasks: 'tasks',
    };

    return tableMap[entity];
  }

  /**
   * Map fields for volunteers (which joins contacts)
   */
  private mapFields(entity: ReportEntity, fields: string[]): string[] {
    if (entity === 'volunteers') {
      return fields.map((field) => {
        if (['first_name', 'last_name', 'email', 'phone'].includes(field)) {
          return `c.${field}`;
        }
        return `v.${field}`;
      });
    }
    return fields;
  }

  /**
   * Generate a custom report based on definition
   */
  async generateReport(definition: ReportDefinition): Promise<ReportResult> {
    // Validate fields (throw before try block so error message is preserved)
    if (!definition.fields || definition.fields.length === 0) {
      throw new Error('At least one field must be selected');
    }

    try {
      const tableName = this.getTableName(definition.entity);
      const mappedFields = this.mapFields(definition.entity, definition.fields);
      const selectFields = mappedFields.join(', ');

      // Build WHERE clause
      const { clause: whereClause, values } = this.buildWhereClause(definition.filters || []);

      // Build ORDER BY clause
      const orderByClause = this.buildOrderByClause(definition.sort);

      // Build LIMIT clause
      const limitClause = definition.limit ? `LIMIT ${definition.limit}` : '';

      // Build final query
      const query = `
        SELECT ${selectFields}
        FROM ${tableName}
        ${whereClause}
        ${orderByClause}
        ${limitClause}
      `.trim();

      logger.debug('Executing report query', { query, values });

      // Execute query
      const result = await this.pool.query(query, values);

      // Get total count (without limit)
      const countQuery = `
        SELECT COUNT(*) as count
        FROM ${tableName}
        ${whereClause}
      `.trim();

      const countResult = await this.pool.query(countQuery, values);
      const totalCount = parseInt(countResult.rows[0].count);

      return {
        definition,
        data: result.rows,
        total_count: totalCount,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error generating report', { error, definition });
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Get available fields for an entity type
   */
  async getAvailableFields(entity: ReportEntity): Promise<{
    entity: ReportEntity;
    fields: { field: string; label: string; type: string }[];
  }> {
    const { AVAILABLE_FIELDS } = await import('../types/report');
    return {
      entity,
      fields: AVAILABLE_FIELDS[entity],
    };
  }
}

export default ReportService;
