/**
 * File Upload Middleware
 * Multer configuration for handling file uploads
 */

import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../services/fileStorageService';

/**
 * File filter to validate uploaded file types
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

/**
 * Memory storage configuration
 * Files are stored in memory as Buffer objects
 * This allows us to process and save them with our fileStorageService
 */
const memoryStorage = multer.memoryStorage();

/**
 * Document upload middleware
 * Configured for single file uploads with validation
 */
export const documentUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Single file upload
  },
  fileFilter,
});

/**
 * Multi-document upload middleware
 * For bulk uploads (up to 10 files)
 */
export const multiDocumentUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter,
});

/**
 * Image upload middleware
 * Stricter validation for image-only uploads
 */
const imageFileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  const imageMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (imageMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const imageUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
    files: 1,
  },
  fileFilter: imageFileFilter,
});

/**
 * Error handler for multer errors
 * Use as middleware after multer to catch and format errors
 */
export const handleMulterError = (
  err: Error,
  _req: Request,
  res: import('express').Response,
  next: import('express').NextFunction
): void => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
        return;
      case 'LIMIT_FILE_COUNT':
        res.status(400).json({ error: 'Too many files uploaded' });
        return;
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json({ error: 'Unexpected file field' });
        return;
      default:
        res.status(400).json({ error: err.message });
        return;
    }
  } else if (err.message.includes('Invalid file type')) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
};

export default {
  documentUpload,
  multiDocumentUpload,
  imageUpload,
  handleMulterError,
};
