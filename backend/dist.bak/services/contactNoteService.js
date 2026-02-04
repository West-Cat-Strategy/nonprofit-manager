"use strict";
/**
 * Contact Note Service
 * Handles CRUD operations for contact notes
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContactNotes = getContactNotes;
exports.getContactNoteById = getContactNoteById;
exports.createContactNote = createContactNote;
exports.updateContactNote = updateContactNote;
exports.deleteContactNote = deleteContactNote;
exports.getNotesByCaseId = getNotesByCaseId;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
/**
 * Get all notes for a contact
 */
async function getContactNotes(contactId) {
    try {
        const result = await database_1.default.query(`
      SELECT
        cn.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        c.case_number,
        c.title as case_title
      FROM contact_notes cn
      LEFT JOIN users u ON cn.created_by = u.id
      LEFT JOIN cases c ON cn.case_id = c.id
      WHERE cn.contact_id = $1
      ORDER BY cn.is_pinned DESC, cn.created_at DESC
      `, [contactId]);
        return result.rows;
    }
    catch (error) {
        logger_1.logger.error('Error getting contact notes:', error);
        throw new Error('Failed to retrieve contact notes');
    }
}
/**
 * Get a single note by ID
 */
async function getContactNoteById(noteId) {
    try {
        const result = await database_1.default.query(`
      SELECT
        cn.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        c.case_number,
        c.title as case_title
      FROM contact_notes cn
      LEFT JOIN users u ON cn.created_by = u.id
      LEFT JOIN cases c ON cn.case_id = c.id
      WHERE cn.id = $1
      `, [noteId]);
        return result.rows[0] || null;
    }
    catch (error) {
        logger_1.logger.error('Error getting contact note by ID:', error);
        throw new Error('Failed to retrieve contact note');
    }
}
/**
 * Create a new contact note
 */
async function createContactNote(contactId, data, userId) {
    try {
        const result = await database_1.default.query(`
      INSERT INTO contact_notes (
        contact_id, case_id, note_type, subject, content,
        is_internal, is_important, is_pinned, attachments, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `, [
            contactId,
            data.case_id || null,
            data.note_type || 'note',
            data.subject || null,
            data.content,
            data.is_internal || false,
            data.is_important || false,
            data.is_pinned || false,
            data.attachments ? JSON.stringify(data.attachments) : null,
            userId,
        ]);
        logger_1.logger.info(`Contact note created for contact ${contactId}`);
        return result.rows[0];
    }
    catch (error) {
        logger_1.logger.error('Error creating contact note:', error);
        throw new Error('Failed to create contact note');
    }
}
/**
 * Update a contact note
 */
async function updateContactNote(noteId, data) {
    try {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.note_type !== undefined) {
            fields.push(`note_type = $${paramIndex++}`);
            values.push(data.note_type);
        }
        if (data.subject !== undefined) {
            fields.push(`subject = $${paramIndex++}`);
            values.push(data.subject);
        }
        if (data.content !== undefined) {
            fields.push(`content = $${paramIndex++}`);
            values.push(data.content);
        }
        if (data.is_internal !== undefined) {
            fields.push(`is_internal = $${paramIndex++}`);
            values.push(data.is_internal);
        }
        if (data.is_important !== undefined) {
            fields.push(`is_important = $${paramIndex++}`);
            values.push(data.is_important);
        }
        if (data.is_pinned !== undefined) {
            fields.push(`is_pinned = $${paramIndex++}`);
            values.push(data.is_pinned);
        }
        if (data.attachments !== undefined) {
            fields.push(`attachments = $${paramIndex++}`);
            values.push(data.attachments ? JSON.stringify(data.attachments) : null);
        }
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        fields.push(`updated_at = NOW()`);
        values.push(noteId);
        const result = await database_1.default.query(`UPDATE contact_notes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`, values);
        if (result.rows.length === 0) {
            return null;
        }
        logger_1.logger.info(`Contact note updated: ${noteId}`);
        return result.rows[0];
    }
    catch (error) {
        logger_1.logger.error('Error updating contact note:', error);
        throw new Error('Failed to update contact note');
    }
}
/**
 * Delete a contact note
 */
async function deleteContactNote(noteId) {
    try {
        const result = await database_1.default.query(`DELETE FROM contact_notes WHERE id = $1 RETURNING id`, [noteId]);
        if (result.rows.length === 0) {
            return false;
        }
        logger_1.logger.info(`Contact note deleted: ${noteId}`);
        return true;
    }
    catch (error) {
        logger_1.logger.error('Error deleting contact note:', error);
        throw new Error('Failed to delete contact note');
    }
}
/**
 * Get notes by case ID (for showing contact notes related to a specific case)
 */
async function getNotesByCaseId(caseId) {
    try {
        const result = await database_1.default.query(`
      SELECT
        cn.*,
        u.first_name as created_by_first_name,
        u.last_name as created_by_last_name,
        ct.first_name as contact_first_name,
        ct.last_name as contact_last_name
      FROM contact_notes cn
      LEFT JOIN users u ON cn.created_by = u.id
      LEFT JOIN contacts ct ON cn.contact_id = ct.id
      WHERE cn.case_id = $1
      ORDER BY cn.created_at DESC
      `, [caseId]);
        return result.rows;
    }
    catch (error) {
        logger_1.logger.error('Error getting notes by case ID:', error);
        throw new Error('Failed to retrieve notes');
    }
}
//# sourceMappingURL=contactNoteService.js.map