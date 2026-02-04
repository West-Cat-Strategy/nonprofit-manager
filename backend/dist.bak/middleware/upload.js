"use strict";
/**
 * File Upload Middleware
 * Multer configuration for handling file uploads
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMulterError = exports.imageUpload = exports.multiDocumentUpload = exports.documentUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const fileStorageService_1 = require("../services/fileStorageService");
/**
 * File filter to validate uploaded file types
 */
const fileFilter = (_req, file, cb) => {
    if (fileStorageService_1.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error(`Invalid file type. Allowed types: ${fileStorageService_1.ALLOWED_MIME_TYPES.join(', ')}`));
    }
};
/**
 * Memory storage configuration
 * Files are stored in memory as Buffer objects
 * This allows us to process and save them with our fileStorageService
 */
const memoryStorage = multer_1.default.memoryStorage();
/**
 * Document upload middleware
 * Configured for single file uploads with validation
 */
exports.documentUpload = (0, multer_1.default)({
    storage: memoryStorage,
    limits: {
        fileSize: fileStorageService_1.MAX_FILE_SIZE,
        files: 1, // Single file upload
    },
    fileFilter,
});
/**
 * Multi-document upload middleware
 * For bulk uploads (up to 10 files)
 */
exports.multiDocumentUpload = (0, multer_1.default)({
    storage: memoryStorage,
    limits: {
        fileSize: fileStorageService_1.MAX_FILE_SIZE,
        files: 10,
    },
    fileFilter,
});
/**
 * Image upload middleware
 * Stricter validation for image-only uploads
 */
const imageFileFilter = (_req, file, cb) => {
    const imageMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
    ];
    if (imageMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Only image files are allowed'));
    }
};
exports.imageUpload = (0, multer_1.default)({
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
const handleMulterError = (err, _req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        // Multer-specific errors
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                res.status(400).json({
                    error: `File too large. Maximum size is ${fileStorageService_1.MAX_FILE_SIZE / (1024 * 1024)}MB`,
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
    }
    else if (err.message.includes('Invalid file type')) {
        res.status(400).json({ error: err.message });
        return;
    }
    next(err);
};
exports.handleMulterError = handleMulterError;
exports.default = {
    documentUpload: exports.documentUpload,
    multiDocumentUpload: exports.multiDocumentUpload,
    imageUpload: exports.imageUpload,
    handleMulterError: exports.handleMulterError,
};
//# sourceMappingURL=upload.js.map