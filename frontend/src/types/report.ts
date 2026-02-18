/**
 * Report Types
 * Frontend type definitions for custom report generation
 */

export type ReportEntity =
  | 'cases'
  | 'accounts'
  | 'contacts'
  | 'donations'
  | 'events'
  | 'volunteers'
  | 'tasks'
  | 'expenses'
  | 'grants'
  | 'programs';

export type ReportFormat = 'json' | 'csv' | 'pdf' | 'xlsx';

export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';

export type AggregateFunction = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface ReportAggregation {
  field: string;
  function: AggregateFunction;
  alias?: string;
}

export interface ReportField {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  is_aggregate?: boolean;
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
  aggregations?: ReportAggregation[];
  groupBy?: string[];
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
