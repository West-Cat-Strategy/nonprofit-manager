/**
 * Ingest Controller
 * Endpoints for parsing uploaded data and suggesting schema mappings.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ingestPreviewFromBuffer, ingestPreviewFromText, ingestPreviewFromTextAuto } from '../ingest/preview';
import type { IngestSourceType } from '../ingest/types';
import { badRequest } from '../utils/responseHelpers';

export const previewUpload = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      badRequest(res, 'No file uploaded');
      return;
    }

    const sheetName = typeof req.body.sheet_name === 'string' ? req.body.sheet_name : undefined;
    const format =
      typeof req.body.format === 'string' ? (req.body.format as IngestSourceType) : undefined;

    const preview = await ingestPreviewFromBuffer({
      buffer: file.buffer,
      filename: file.originalname,
      mimeType: file.mimetype,
      format,
      sheetName,
      name: file.originalname,
    });

    res.json(preview);
  } catch (error) {
    next(error);
  }
};

export const previewText = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { format, text, name } = req.body as {
      format?: IngestSourceType;
      text: string;
      name?: string;
    };

    const preview = format ? ingestPreviewFromText({ format, text, name }) : ingestPreviewFromTextAuto({ text, name });
    res.json(preview);
  } catch (error) {
    next(error);
  }
};