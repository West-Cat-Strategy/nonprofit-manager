/**
 * File Storage Service
 * Abstract file storage with local filesystem implementation
 * Can be extended to support S3, Azure Blob, etc.
 */
import fs from 'fs';
export interface UploadResult {
    fileName: string;
    filePath: string;
    fileSize: number;
}
export interface FileStorageConfig {
    baseUploadDir: string;
}
/**
 * Upload a file to local storage
 * @param file - Express.Multer.File object from multer
 * @param subPath - Subdirectory path (e.g., 'documents/contactId')
 * @returns Upload result with file details
 */
export declare const uploadFile: (file: Express.Multer.File, subPath: string, config?: FileStorageConfig) => Promise<UploadResult>;
/**
 * Delete a file from storage
 * @param filePath - Relative path from uploads directory
 */
export declare const deleteFile: (filePath: string, config?: FileStorageConfig) => Promise<void>;
/**
 * Get the full filesystem path for a file
 * @param filePath - Relative path from uploads directory
 */
export declare const getFullPath: (filePath: string, config?: FileStorageConfig) => string;
/**
 * Check if a file exists
 * @param filePath - Relative path from uploads directory
 */
export declare const fileExists: (filePath: string, config?: FileStorageConfig) => boolean;
/**
 * Get file stats
 * @param filePath - Relative path from uploads directory
 */
export declare const getFileStats: (filePath: string, config?: FileStorageConfig) => fs.Stats | null;
/**
 * Allowed MIME types for document uploads
 */
export declare const ALLOWED_MIME_TYPES: string[];
/**
 * Maximum file size in bytes (10MB)
 */
export declare const MAX_FILE_SIZE: number;
/**
 * Validate file type
 */
export declare const isValidFileType: (mimeType: string) => boolean;
declare const _default: {
    uploadFile: (file: Express.Multer.File, subPath: string, config?: FileStorageConfig) => Promise<UploadResult>;
    deleteFile: (filePath: string, config?: FileStorageConfig) => Promise<void>;
    getFullPath: (filePath: string, config?: FileStorageConfig) => string;
    fileExists: (filePath: string, config?: FileStorageConfig) => boolean;
    getFileStats: (filePath: string, config?: FileStorageConfig) => fs.Stats | null;
    isValidFileType: (mimeType: string) => boolean;
    ALLOWED_MIME_TYPES: string[];
    MAX_FILE_SIZE: number;
};
export default _default;
//# sourceMappingURL=fileStorageService.d.ts.map