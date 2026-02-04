/**
 * Contact Documents Controller
 * Handles HTTP requests for contact document uploads
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';
import * as documentService from '../services/contactDocumentService';
import { ContactService } from '../services/contactService';
import type { DataScopeFilter } from '../types/dataScope';

const contactService = new ContactService(pool);

/**
 * GET /api/contacts/:contactId/documents
 * Get all documents for a contact
 */
export const getContactDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    if (scope) {
      const scopedContact = await contactService.getContactByIdWithScope(contactId, scope);
      if (!scopedContact) {
        res.status(404).json({ error: 'Contact not found' });
        return;
      }
    }
    const documents = await documentService.getDocumentsByContact(contactId);
    res.json(documents);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/cases/:caseId/documents
 * Get all documents for a case
 */
export const getCaseDocuments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const documents = await documentService.getDocumentsByCase(id);
    res.json(documents);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contacts/documents/:documentId
 * Get a single document by ID
 */
export const getDocumentById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { documentId } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
    const document = scope
      ? await documentService.getDocumentByIdWithScope(documentId, scope)
      : await documentService.getDocumentById(documentId);

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    res.json(document);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/contacts/documents/:documentId/download
 * Download a document file
 */
export const downloadDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { documentId } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
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
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.original_name)}"`
    );
    res.setHeader('Content-Length', document.file_size);

    // Send file
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/contacts/:contactId/documents
 * Upload a new document for a contact
 */
export const uploadDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { contactId } = req.params;
    const userId = req.user!.id;
    const file = req.file;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;

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
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/contacts/documents/:documentId
 * Update document metadata
 */
export const updateDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { documentId } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
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
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/contacts/documents/:documentId
 * Delete a document (soft delete)
 */
export const deleteDocument = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { documentId } = req.params;
    const scope = req.dataScope?.filter as DataScopeFilter | undefined;
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
  } catch (error) {
    next(error);
  }
};
