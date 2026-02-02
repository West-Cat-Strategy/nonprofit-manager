/**
 * Report Types
 * Frontend type definitions for custom report generation
 */

export type ReportEntity = 'accounts' | 'contacts' | 'donations' | 'events' | 'volunteers' | 'tasks';

export type ReportFormat = 'json' | 'csv' | 'pdf';

export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';

export interface ReportField {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
}

export interface ReportFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | number[];
}

export interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ReportDefinition {
  name: string;
  description?: string;
  entity: ReportEntity;
  fields: string[];
  filters?: ReportFilter[];
  sort?: ReportSort[];
  limit?: number;
}

export interface ReportResult {
  definition: ReportDefinition;
  data: Record<string, unknown>[];
  total_count: number;
  generated_at: string;
}

export interface AvailableFields {
  entity: ReportEntity;
  fields: ReportField[];
}
