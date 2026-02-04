/**
 * Ingest Controller
 * Endpoints for parsing uploaded data and suggesting schema mappings.
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare const previewUpload: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const previewText: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=ingestController.d.ts.map