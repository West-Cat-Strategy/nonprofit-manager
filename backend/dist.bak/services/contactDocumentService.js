"use strict";
/**
 * Contact Document Service
 * Handles CRUD operations for contact documents
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocumentsByContact = getDocumentsByContact;
exports.getDocumentsByCase = getDocumentsByCase;
exports.getDocumentById = getDocumentById;
exports.getDocumentByIdWithScope = getDocumentByIdWithScope;
exports.createDocument = createDocument;
exports.updateDocument = updateDocument;
exports.deleteDocument = deleteDocument;
exports.hardDeleteDocument = hardDeleteDocument;
exports.getDocumentFilePath = getDocumentFilePath;
exports.getDocumentCount = getDocumentCount;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const fileStorageService_1 = require("./fileStorageService");
/**
 * Get all documents for a contact
 */
async function getDocumentsByContact(contactId) {
    try {
        const result = await database_1.default.query(`
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
      `, [contactId]);
        return result.rows;
    }
    catch (error) {
        logger_1.logger.error('Error getting contact documents:', error);
        throw new Error('Failed to retrieve contact documents');
    }
}
/**
 * Get documents by case ID
 */
async function getDocumentsByCase(caseId) {
    try {
        const result = await database_1.default.query(`
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
      `, [caseId]);
        return result.rows;
    }
    catch (error) {
        logger_1.logger.error('Error getting documents by case ID:', error);
        throw new Error('Failed to retrieve documents');
    }
}
/**
 * Get a single document by ID
 */
async function getDocumentById(documentId) {
    try {
        const result = await database_1.default.query(`
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
      `, [documentId]);
        return result.rows[0] || null;
    }
    catch (error) {
        logger_1.logger.error('Error getting document by ID:', error);
        throw new Error('Failed to retrieve document');
    }
}
/**
 * Get a single document by ID with data scope filtering
 */
async function getDocumentByIdWithScope(documentId, scope) {
    try {
        const conditions = ['cd.id = $1'];
        const values = [documentId];
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
        const result = await database_1.default.query(`
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
      `, values);
        return result.rows[0] || null;
    }
    catch (error) {
        logger_1.logger.error('Error getting document by ID with scope:', error);
        throw new Error('Failed to retrieve document');
    }
}
/**
 * Create a new document record and upload file
 */
async function createDocument(contactId, file, data, userId) {
    try {
        // Upload file to storage
        const uploadResult = await (0, fileStorageService_1.uploadFile)(file, `documents/${contactId}`);
        // Create database record
        const result = await database_1.default.query(`
      INSERT INTO contact_documents (
        contact_id, case_id, file_name, original_name, file_path,
        file_size, mime_type, document_type, title, description, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `, [
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
            userId,
        ]);
        logger_1.logger.info(`Document uploaded for contact ${contactId}: ${file.originalname}`);
        return result.rows[0];
    }
    catch (error) {
        logger_1.logger.error('Error creating document:', error);
        throw new Error('Failed to upload document');
    }
}
/**
 * Update document metadata
 */
async function updateDocument(documentId, data) {
    try {
        const fields = [];
        const values = [];
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
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        fields.push(`updated_at = NOW()`);
        values.push(documentId);
        const result = await database_1.default.query(`UPDATE contact_documents SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        if (result.rows.length === 0) {
            return null;
        }
        logger_1.logger.info(`Document metadata updated: ${documentId}`);
        return result.rows[0];
    }
    catch (error) {
        logger_1.logger.error('Error updating document:', error);
        throw new Error('Failed to update document');
    }
}
/**
 * Soft delete a document (also removes file from storage)
 */
async function deleteDocument(documentId) {
    try {
        // Get document to find file path
        const doc = await getDocumentById(documentId);
        if (!doc) {
            return false;
        }
        // Soft delete in database
        const result = await database_1.default.query(`UPDATE contact_documents SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`, [documentId]);
        if (result.rows.length === 0) {
            return false;
        }
        // Delete file from storage
        try {
            await (0, fileStorageService_1.deleteFile)(doc.file_path);
            logger_1.logger.info(`Document file deleted: ${doc.file_path}`);
        }
        catch (fileError) {
            logger_1.logger.warn(`Could not delete file ${doc.file_path}:`, fileError);
            // Continue even if file deletion fails - record is already soft-deleted
        }
        logger_1.logger.info(`Document soft-deleted: ${documentId}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error deleting document:', error);
        throw new Error('Failed to delete document');
    }
}
/**
 * Hard delete a document (permanent removal)
 */
async function hardDeleteDocument(documentId) {
    try {
        // Get document to find file path
        const doc = await getDocumentById(documentId);
        if (!doc) {
            return false;
        }
        // Delete from database
        const result = await database_1.default.query(`DELETE FROM contact_documents WHERE id = $1 RETURNING id`, [documentId]);
        if (result.rows.length === 0) {
            return false;
        }
        // Delete file from storage
        try {
            await (0, fileStorageService_1.deleteFile)(doc.file_path);
        }
        catch (fileError) {
            logger_1.logger.warn(`Could not delete file ${doc.file_path}:`, fileError);
        }
        logger_1.logger.info(`Document permanently deleted: ${documentId}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error hard deleting document:', error);
        throw new Error('Failed to delete document');
    }
}
/**
 * Get full file path for download
 */
function getDocumentFilePath(document) {
    if (!(0, fileStorageService_1.fileExists)(document.file_path)) {
        logger_1.logger.warn(`Document file not found: ${document.file_path}`);
        return null;
    }
    return (0, fileStorageService_1.getFullPath)(document.file_path);
}
/**
 * Get document count for a contact
 */
async function getDocumentCount(contactId) {
    try {
        const result = await database_1.default.query(`SELECT COUNT(*) as count FROM contact_documents WHERE contact_id = $1 AND is_active = true`, [contactId]);
        return parseInt(result.rows[0].count, 10);
    }
    catch (error) {
        logger_1.logger.error('Error getting document count:', error);
        throw new Error('Failed to get document count');
    }
}
//# sourceMappingURL=contactDocumentService.js.map