/**
 * File Upload Middleware
 * Multer configuration for handling file uploads
 */
import multer from 'multer';
import { Request } from 'express';
/**
 * Document upload middleware
 * Configured for single file uploads with validation
 */
export declare const documentUpload: multer.Multer;
/**
 * Multi-document upload middleware
 * For bulk uploads (up to 10 files)
 */
export declare const multiDocumentUpload: multer.Multer;
export declare const imageUpload: multer.Multer;
/**
 * Error handler for multer errors
 * Use as middleware after multer to catch and format errors
 */
export declare const handleMulterError: (err: Error, _req: Request, res: import("express").Response, next: import("express").NextFunction) => void;
declare const _default: {
    documentUpload: multer.Multer;
    multiDocumentUpload: multer.Multer;
    imageUpload: multer.Multer;
    handleMulterError: (err: Error, _req: Request, res: import("express").Response, next: import("express").NextFunction) => void;
};
export default _default;
//# sourceMappingURL=upload.d.ts.map