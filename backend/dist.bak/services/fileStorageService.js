"use strict";
/**
 * File Storage Service
 * Abstract file storage with local filesystem implementation
 * Can be extended to support S3, Azure Blob, etc.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidFileType = exports.MAX_FILE_SIZE = exports.ALLOWED_MIME_TYPES = exports.getFileStats = exports.fileExists = exports.getFullPath = exports.deleteFile = exports.uploadFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const DEFAULT_CONFIG = {
    baseUploadDir: process.env.UPLOAD_DIR || path_1.default.join(__dirname, '../../uploads'),
};
/**
 * Ensure directory exists, creating it if necessary
 */
const ensureDir = async (dirPath) => {
    await fs_1.default.promises.mkdir(dirPath, { recursive: true });
};
/**
 * Generate a unique filename with UUID prefix
 */
const generateUniqueFileName = (originalName) => {
    const ext = path_1.default.extname(originalName);
    const baseName = path_1.default.basename(originalName, ext)
        .replace(/[^a-zA-Z0-9-_]/g, '_') // Sanitize filename
        .substring(0, 50); // Limit length
    return `${crypto_1.default.randomUUID()}-${baseName}${ext}`;
};
/**
 * Upload a file to local storage
 * @param file - Express.Multer.File object from multer
 * @param subPath - Subdirectory path (e.g., 'documents/contactId')
 * @returns Upload result with file details
 */
const uploadFile = async (file, subPath, config = DEFAULT_CONFIG) => {
    const uniqueFileName = generateUniqueFileName(file.originalname);
    const targetDir = path_1.default.join(config.baseUploadDir, subPath);
    const targetPath = path_1.default.join(targetDir, uniqueFileName);
    // Ensure target directory exists
    await ensureDir(targetDir);
    // Move file from temp location to target (if using memoryStorage, write buffer)
    if (file.buffer) {
        await fs_1.default.promises.writeFile(targetPath, file.buffer);
    }
    else if (file.path) {
        await fs_1.default.promises.rename(file.path, targetPath);
    }
    else {
        throw new Error('Invalid file object: no buffer or path');
    }
    // Store relative path from uploads root for database
    const relativePath = path_1.default.join(subPath, uniqueFileName);
    return {
        fileName: uniqueFileName,
        filePath: relativePath,
        fileSize: file.size,
    };
};
exports.uploadFile = uploadFile;
/**
 * Delete a file from storage
 * @param filePath - Relative path from uploads directory
 */
const deleteFile = async (filePath, config = DEFAULT_CONFIG) => {
    const fullPath = path_1.default.join(config.baseUploadDir, filePath);
    try {
        await fs_1.default.promises.unlink(fullPath);
    }
    catch (error) {
        if (error?.code !== 'ENOENT') {
            throw error;
        }
    }
};
exports.deleteFile = deleteFile;
/**
 * Get the full filesystem path for a file
 * @param filePath - Relative path from uploads directory
 */
const getFullPath = (filePath, config = DEFAULT_CONFIG) => {
    return path_1.default.join(config.baseUploadDir, filePath);
};
exports.getFullPath = getFullPath;
/**
 * Check if a file exists
 * @param filePath - Relative path from uploads directory
 */
const fileExists = (filePath, config = DEFAULT_CONFIG) => {
    const fullPath = path_1.default.join(config.baseUploadDir, filePath);
    return fs_1.default.existsSync(fullPath);
};
exports.fileExists = fileExists;
/**
 * Get file stats
 * @param filePath - Relative path from uploads directory
 */
const getFileStats = (filePath, config = DEFAULT_CONFIG) => {
    const fullPath = path_1.default.join(config.baseUploadDir, filePath);
    if (fs_1.default.existsSync(fullPath)) {
        return fs_1.default.statSync(fullPath);
    }
    return null;
};
exports.getFileStats = getFileStats;
/**
 * Allowed MIME types for document uploads
 */
exports.ALLOWED_MIME_TYPES = [
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
exports.MAX_FILE_SIZE = 10 * 1024 * 1024;
/**
 * Validate file type
 */
const isValidFileType = (mimeType) => {
    return exports.ALLOWED_MIME_TYPES.includes(mimeType);
};
exports.isValidFileType = isValidFileType;
exports.default = {
    uploadFile: exports.uploadFile,
    deleteFile: exports.deleteFile,
    getFullPath: exports.getFullPath,
    fileExists: exports.fileExists,
    getFileStats: exports.getFileStats,
    isValidFileType: exports.isValidFileType,
    ALLOWED_MIME_TYPES: exports.ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE: exports.MAX_FILE_SIZE,
};
//# sourceMappingURL=fileStorageService.js.map