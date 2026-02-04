import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
export declare const createCase: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCases: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCaseById: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateCase: (req: AuthRequest, res: Response) => Promise<void>;
export declare const updateCaseStatus: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCaseNotes: (req: AuthRequest, res: Response) => Promise<void>;
export declare const createCaseNote: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getCaseSummary: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getCaseTypes: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const getCaseStatuses: (_req: AuthRequest, res: Response) => Promise<void>;
export declare const deleteCase: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=caseController.d.ts.map