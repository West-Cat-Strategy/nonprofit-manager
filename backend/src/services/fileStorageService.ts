/**
 * File Storage Service
 * Abstract file storage with local filesystem implementation
 * Can be extended to support S3, Azure Blob, etc.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UploadResult {
  fileName: string;
  filePath: string;
  fileSize: number;
}

export interface FileStorageConfig {
  baseUploadDir: string;
}

const DEFAULT_CONFIG: FileStorageConfig = {
  baseUploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
};

const resolveBaseDir = (baseDir: string): string => path.resolve(baseDir);

const assertPathWithinBase = (baseDir: string, candidatePath: string): string => {
  const resolvedBase = resolveBaseDir(baseDir);
  const resolvedCandidate = path.resolve(candidatePath);
  const relative = path.relative(resolvedBase, resolvedCandidate);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid file path: outside upload directory');
  }

  return resolvedCandidate;
};

/**
 * Ensure directory exists, creating it if necessary
 */
const ensureDir = async (dirPath: string): Promise<void> => {
  await fs.promises.mkdir(dirPath, { recursive: true });
};

/**
 * Generate a unique filename with UUID prefix
 */
const generateUniqueFileName = (originalName: string): string => {
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Sanitize filename
    .substring(0, 50); // Limit length
  return `${crypto.randomUUID()}-${baseName}${ext}`;
};

/**
 * Upload a file to local storage
 * @param file - Express.Multer.File object from multer
 * @param subPath - Subdirectory path (e.g., 'documents/contactId')
 * @returns Upload result with file details
 */
export const uploadFile = async (
  file: Express.Multer.File,
  subPath: string,
  config: FileStorageConfig = DEFAULT_CONFIG
): Promise<UploadResult> => {
  const normalizedSubPath = subPath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join('/');

  if (!normalizedSubPath || normalizedSubPath.includes('..')) {
    throw new Error('Invalid upload path');
  }

  const uniqueFileName = generateUniqueFileName(file.originalname);
  const targetDir = assertPathWithinBase(config.baseUploadDir, path.join(config.baseUploadDir, normalizedSubPath));
  const targetPath = path.join(targetDir, uniqueFileName);
  assertPathWithinBase(config.baseUploadDir, targetPath);

  // Ensure target directory exists
  await ensureDir(targetDir);

  // Move file from temp location to target (if using memoryStorage, write buffer)
  if (file.buffer) {
    await fs.promises.writeFile(targetPath, file.buffer);
  } else if (file.path) {
    await fs.promises.rename(file.path, targetPath);
  } else {
    throw new Error('Invalid file object: no buffer or path');
  }

  // Store relative path from uploads root for database
  const relativePath = path.posix.join(normalizedSubPath, uniqueFileName);

  return {
    fileName: uniqueFileName,
    filePath: relativePath,
    fileSize: file.size,
  };
};

/**
 * Delete a file from storage
 * @param filePath - Relative path from uploads directory
 */
export const deleteFile = async (
  filePath: string,
  config: FileStorageConfig = DEFAULT_CONFIG
): Promise<void> => {
  const fullPath = assertPathWithinBase(config.baseUploadDir, path.join(config.baseUploadDir, filePath));

  try {
    await fs.promises.unlink(fullPath);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
};

/**
 * Get the full filesystem path for a file
 * @param filePath - Relative path from uploads directory
 */
export const getFullPath = (
  filePath: string,
  config: FileStorageConfig = DEFAULT_CONFIG
): string => {
  return assertPathWithinBase(config.baseUploadDir, path.join(config.baseUploadDir, filePath));
};

/**
 * Check if a file exists
 * @param filePath - Relative path from uploads directory
 */
export const fileExists = async (
  filePath: string,
  config: FileStorageConfig = DEFAULT_CONFIG
): Promise<boolean> => {
  try {
    const fullPath = assertPathWithinBase(config.baseUploadDir, path.join(config.baseUploadDir, filePath));
    await fs.promises.access(fullPath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get file stats asynchronously
 * @param filePath - Relative path from uploads directory
 */
export const getFileStats = async (
  filePath: string,
  config: FileStorageConfig = DEFAULT_CONFIG
): Promise<fs.Stats | null> => {
  try {
    const fullPath = assertPathWithinBase(config.baseUploadDir, path.join(config.baseUploadDir, filePath));
    return await fs.promises.stat(fullPath);
  } catch {
    return null;
  }
};

/**
 * Allowed MIME types for document uploads
 */
export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Validate file type
 */
export const isValidFileType = (mimeType: string): boolean => {
  return ALLOWED_MIME_TYPES.includes(mimeType);
};

export default {
  uploadFile,
  deleteFile,
  getFullPath,
  fileExists,
  getFileStats,
  isValidFileType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
