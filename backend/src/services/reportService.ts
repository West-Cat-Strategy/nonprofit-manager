/**
 * Report Service
 * Handles custom report generation and data extraction
 */

import { Pool } from 'pg';
import { logger } from '@config/logger';
import type {
  ReportDefinition,
  ReportResult,
  ReportEntity,
  ReportFilter,
  ReportSort,
} from '@app-types/report';

export class ReportService {
  constructor(private pool: Pool) {}

  private getFieldSpecs(entity: ReportEntity): Record<
    string,
    { label: string; type: 'string' | 'number' | 'date' | 'boolean' | 'currency'; column: string }
  > {
    switch (entity) {
      case 'accounts':
        return {
          id: { label: 'Account ID', type: 'string', column: 'a.id' },
          account_name: { label: 'Account Name', type: 'string', column: 'a.account_name' },
          account_type: { label: 'Type', type: 'string', column: 'a.account_type' },
          category: { label: 'Category', type: 'string', column: 'a.category' },
          website: { label: 'Website', type: 'string', column: 'a.website' },
          phone: { label: 'Phone', type: 'string', column: 'a.phone' },
          email: { label: 'Email', type: 'string', column: 'a.email' },
          is_active: { label: 'Active', type: 'boolean', column: 'a.is_active' },
          created_at: { label: 'Created Date', type: 'date', column: 'a.created_at' },
          updated_at: { label: 'Updated Date', type: 'date', column: 'a.updated_at' },
        };
      case 'contacts':
        return {
          id: { label: 'Contact ID', type: 'string', column: 'c.id' },
          first_name: { label: 'First Name', type: 'string', column: 'c.first_name' },
          last_name: { label: 'Last Name', type: 'string', column: 'c.last_name' },
          email: { label: 'Email', type: 'string', column: 'c.email' },
          phone: { label: 'Phone', type: 'string', column: 'c.phone' },
          mobile_phone: { label: 'Mobile Phone', type: 'string', column: 'c.mobile_phone' },
          job_title: { label: 'Job Title', type: 'string', column: 'c.job_title' },
          department: { label: 'Department', type: 'string', column: 'c.department' },
          preferred_contact_method: { label: 'Preferred Contact Method', type: 'string', column: 'c.preferred_contact_method' },
          account_name: { label: 'Account', type: 'string', column: 'a.account_name' },
          is_active: { label: 'Active', type: 'boolean', column: 'c.is_active' },
          created_at: { label: 'Created Date', type: 'date', column: 'c.created_at' },
          updated_at: { label: 'Updated Date', type: 'date', column: 'c.updated_at' },
        };
      case 'donations':
        return {
          id: { label: 'Donation ID', type: 'string', column: 'd.id' },
          donation_number: { label: 'Donation Number', type: 'string', column: 'd.donation_number' },
          amount: { label: 'Amount', type: 'currency', column: 'd.amount' },
          currency: { label: 'Currency', type: 'string', column: 'd.currency' },
          payment_method: { label: 'Payment Method', type: 'string', column: 'd.payment_method' },
          payment_status: { label: 'Payment Status', type: 'string', column: 'd.payment_status' },
          campaign_name: { label: 'Campaign', type: 'string', column: 'd.campaign_name' },
          designation: { label: 'Designation', type: 'string', column: 'd.designation' },
          is_recurring: { label: 'Recurring', type: 'boolean', column: 'd.is_recurring' },
          donation_date: { label: 'Donation Date', type: 'date', column: 'd.donation_date' },
          created_at: { label: 'Created Date', type: 'date', column: 'd.created_at' },
        };
      case 'events':
        return {
          id: { label: 'Event ID', type: 'string', column: 'e.id' },
          name: { label: 'Event Name', type: 'string', column: 'e.name' },
          event_type: { label: 'Type', type: 'string', column: 'e.event_type' },
          status: { label: 'Status', type: 'string', column: 'e.status' },
          location_name: { label: 'Location', type: 'string', column: 'e.location_name' },
          capacity: { label: 'Capacity', type: 'number', column: 'e.capacity' },
          start_date: { label: 'Start Date', type: 'date', column: 'e.start_date' },
          end_date: { label: 'End Date', type: 'date', column: 'e.end_date' },
          created_at: { label: 'Created Date', type: 'date', column: 'e.created_at' },
        };
      case 'volunteers':
        return {
          id: { label: 'Volunteer ID', type: 'string', column: 'v.id' },
          contact_id: { label: 'Contact ID', type: 'string', column: 'v.contact_id' },
          first_name: { label: 'First Name', type: 'string', column: 'c.first_name' },
          last_name: { label: 'Last Name', type: 'string', column: 'c.last_name' },
          email: { label: 'Email', type: 'string', column: 'c.email' },
          phone: { label: 'Phone', type: 'string', column: 'c.phone' },
          volunteer_status: { label: 'Status', type: 'string', column: 'v.volunteer_status' },
          skills: { label: 'Skills', type: 'string', column: 'v.skills' },
          availability: { label: 'Availability', type: 'string', column: 'v.availability' },
          hours_contributed: { label: 'Hours Contributed', type: 'number', column: 'v.hours_contributed' },
          created_at: { label: 'Created Date', type: 'date', column: 'v.created_at' },
        };
      case 'tasks':
        return {
          id: { label: 'Task ID', type: 'string', column: 't.id' },
          subject: { label: 'Subject', type: 'string', column: 't.subject' },
          status: { label: 'Status', type: 'string', column: 't.status' },
          priority: { label: 'Priority', type: 'string', column: 't.priority' },
          due_date: { label: 'Due Date', type: 'date', column: 't.due_date' },
          completed_date: { label: 'Completed Date', type: 'date', column: 't.completed_date' },
          related_to_type: { label: 'Related To', type: 'string', column: 't.related_to_type' },
          created_at: { label: 'Created Date', type: 'date', column: 't.created_at' },
        };
      default:
        return {};
    }
  }

