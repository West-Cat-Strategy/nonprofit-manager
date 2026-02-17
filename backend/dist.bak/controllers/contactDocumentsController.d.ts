/**
 * Contact Documents Controller
 * Handles HTTP requests for contact document uploads
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * GET /api/contacts/:contactId/documents
 * Get all documents for a contact
 */
export declare const getContactDocuments: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/cases/:caseId/documents
 * Get all documents for a case
 */
export declare const getCaseDocuments: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/contacts/documents/:documentId
 * Get a single document by ID
 */
export declare const getDocumentById: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /api/contacts/documents/:documentId/download
 * Download a document file
 */
export declare const downloadDocument: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /api/contacts/:contactId/documents
 * Upload a new document for a contact
 */
export declare const uploadDocument: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * PUT /api/contacts/documents/:documentId
 * Update document metadata
 */
export declare const updateDocument: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
/**
 * DELETE /api/contacts/documents/:documentId
 * Delete a document (soft delete)
 */
export declare const deleteDocument: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=contactDocumentsController.d.ts.map