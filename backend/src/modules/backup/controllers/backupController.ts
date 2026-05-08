import { Response, NextFunction } from 'express';
import { services } from '@container/services';
import { AuthRequest } from '@middleware/auth';
import { logger } from '@config/logger';
import { badRequest, forbidden } from '@utils/responseHelpers';

const backupService = services.backup;
export const CONFIRM_SECRETS_EXPORT_PHRASE = 'EXPORT_UNREDACTED_BACKUP';

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
    if (req.body?.include_secrets === true) {
      if (process.env.BACKUP_INCLUDE_SECRETS_ENABLED !== 'true') {
        forbidden(res, 'Secret-bearing backup exports are disabled');
        return;
      }

      if (req.body?.confirm_secrets_export !== CONFIRM_SECRETS_EXPORT_PHRASE) {
        badRequest(
          res,
          `confirm_secrets_export must exactly equal "${CONFIRM_SECRETS_EXPORT_PHRASE}" when include_secrets is true`
        );
        return;
      }
    }

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
