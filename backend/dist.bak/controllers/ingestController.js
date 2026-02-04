"use strict";
/**
 * Ingest Controller
 * Endpoints for parsing uploaded data and suggesting schema mappings.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewText = exports.previewUpload = void 0;
const preview_1 = require("../ingest/preview");
const previewUpload = async (req, res, next) => {
    try {
        const file = req.file;
        if (!file || !file.buffer) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const sheetName = typeof req.body.sheet_name === 'string' ? req.body.sheet_name : undefined;
        const format = typeof req.body.format === 'string' ? req.body.format : undefined;
        const preview = (0, preview_1.ingestPreviewFromBuffer)({
            buffer: file.buffer,
            filename: file.originalname,
            mimeType: file.mimetype,
            format,
            sheetName,
            name: file.originalname,
        });
        res.json(preview);
    }
    catch (error) {
        next(error);
    }
};
exports.previewUpload = previewUpload;
const previewText = async (req, res, next) => {
    try {
        const { format, text, name } = req.body;
        const preview = format ? (0, preview_1.ingestPreviewFromText)({ format, text, name }) : (0, preview_1.ingestPreviewFromTextAuto)({ text, name });
        res.json(preview);
    }
    catch (error) {
        next(error);
    }
};
exports.previewText = previewText;
//# sourceMappingURL=ingestController.js.map