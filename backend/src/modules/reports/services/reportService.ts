/**
 * Report Service
 * Handles custom report generation and data extraction
 */

import { Pool } from 'pg';
import { logger } from '@config/logger';
import {
  buildTabularExport,
  type GeneratedTabularFile,
} from '@modules/shared/export/tabularExport';
import {
  assertDirectReportExportSupported,
  buildReportDataQuery,
  getUngroupedTotalCount,
} from './reportDirectExportSupport';
import type { ReportDefinition, ReportResult, ReportEntity } from '@app-types/report';
import {
  buildReportQueryPlan,
  getReportFieldSpecs,
} from './reportQueryPlanner';
export {
  DirectReportExportTooLargeError,
  MAX_DIRECT_EXPORT_ROWS,
} from './reportDirectExportSupport';

export interface ReportGenerationScope {
  organizationId?: string;
}

export class ReportService {
  constructor(private pool: Pool) { }

  async assertDirectExportSupported(
    definition: ReportDefinition,
    scope?: ReportGenerationScope
  ): Promise<void> {
    const plan = buildReportQueryPlan(definition, scope);
    await assertDirectReportExportSupported(this.pool, definition, plan);
  }

  /**
   * Generate a custom report based on definition
   */
  async generateReport(
    definition: ReportDefinition,
    scope?: ReportGenerationScope
  ): Promise<ReportResult> {
    try {
      const plan = buildReportQueryPlan(definition, scope);
      const query = buildReportDataQuery(plan);

      logger.debug('Executing report query', { query, values: plan.values });

      const result = await this.pool.query(query, plan.values);

      // Get total count (for non-grouped reports)
      let totalCount = 0;
      if (!plan.isGrouped) {
        totalCount = await getUngroupedTotalCount(this.pool, plan);
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
        if (
          error.message.includes('Invalid') ||
          error.message.includes('At least one field') ||
          error.message.includes('Organization scope')
        ) {
          throw error;
        }
      }
      logger.error('Error generating report', { error, definition });
      throw Object.assign(new Error('Failed to generate report'), { cause: error });
    }
  }

  /**
   * Export report to a specific format
   */
  async exportReport(result: ReportResult, format: 'csv' | 'xlsx'): Promise<GeneratedTabularFile> {
    try {
      const { definition, data } = result;
      const fieldSpecs = getReportFieldSpecs(definition.entity);

      const columns = (definition.groupBy || []).concat(definition.fields || []);
      const aggs = (definition.aggregations || []).map(
        (aggregation) => aggregation.alias || `${aggregation.function}_${aggregation.field}`
      );
      const allColumns = Array.from(new Set(columns.concat(aggs)));

      return buildTabularExport({
        format,
        fallbackBaseName: `${definition.entity}_report_${new Date().toISOString().split('T')[0]}`,
        filename: definition.name,
        sheets: [
          {
            name: definition.name || 'Report',
            columns: allColumns.map((column) => ({
              key: column,
              header: fieldSpecs[column]
                ? fieldSpecs[column].label
                : column.includes('_')
                  ? column.replace(/_/g, ' ').toUpperCase()
                  : column,
              width: 20,
            })),
            rows: data,
          },
        ],
      });
    } catch (error) {
      logger.error('Error exporting report', { error, format });
      throw Object.assign(new Error('Failed to export report'), { cause: error });
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
      fields: Object.entries(getReportFieldSpecs(entity)).map(([field, spec]) => ({
        field,
        label: spec.label,
        type: spec.type,
      })),
    };
  }
}

export default ReportService;
