import { Response, NextFunction } from 'express';
import { services } from '../container/services';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const backupService = services.backup;

/**
 * POST /api/backup/export
 * Export a gzipped JSON backup of all public tables.
 *
 * Body:
 *  - filename?: string
 *  - include_secrets?: boolean (defaults to false; redacts tokens/password hashes/MFA secrets)
 *  - compress?: boolean (defaults to true)
 */
export const exportBackup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filepath = await backupService.createBackupFile({
      filename: req.body?.filename,
      includeSecrets: Boolean(req.body?.include_secrets),
      compress: req.body?.compress !== false,
    });

    res.download(filepath, (err) => {
      if (err) {
        logger.error('Error sending backup file', { error: err, filepath });
      }
      const timer = setTimeout(() => backupService.deleteExport(filepath), 5000);
      timer.unref?.();
    });
  } catch (error) {
    next(error);
  }
};
