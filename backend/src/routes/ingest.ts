/**
 * Ingest Routes
 * Preview ingested data files/snippets and propose schema mappings.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '@middleware/domains/auth';
import { validateBody } from '@middleware/zodValidation';
import { documentUpload, handleMulterError } from '@middleware/domains/platform';
import { previewText, previewUpload } from '@controllers/domains/core';

const router = Router();

const ingestPreviewTextSchema = z.object({
  format: z.enum(['csv', 'sql']).optional(),
  text: z.string().min(1),
  name: z.string().optional(),
});

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
router.post('/preview-text', validateBody(ingestPreviewTextSchema), previewText);

export default router;
