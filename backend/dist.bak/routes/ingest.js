"use strict";
/**
 * Ingest Routes
 * Preview ingested data files/snippets and propose schema mappings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const upload_1 = require("../middleware/upload");
const ingestController_1 = require("../controllers/ingestController");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
/**
 * POST /api/ingest/preview
 * Multipart upload preview (CSV, Excel, SQL files).
 *
 * form-data:
 * - file: the uploaded file
 * - format (optional): csv | excel | sql
 * - sheet_name (optional): Excel sheet name to preview (defaults to all sheets)
 */
router.post('/preview', upload_1.documentUpload.single('file'), upload_1.handleMulterError, ingestController_1.previewUpload);
/**
 * POST /api/ingest/preview-text
 * Preview plain text snippets (CSV/SQL) without uploading a file.
 */
router.post('/preview-text', [
    (0, express_validator_1.body)('format').optional().isIn(['csv', 'sql']),
    (0, express_validator_1.body)('text').isString().isLength({ min: 1 }),
    (0, express_validator_1.body)('name').optional().isString(),
], validation_1.handleValidationErrors, ingestController_1.previewText);
exports.default = router;
//# sourceMappingURL=ingest.js.map