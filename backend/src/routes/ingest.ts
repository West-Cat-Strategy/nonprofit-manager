/**
 * Ingest Routes
 * Preview ingested data files/snippets and propose schema mappings.
 */

import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '@middleware/domains/auth';
import { validateRequest } from '@middleware/domains/security';
import { documentUpload, handleMulterError } from '@middleware/domains/platform';
import { previewText, previewUpload } from '@controllers/domains/core';

const router = Router();

router.use(authenticate);

/**
 * POST /api/ingest/preview
 * Multipart upload preview (CSV, Excel, SQL files).
 *
 * form-data:
 * - file: the uploaded file
 * - format (optional): csv | excel | sql
 * - sheet_name (optional): Excel sheet name to preview (defaults to all sheets)
 */
router.post('/preview', documentUpload.single('file'), handleMulterError, previewUpload);

/**
 * POST /api/ingest/preview-text
 * Preview plain text snippets (CSV/SQL) without uploading a file.
 */
router.post(
  '/preview-text',
  [
    body('format').optional().isIn(['csv', 'sql']),
    body('text').isString().isLength({ min: 1 }),
    body('name').optional().isString(),
  ],
  validateRequest,
  previewText
);

export default router;
