import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * POST /api/backup/export
 * Export a gzipped JSON backup of all public tables.
 *
 * Body:
 *  - filename?: string
 *  - include_secrets?: boolean (defaults to false; redacts tokens/password hashes/MFA secrets)
 *  - compress?: boolean (defaults to true)
 */
export declare const exportBackup: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=backupController.d.ts.map