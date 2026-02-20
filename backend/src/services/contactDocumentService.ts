/**
 * Contact Document Service
 * Handles CRUD operations for contact documents
 */

import pool from '@config/database';
import { logger } from '@config/logger';
import {
  uploadFile,
  deleteFile,
  getFullPath,
  fileExists,
} from './fileStorageService';
import type {
  ContactDocument,
  CreateContactDocumentDTO,
  UpdateContactDocumentDTO,
} from '@app-types/contact';
import type { DataScopeFilter } from '@app-types/dataScope';

/**
 * Get all documents for a contact
 */
export async function getDocumentsByContact(contactId: string): Promise<ContactDocument[]> {
  try {
    const result = await pool.query(
      `
      SELECT
        cd.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        c.case_number,
        c.title as case_title
      FROM contact_documents cd
      LEFT JOIN users u ON cd.created_by = u.id
      LEFT JOIN cases c ON cd.case_id = c.id
      WHERE cd.contact_id = $1 AND cd.is_active = true
      ORDER BY cd.created_at DESC
      `,
      [contactId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting contact documents:', error);
    throw Object.assign(new Error('Failed to retrieve contact documents'), { cause: error });
  }
}

/**
 * Get documents by case ID
 */
export async function getDocumentsByCase(caseId: string): Promise<ContactDocument[]> {
  try {
    const result = await pool.query(
      `
      SELECT
        cd.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        ct.first_name as contact_first_name,
        ct.last_name as contact_last_name
      FROM contact_documents cd
      LEFT JOIN users u ON cd.created_by = u.id
      LEFT JOIN contacts ct ON cd.contact_id = ct.id
      WHERE cd.case_id = $1 AND cd.is_active = true
      ORDER BY cd.created_at DESC
      `,
      [caseId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting documents by case ID:', error);
    throw Object.assign(new Error('Failed to retrieve documents'), { cause: error });
  }
}

/**
 * Get a single document by ID
 */
export async function getDocumentById(documentId: string): Promise<ContactDocument | null> {
  try {
    const result = await pool.query(
      `
      SELECT
        cd.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        c.case_number,
        c.title as case_title
      FROM contact_documents cd
      LEFT JOIN users u ON cd.created_by = u.id
      LEFT JOIN cases c ON cd.case_id = c.id
      WHERE cd.id = $1
      `,
      [documentId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting document by ID:', error);
    throw Object.assign(new Error('Failed to retrieve document'), { cause: error });
  }
}

/**
 * Get a single document by ID with data scope filtering
 */
export async function getDocumentByIdWithScope(
  documentId: string,
  scope?: DataScopeFilter
): Promise<ContactDocument | null> {
  try {
    const conditions: string[] = ['cd.id = $1'];
    const values: Array<string | string[]> = [documentId];
    let paramIndex = 2;

    if (scope?.accountIds && scope.accountIds.length > 0) {
      conditions.push(`ct.account_id = ANY($${paramIndex}::uuid[])`);
      values.push(scope.accountIds);
      paramIndex++;
    }

    if (scope?.contactIds && scope.contactIds.length > 0) {
      conditions.push(`cd.contact_id = ANY($${paramIndex}::uuid[])`);
      values.push(scope.contactIds);
      paramIndex++;
    }

    if (scope?.createdByUserIds && scope.createdByUserIds.length > 0) {
      conditions.push(`cd.created_by = ANY($${paramIndex}::uuid[])`);
      values.push(scope.createdByUserIds);
      paramIndex++;
    }

    const result = await pool.query(
      `
      SELECT
        cd.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        c.case_number,
        c.title as case_title
      FROM contact_documents cd
      LEFT JOIN users u ON cd.created_by = u.id
      LEFT JOIN cases c ON cd.case_id = c.id
      LEFT JOIN contacts ct ON cd.contact_id = ct.id
      WHERE ${conditions.join(' AND ')}
      `,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting document by ID with scope:', error);
    throw Object.assign(new Error('Failed to retrieve document'), { cause: error });
  }
}

/**
 * Create a new document record and upload file
 */
export async function createDocument(
  contactId: string,
  file: Express.Multer.File,
  data: CreateContactDocumentDTO,
  userId: string
): Promise<ContactDocument> {
  try {
    // Upload file to storage
    const uploadResult = await uploadFile(file, `documents/${contactId}`);

    // Create database record
    const result = await pool.query(
      `
      INSERT INTO contact_documents (
        contact_id, case_id, file_name, original_name, file_path,
        file_size, mime_type, document_type, title, description,
        is_portal_visible, portal_visible_at, portal_visible_by, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
      `,
      [
        contactId,
        data.case_id || null,
        uploadResult.fileName,
        file.originalname,
        uploadResult.filePath,
        uploadResult.fileSize,
        file.mimetype,
        data.document_type || 'other',
        data.title || null,
        data.description || null,
        data.is_portal_visible || false,
        data.is_portal_visible ? new Date() : null,
        data.is_portal_visible ? userId : null,
        userId,
      ]
    );

    logger.info(`Document uploaded for contact ${contactId}: ${file.originalname}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating document:', error);
    throw Object.assign(new Error('Failed to upload document'), { cause: error });
  }
}

/**
 * Update document metadata
 */
export async function updateDocument(
  documentId: string,
  data: UpdateContactDocumentDTO,
  userId?: string
): Promise<ContactDocument | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.document_type !== undefined) {
      fields.push(`document_type = $${paramIndex++}`);
      values.push(data.document_type);
    }

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }

    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }

    if (data.is_portal_visible !== undefined) {
      fields.push(`is_portal_visible = $${paramIndex++}`);
      values.push(data.is_portal_visible);
      if (data.is_portal_visible) {
        fields.push(`portal_visible_at = COALESCE(portal_visible_at, NOW())`);
        if (userId) {
          fields.push(`portal_visible_by = $${paramIndex++}`);
          values.push(userId);
        }
      } else {
        fields.push(`portal_visible_at = NULL`);
        fields.push(`portal_visible_by = NULL`);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(documentId);

    const result = await pool.query(
      `UPDATE contact_documents SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Document metadata updated: ${documentId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating document:', error);
    throw Object.assign(new Error('Failed to update document'), { cause: error });
  }
}

/**
 * Soft delete a document (also removes file from storage)
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    // Get document to find file path
    const doc = await getDocumentById(documentId);
    if (!doc) {
      return false;
    }

    // Soft delete in database
    const result = await pool.query(
      `UPDATE contact_documents SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [documentId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    // Delete file from storage
    try {
      await deleteFile(doc.file_path);
      logger.info(`Document file deleted: ${doc.file_path}`);
    } catch (fileError) {
      logger.warn(`Could not delete file ${doc.file_path}:`, fileError);
      // Continue even if file deletion fails - record is already soft-deleted
    }

    logger.info(`Document soft-deleted: ${documentId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting document:', error);
    throw Object.assign(new Error('Failed to delete document'), { cause: error });
  }
}

/**
 * Hard delete a document (permanent removal)
 */
export async function hardDeleteDocument(documentId: string): Promise<boolean> {
  try {
    // Get document to find file path
    const doc = await getDocumentById(documentId);
    if (!doc) {
      return false;
    }

    // Delete from database
    const result = await pool.query(
      `DELETE FROM contact_documents WHERE id = $1 RETURNING id`,
      [documentId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    // Delete file from storage
    try {
      await deleteFile(doc.file_path);
    } catch (fileError) {
      logger.warn(`Could not delete file ${doc.file_path}:`, fileError);
    }

    logger.info(`Document permanently deleted: ${documentId}`);
    return true;
  } catch (error) {
    logger.error('Error hard deleting document:', error);
    throw Object.assign(new Error('Failed to delete document'), { cause: error });
  }
}

/**
 * Get full file path for download
 */
export function getDocumentFilePath(document: ContactDocument): string | null {
  if (!fileExists(document.file_path)) {
    logger.warn(`Document file not found: ${document.file_path}`);
    return null;
  }
  return getFullPath(document.file_path);
}

/**
 * Get document count for a contact
 */
export async function getDocumentCount(contactId: string): Promise<number> {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM contact_documents WHERE contact_id = $1 AND is_active = true`,
      [contactId]
    );
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    logger.error('Error getting document count:', error);
    throw Object.assign(new Error('Failed to get document count'), { cause: error });
  }
}
