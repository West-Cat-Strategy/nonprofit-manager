/**
 * Report Service
 * Handles custom report generation and data extraction
 */
import { Pool } from 'pg';
import type { ReportDefinition, ReportResult, ReportEntity } from '../types/report';
export declare class ReportService {
    private pool;
    constructor(pool: Pool);
    private getFieldSpecs;
    /**
     * Build WHERE clause from filters
     */
    private buildWhereClause;
    /**
     * Build ORDER BY clause from sort array
     */
    private buildOrderByClause;
    /**
     * Get table name for entity
     */
    private getTableName;
    /**
     * Generate a custom report based on definition
     */
    generateReport(definition: ReportDefinition): Promise<ReportResult>;
    /**
     * Get available fields for an entity type
     */
    getAvailableFields(entity: ReportEntity): Promise<{
        entity: ReportEntity;
        fields: {
            field: string;
            label: string;
            type: string;
        }[];
    }>;
}
export default ReportService;
//# sourceMappingURL=reportService.d.ts.map