/**
 * Saved Report Service
 * Handles CRUD operations for saved reports
 */
import { Pool } from 'pg';
import type { SavedReport, CreateSavedReportRequest, UpdateSavedReportRequest } from '../types/savedReport';
export declare class SavedReportService {
    private pool;
    constructor(pool: Pool);
    /**
     * Get all saved reports (optionally filter by user or entity)
     */
    getSavedReports(userId?: string, entity?: string): Promise<SavedReport[]>;
    /**
     * Get a single saved report by ID
     */
    getSavedReportById(id: string, userId?: string): Promise<SavedReport | null>;
    /**
     * Create a new saved report
     */
    createSavedReport(userId: string, data: CreateSavedReportRequest): Promise<SavedReport>;
    /**
     * Update an existing saved report
     */
    updateSavedReport(id: string, userId: string, data: UpdateSavedReportRequest): Promise<SavedReport | null>;
    /**
     * Delete a saved report
     */
    deleteSavedReport(id: string, userId: string): Promise<boolean>;
}
export default SavedReportService;
//# sourceMappingURL=savedReportService.d.ts.map