/**
 * Saved Report Types
 * Type definitions for saved report management
 */
import type { ReportDefinition, ReportEntity } from './report';
export interface SavedReport {
    id: string;
    name: string;
    description?: string;
    entity: ReportEntity;
    report_definition: ReportDefinition;
    created_by?: string;
    created_at: string;
    updated_at: string;
    is_public: boolean;
}
export interface CreateSavedReportRequest {
    name: string;
    description?: string;
    entity: ReportEntity;
    report_definition: ReportDefinition;
    is_public?: boolean;
}
export interface UpdateSavedReportRequest {
    name?: string;
    description?: string;
    report_definition?: ReportDefinition;
    is_public?: boolean;
}
declare const _default: {
    SavedReport: SavedReport;
    CreateSavedReportRequest: CreateSavedReportRequest;
    UpdateSavedReportRequest: UpdateSavedReportRequest;
};
export default _default;
//# sourceMappingURL=savedReport.d.ts.map