  /**
   * Build WHERE clause from filters
   */
  private buildWhereClause(
    filters: ReportFilter[],
    fieldSpecs: Record<string, { column: string }>
  ): { clause: string; values: unknown[] } {
    if (!filters || filters.length === 0) {
      return { clause: '', values: [] };
    }

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const filter of filters) {
      const fieldSpec = fieldSpecs[filter.field];
      if (!fieldSpec) {
        throw new Error(`Invalid filter field: ${filter.field}`);
      }
      const column = fieldSpec.column;
      const value = filter.value;
      
      switch (filter.operator) {
        case 'eq':
          if (value === undefined || value === null || value === '') break;
          conditions.push(`${column} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
        case 'ne':
          if (value === undefined || value === null) break;
          // Treat "not equal empty string" as "has a non-empty value" (exclude NULLs too)
          if (value === '') {
            conditions.push(`COALESCE(${column}, '') <> ''`);
            break;
          }
          conditions.push(`${column} != $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
        case 'gt':
          if (value === undefined || value === null || value === '') break;
          conditions.push(`${column} > $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
        case 'gte':
          if (value === undefined || value === null || value === '') break;
          conditions.push(`${column} >= $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
        case 'lt':
          if (value === undefined || value === null || value === '') break;
          conditions.push(`${column} < $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
        case 'lte':
          if (value === undefined || value === null || value === '') break;
          conditions.push(`${column} <= $${paramIndex}`);
          values.push(value);
          paramIndex++;
          break;
        case 'like':
          if (value === undefined || value === null || value === '') break;
          conditions.push(`${column} ILIKE $${paramIndex}`);
          values.push(`%${value}%`);
          paramIndex++;
          break;
        case 'in':
          if (value === undefined || value === null || value === '') break;
          if (Array.isArray(value) && value.length > 0) {
            const placeholders = value.map((_, i) => `$${paramIndex + i}`).join(', ');
            conditions.push(`${column} IN (${placeholders})`);
            values.push(...value);
            paramIndex += value.length;
          } else if (typeof value === 'string') {
            const list = value.split(',').map((v) => v.trim()).filter(Boolean);
            if (list.length > 0) {
              const placeholders = list.map((_, i) => `$${paramIndex + i}`).join(', ');
              conditions.push(`${column} IN (${placeholders})`);
              values.push(...list);
              paramIndex += list.length;
            }
          }
          break;
        case 'between':
          if (Array.isArray(value) && value.length === 2) {
            conditions.push(`${column} BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
            values.push(value[0], value[1]);
            paramIndex += 2;
          } else if (typeof value === 'string') {
            const parts = value.split(',').map((v) => v.trim()).filter(Boolean);
            if (parts.length === 2) {
              conditions.push(`${column} BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
              values.push(parts[0], parts[1]);
              paramIndex += 2;
            }
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
  private buildOrderByClause(
    sort: ReportSort[] | undefined,
    fieldSpecs: Record<string, { column: string }>
  ): string {
    if (!sort || sort.length === 0) {
      return '';
    }

    const orderClauses = sort.map((s) => {
      const fieldSpec = fieldSpecs[s.field];
      if (!fieldSpec) {
        throw new Error(`Invalid sort field: ${s.field}`);
      }
      return `${fieldSpec.column} ${s.direction.toUpperCase()}`;
    });
    return `ORDER BY ${orderClauses.join(', ')}`;
  }

  /**
   * Get table name for entity
   */
  private getTableName(entity: ReportEntity): string {
    const tableMap: Record<ReportEntity, string> = {
      accounts: 'accounts a',
      contacts: 'contacts c LEFT JOIN accounts a ON c.account_id = a.id',
      donations: 'donations d',
      events: 'events e',
      volunteers: 'volunteers v INNER JOIN contacts c ON v.contact_id = c.id',
      tasks: 'tasks t',
    };

    return tableMap[entity];
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
      const fieldSpecs = this.getFieldSpecs(definition.entity);
      const invalidFields = definition.fields.filter((field) => !fieldSpecs[field]);
      if (invalidFields.length > 0) {
        throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
      }
      const selectFields = definition.fields
        .map((field) => `${fieldSpecs[field].column} AS ${field}`)
        .join(', ');

      // Build WHERE clause
      const { clause: whereClause, values } = this.buildWhereClause(
        definition.filters || [],
        fieldSpecs
      );

      // Build ORDER BY clause
      const orderByClause = this.buildOrderByClause(definition.sort, fieldSpecs);

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
    return {
      entity,
      fields: Object.entries(this.getFieldSpecs(entity)).map(([field, spec]) => ({
        field,
        label: spec.label,
        type: spec.type,
      })),
    };
  }
}

export default ReportService;
