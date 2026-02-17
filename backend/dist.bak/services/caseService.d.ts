/**
 * Case Management Service
 * Handles all case management operations
 */
import { Pool } from 'pg';
import type { Case, CaseWithDetails, CaseFilter, CreateCaseDTO, UpdateCaseDTO, CaseSummary, CaseNote, CreateCaseNoteDTO, UpdateCaseStatusDTO } from '../types/case';
export declare class CaseService {
    private pool;
    constructor(pool: Pool);
    /**
     * Generate unique case number
     */
    private generateCaseNumber;
    /**
     * Create a new case
     */
    createCase(data: CreateCaseDTO, userId?: string): Promise<Case>;
    /**
     * Get cases with filtering
     */
    getCases(filter?: CaseFilter): Promise<{
        cases: CaseWithDetails[];
        total: number;
    }>;
    /**
     * Get case by ID
     */
    getCaseById(caseId: string): Promise<CaseWithDetails | null>;
    /**
     * Update case
     */
    updateCase(caseId: string, data: UpdateCaseDTO, userId?: string): Promise<Case>;
    /**
     * Update case status
     */
    updateCaseStatus(caseId: string, data: UpdateCaseStatusDTO, userId?: string): Promise<Case>;
    /**
     * Get case notes
     */
    getCaseNotes(caseId: string): Promise<CaseNote[]>;
    /**
     * Create case note
     */
    createCaseNote(data: CreateCaseNoteDTO, userId?: string): Promise<CaseNote>;
    /**
     * Get case summary statistics
     */
    getCaseSummary(): Promise<CaseSummary>;
    /**
     * Get case types
     */
    getCaseTypes(): Promise<any[]>;
    /**
     * Get case statuses
     */
    getCaseStatuses(): Promise<any[]>;
    /**
     * Delete case
     */
    deleteCase(caseId: string): Promise<void>;
}
export declare const createCase: (data: CreateCaseDTO, userId?: string) => Promise<Case>;
export declare const getCases: (filter?: CaseFilter) => Promise<{
    cases: CaseWithDetails[];
    total: number;
}>;
export declare const getCaseById: (caseId: string) => Promise<CaseWithDetails | null>;
export declare const updateCase: (caseId: string, data: UpdateCaseDTO, userId?: string) => Promise<Case>;
export declare const updateCaseStatus: (caseId: string, data: UpdateCaseStatusDTO, userId?: string) => Promise<Case>;
export declare const getCaseNotes: (caseId: string) => Promise<CaseNote[]>;
export declare const createCaseNote: (data: CreateCaseNoteDTO, userId?: string) => Promise<CaseNote>;
export declare const getCaseSummary: () => Promise<CaseSummary>;
export declare const getCaseTypes: () => Promise<any[]>;
export declare const getCaseStatuses: () => Promise<any[]>;
export declare const deleteCase: (caseId: string) => Promise<void>;
//# sourceMappingURL=caseService.d.ts.map