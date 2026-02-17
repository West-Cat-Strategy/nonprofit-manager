"use strict";
/**
 * Backup Routes
 * Admin-only API routes for exporting full data backups.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const backupController_1 = require("../controllers/backupController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('admin'));
router.post('/export', [
    (0, express_validator_1.body)('filename').optional().isString(),
    (0, express_validator_1.body)('include_secrets').optional().isBoolean(),
    (0, express_validator_1.body)('compress').optional().isBoolean(),
], validation_1.handleValidationErrors, backupController_1.exportBackup);
exports.default = router;
//# sourceMappingURL=backup.js.map