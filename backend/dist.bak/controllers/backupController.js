"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportBackup = void 0;
const backupService_1 = require("../services/backupService");
const logger_1 = require("../config/logger");
const backupService = new backupService_1.BackupService();
/**
 * POST /api/backup/export
 * Export a gzipped JSON backup of all public tables.
 *
 * Body:
 *  - filename?: string
 *  - include_secrets?: boolean (defaults to false; redacts tokens/password hashes/MFA secrets)
 *  - compress?: boolean (defaults to true)
 */
const exportBackup = async (req, res, next) => {
    try {
        const filepath = await backupService.createBackupFile({
            filename: req.body?.filename,
            includeSecrets: Boolean(req.body?.include_secrets),
            compress: req.body?.compress !== false,
        });
        res.download(filepath, (err) => {
            if (err) {
                logger_1.logger.error('Error sending backup file', { error: err, filepath });
            }
            const timer = setTimeout(() => backupService.deleteExport(filepath), 5000);
            timer.unref?.();
        });
    }
    catch (error) {
        next(error);
    }
};
exports.exportBackup = exportBackup;
//# sourceMappingURL=backupController.js.map