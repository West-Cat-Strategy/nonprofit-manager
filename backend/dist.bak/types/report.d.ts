/**
 * Report Types
 * Type definitions for custom report generation
 */
export type ReportEntity = 'accounts' | 'contacts' | 'donations' | 'events' | 'volunteers' | 'tasks';
export type ReportFormat = 'json' | 'csv' | 'pdf';
export interface ReportField {
    field: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
}
export interface ReportFilter {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'between';
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
export declare const AVAILABLE_FIELDS: Record<ReportEntity, ReportField[]>;
declare const _default: {
    ReportEntity: ReportEntity;
    ReportFormat: ReportFormat;
    ReportField: ReportField;
    ReportFilter: ReportFilter;
    ReportSort: ReportSort;
    ReportDefinition: ReportDefinition;
    ReportResult: ReportResult;
    AVAILABLE_FIELDS: Record<ReportEntity, ReportField[]>;
};
export default _default;
//# sourceMappingURL=report.d.ts.map