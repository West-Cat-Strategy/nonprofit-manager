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
  constructor(private pool: Pool) { }

  private getFieldSpecs(entity: ReportEntity): Record<
    string,
    { label: string; type: 'string' | 'number' | 'date' | 'boolean' | 'currency'; column: string }
  > {
    switch (entity) {
      case 'cases':
        return {
          id: { label: 'Case ID', type: 'string', column: 'c.id' },
          case_number: { label: 'Case Number', type: 'string', column: 'c.case_number' },
          title: { label: 'Title', type: 'string', column: 'c.title' },
          description: { label: 'Description', type: 'string', column: 'c.description' },
          priority: { label: 'Priority', type: 'string', column: 'c.priority' },
          outcome: { label: 'Outcome', type: 'string', column: 'c.outcome' },
          status_name: { label: 'Status', type: 'string', column: 'cs.name' },
          status_type: { label: 'Status Type', type: 'string', column: 'cs.status_type' },
          case_type_name: { label: 'Case Type', type: 'string', column: 'ct.name' },
          is_urgent: { label: 'Urgent', type: 'boolean', column: 'c.is_urgent' },
          due_date: { label: 'Due Date', type: 'date', column: 'c.due_date' },
          opened_date: { label: 'Opened Date', type: 'date', column: 'c.opened_date' },
          closed_date: { label: 'Closed Date', type: 'date', column: 'c.closed_date' },
          created_at: { label: 'Created Date', type: 'date', column: 'c.created_at' },
          service_outcome: { label: 'Service/Event Outcome', type: 'string', column: 'svc.outcome' },
        };
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
      case 'expenses':
        return {
          id: { label: 'Expense ID', type: 'string', column: 'ex.id' },
          amount: { label: 'Amount', type: 'currency', column: 'ex.amount' },
          category: { label: 'Category', type: 'string', column: 'ex.category' },
          description: { label: 'Description', type: 'string', column: 'ex.description' },
          expense_date: { label: 'Expense Date', type: 'date', column: 'ex.expense_date' },
          payment_method: { label: 'Payment Method', type: 'string', column: 'ex.payment_method' },
          status: { label: 'Status', type: 'string', column: 'ex.status' },
          created_at: { label: 'Created Date', type: 'date', column: 'ex.created_at' },
        };
      case 'grants':
        return {
          id: { label: 'Grant ID', type: 'string', column: 'g.id' },
          name: { label: 'Grant Name', type: 'string', column: 'g.name' },
          funder: { label: 'Funder', type: 'string', column: 'g.funder' },
          amount: { label: 'Amount', type: 'currency', column: 'g.amount' },
          status: { label: 'Status', type: 'string', column: 'g.status' },
          award_date: { label: 'Award Date', type: 'date', column: 'g.award_date' },
          expiry_date: { label: 'Expiry Date', type: 'date', column: 'g.expiry_date' },
          created_at: { label: 'Created Date', type: 'date', column: 'g.created_at' },
        };
      case 'programs':
        return {
          id: { label: 'Program ID', type: 'string', column: 'p.id' },
          name: { label: 'Program Name', type: 'string', column: 'p.name' },
          description: { label: 'Description', type: 'string', column: 'p.description' },
          status: { label: 'Status', type: 'string', column: 'p.status' },
          start_date: { label: 'Start Date', type: 'date', column: 'p.start_date' },
          end_date: { label: 'End Date', type: 'date', column: 'p.end_date' },
          budget: { label: 'Budget', type: 'currency', column: 'p.budget' },
          created_at: { label: 'Created Date', type: 'date', column: 'p.created_at' },
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
      cases: 'cases c LEFT JOIN case_statuses cs ON c.status_id = cs.id LEFT JOIN case_types ct ON c.case_type_id = ct.id LEFT JOIN LATERAL (SELECT s.outcome FROM case_services s WHERE s.case_id = c.id ORDER BY s.service_date DESC NULLS LAST, s.created_at DESC LIMIT 1) svc ON true',
      accounts: 'accounts a',
      contacts: 'contacts c LEFT JOIN accounts a ON c.account_id = a.id',
      donations: 'donations d',
      events: 'events e',
      volunteers: 'volunteers v INNER JOIN contacts c ON v.contact_id = c.id',
      tasks: 'tasks t',
      expenses: 'expenses ex',
      grants: 'grants g',
      programs: 'programs p',
    };

    return tableMap[entity];
  }

  /**
   * Generate a custom report based on definition
   */
  async generateReport(definition: ReportDefinition): Promise<ReportResult> {
    try {
      const tableName = this.getTableName(definition.entity);
      const fieldSpecs = this.getFieldSpecs(definition.entity);

      const selectParts: string[] = [];

      // Handle grouping fields
      if (definition.groupBy && definition.groupBy.length > 0) {
        for (const field of definition.groupBy) {
          if (!fieldSpecs[field]) {
            throw new Error(`Invalid group by field: ${field}`);
          }
          selectParts.push(`${fieldSpecs[field].column} AS ${field}`);
        }
      } else {
        // Handle regular fields if not grouping
        if (definition.fields && definition.fields.length > 0) {
          const invalidFields = definition.fields.filter((field) => !fieldSpecs[field]);
          if (invalidFields.length > 0) {
            throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
          }
          definition.fields.forEach((field) => {
            selectParts.push(`${fieldSpecs[field].column} AS ${field}`);
          });
        }
      }

      // Handle aggregations
      if (definition.aggregations && definition.aggregations.length > 0) {
        for (const agg of definition.aggregations) {
          if (!fieldSpecs[agg.field]) {
            throw new Error(`Invalid aggregation field: ${agg.field}`);
          }
          const alias = agg.alias || `${agg.function}_${agg.field}`;
          selectParts.push(`${agg.function.toUpperCase()}(${fieldSpecs[agg.field].column}) AS ${alias}`);
        }
      }

      if (selectParts.length === 0) {
        throw new Error('At least one field or aggregation must be selected');
      }

      const selectFields = selectParts.join(', ');

      // Build WHERE clause
      const { clause: whereClause, values } = this.buildWhereClause(
        definition.filters || [],
        fieldSpecs
      );

      // Build GROUP BY clause
      const groupByClause = definition.groupBy && definition.groupBy.length > 0
        ? `GROUP BY ${definition.groupBy.map(f => fieldSpecs[f].column).join(', ')}`
        : '';

      // Build ORDER BY clause
      const orderByClause = this.buildOrderByClause(definition.sort, fieldSpecs);

      // Build LIMIT clause
      const limitClause = definition.limit ? `LIMIT ${definition.limit}` : '';

      // Build final query
      const query = `
        SELECT ${selectFields}
        FROM ${tableName}
        ${whereClause}
        ${groupByClause}
        ${orderByClause}
        ${limitClause}
      `.trim().replace(/\s+/g, ' ');

      logger.debug('Executing report query', { query, values });

      // Execute query
      const result = await this.pool.query(query, values);

      // Get total count (for non-grouped reports)
      let totalCount = 0;
      if (!definition.groupBy || definition.groupBy.length === 0) {
        const countQuery = `
          SELECT COUNT(*) as count
          FROM ${tableName}
          ${whereClause}
        `.trim().replace(/\s+/g, ' ');

        const countResult = await this.pool.query(countQuery, values);
        totalCount = parseInt(countResult.rows[0].count);
      } else {
        totalCount = result.rows.length;
      }

      return {
        definition,
        data: result.rows,
        total_count: totalCount,
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid') || error.message.includes('At least one field')) {
          throw error;
        }
      }
      logger.error('Error generating report', { error, definition });
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Export report to a specific format
   */
  async exportReport(result: ReportResult, format: 'csv' | 'xlsx'): Promise<Buffer> {
    try {
      const { definition, data } = result;
      const fieldSpecs = this.getFieldSpecs(definition.entity);

      // Determine columns to include
      const columns = (definition.groupBy || []).concat(definition.fields || []);
      const aggs = (definition.aggregations || []).map(a => a.alias || `${a.function}_${a.field}`);
      const allColumns = columns.concat(aggs);

      if (format === 'xlsx') {
        const Workbook = (await import('exceljs')).default.Workbook;
        const workbook = new Workbook();
        const worksheet = workbook.addWorksheet(definition.name || 'Report');

        // Add headers
        worksheet.columns = allColumns.map(col => {
          let label = col;
          if (fieldSpecs[col]) {
            label = fieldSpecs[col].label;
          } else if (col.includes('_')) {
            // Likely an aggregation
            label = col.replace(/_/g, ' ').toUpperCase();
          }
          return { header: label, key: col, width: 20 };
        });

        // Add rows
        worksheet.addRows(data);

        // Styling
        worksheet.getRow(1).font = { bold: true };

        return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
      } else {
        // Simple CSV generation
        const headers = allColumns.join(',');
        const rows = data.map(row =>
          allColumns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') ? `"${str}"` : str;
          }).join(',')
        );
        const csvContent = [headers, ...rows].join('\n');
        return Buffer.from(csvContent);
      }
    } catch (error) {
      logger.error('Error exporting report', { error, format });
      throw new Error('Failed to export report');
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
