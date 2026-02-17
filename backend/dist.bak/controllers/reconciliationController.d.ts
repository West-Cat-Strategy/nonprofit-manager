/**
 * Reconciliation Controller
 * HTTP handlers for payment reconciliation operations
 */
import { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
/**
 * Create a new payment reconciliation
 */
export declare const createReconciliation: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get all reconciliations with filtering
 */
export declare const getReconciliations: (req: Request, res: Response) => Promise<void>;
/**
 * Get reconciliation by ID
 */
export declare const getReconciliationById: (req: Request<{
    id: string;
}>, res: Response) => Promise<void>;
/**
 * Get reconciliation items
 */
export declare const getReconciliationItems: (req: Request<{
    id: string;
}>, res: Response) => Promise<void>;
/**
 * Get discrepancies for a reconciliation
 */
export declare const getReconciliationDiscrepancies: (req: Request<{
    id: string;
}>, res: Response) => Promise<void>;
/**
 * Get all discrepancies with filtering
 */
export declare const getAllDiscrepancies: (req: Request, res: Response) => Promise<void>;
/**
 * Manually match a donation to a Stripe transaction
 */
export declare const manualMatch: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Resolve a discrepancy
 */
export declare const resolveDiscrepancy: (req: AuthRequest, res: Response) => Promise<void>;
/**
 * Get reconciliation dashboard statistics
 */
export declare const getReconciliationDashboard: (_req: Request, res: Response) => Promise<void>;
/**
 * Assign a discrepancy to a user
 */
export declare const assignDiscrepancy: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=reconciliationController.d.ts.map