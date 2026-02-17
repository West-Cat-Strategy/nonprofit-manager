"use strict";
/**
 * Contact Documents Controller
 * Handles HTTP requests for contact document uploads
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.updateDocument = exports.uploadDocument = exports.downloadDocument = exports.getDocumentById = exports.getCaseDocuments = exports.getContactDocuments = void 0;
const database_1 = __importDefault(require("../config/database"));
const documentService = __importStar(require("../services/contactDocumentService"));
const contactService_1 = require("../services/contactService");
const contactService = new contactService_1.ContactService(database_1.default);
/**
 * GET /api/contacts/:contactId/documents
 * Get all documents for a contact
 */
const getContactDocuments = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const scope = req.dataScope?.filter;
        if (scope) {
            const scopedContact = await contactService.getContactByIdWithScope(contactId, scope);
            if (!scopedContact) {
                res.status(404).json({ error: 'Contact not found' });
                return;
            }
        }
        const documents = await documentService.getDocumentsByContact(contactId);
        res.json(documents);
    }
    catch (error) {
        next(error);
    }
};
exports.getContactDocuments = getContactDocuments;
/**
 * GET /api/cases/:caseId/documents
 * Get all documents for a case
 */
const getCaseDocuments = async (req, res, next) => {
    try {
        const { id } = req.params;
        const documents = await documentService.getDocumentsByCase(id);
        res.json(documents);
    }
    catch (error) {
        next(error);
    }
};
exports.getCaseDocuments = getCaseDocuments;
/**
 * GET /api/contacts/documents/:documentId
 * Get a single document by ID
 */
const getDocumentById = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const scope = req.dataScope?.filter;
        const document = scope
            ? await documentService.getDocumentByIdWithScope(documentId, scope)
            : await documentService.getDocumentById(documentId);
        if (!document) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        res.json(document);
    }
    catch (error) {
        next(error);
    }
};
exports.getDocumentById = getDocumentById;
/**
 * GET /api/contacts/documents/:documentId/download
 * Download a document file
 */
const downloadDocument = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const scope = req.dataScope?.filter;
        const document = scope
            ? await documentService.getDocumentByIdWithScope(documentId, scope)
            : await documentService.getDocumentById(documentId);
        if (!document || !document.is_active) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        const filePath = documentService.getDocumentFilePath(document);
        if (!filePath) {
            res.status(404).json({ error: 'Document file not found' });
            return;
        }
        // Set appropriate headers for download
        res.setHeader('Content-Type', document.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.original_name)}"`);
        res.setHeader('Content-Length', document.file_size);
        // Send file
        res.sendFile(filePath);
    }
    catch (error) {
        next(error);
    }
};
exports.downloadDocument = downloadDocument;
/**
 * POST /api/contacts/:contactId/documents
 * Upload a new document for a contact
 */
const uploadDocument = async (req, res, next) => {
    try {
        const { contactId } = req.params;
        const userId = req.user.id;
        const file = req.file;
        const scope = req.dataScope?.filter;
        if (scope) {
            const scopedContact = await contactService.getContactByIdWithScope(contactId, scope);
            if (!scopedContact) {
                res.status(404).json({ error: 'Contact not found' });
                return;
            }
        }
        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const data = {
            case_id: req.body.case_id,
            document_type: req.body.document_type,
            title: req.body.title,
            description: req.body.description,
        };
        const document = await documentService.createDocument(contactId, file, data, userId);
        res.status(201).json(document);
    }
    catch (error) {
        next(error);
    }
};
exports.uploadDocument = uploadDocument;
/**
 * PUT /api/contacts/documents/:documentId
 * Update document metadata
 */
const updateDocument = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const scope = req.dataScope?.filter;
        if (scope) {
            const scopedDoc = await documentService.getDocumentByIdWithScope(documentId, scope);
            if (!scopedDoc) {
                res.status(404).json({ error: 'Document not found' });
                return;
            }
        }
        const document = await documentService.updateDocument(documentId, req.body);
        if (!document) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        res.json(document);
    }
    catch (error) {
        next(error);
    }
};
exports.updateDocument = updateDocument;
/**
 * DELETE /api/contacts/documents/:documentId
 * Delete a document (soft delete)
 */
const deleteDocument = async (req, res, next) => {
    try {
        const { documentId } = req.params;
        const scope = req.dataScope?.filter;
        if (scope) {
            const scopedDoc = await documentService.getDocumentByIdWithScope(documentId, scope);
            if (!scopedDoc) {
                res.status(404).json({ error: 'Document not found' });
                return;
            }
        }
        const success = await documentService.deleteDocument(documentId);
        if (!success) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteDocument = deleteDocument;
//# sourceMappingURL=contactDocumentsController.js.map