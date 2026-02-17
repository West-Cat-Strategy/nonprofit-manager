/**
 * Export Service
 * Handles exporting analytics data to CSV and Excel formats
 */
import type { AnalyticsSummary, TrendAnalysis } from '../types/analytics';
export type ExportFormat = 'csv' | 'excel';
export interface ExportOptions {
    format: ExportFormat;
    filename?: string;
    sheetName?: string;
}
export declare class ExportService {
    private exportDir;
    private readonly maxFilenameLength;
    constructor();
    /**
     * Export analytics summary to file
     */
    exportAnalyticsSummary(data: AnalyticsSummary, options: ExportOptions): Promise<string>;
    /**
     * Export donation analytics
     */
    exportDonationAnalytics(donations: any[], options: ExportOptions): Promise<string>;
    /**
     * Export volunteer hours
     */
    exportVolunteerHours(hours: any[], options: ExportOptions): Promise<string>;
    /**
     * Export event attendance
     */
    exportEventAttendance(events: any[], options: ExportOptions): Promise<string>;
    /**
     * Export trend data
     */
    exportTrendData(trends: TrendAnalysis, options: ExportOptions): Promise<string>;
    /**
     * Export multiple sheets to Excel
     */
    exportMultiSheet(sheets: Array<{
        name: string;
        data: any[];
    }>, options: ExportOptions): Promise<string>;
    /**
     * Export data to CSV format
     */
    private exportToCSV;
    /**
     * Export data to Excel format
     */
    private exportToExcel;
    /**
     * Delete an export file
     */
    deleteExport(filepath: string): void;
    /**
     * Clean up old export files (older than 1 hour)
     */
    cleanupOldExports(): void;
    private sanitizeFilename;
    private sanitizeRow;
    private sanitizeSpreadsheetValue;
}
export default ExportService;
//# sourceMappingURL=exportService.d.ts.map