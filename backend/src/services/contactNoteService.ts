/**
 * Contact Note Service
 * Handles CRUD operations for contact notes
 */

import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  ContactNote,
  CreateContactNoteDTO,
  UpdateContactNoteDTO,
} from '@app-types/contact';

/**
 * Get all notes for a contact with pagination
 * @param contactId - Contact ID
 * @param limit - Maximum number of notes to return (default: 50)
 * @param offset - Number of notes to skip (default: 0)
 */
export async function getContactNotes(
  contactId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ notes: ContactNote[]; total: number }> {
  try {
    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM contact_notes WHERE contact_id = $1',
      [contactId]
    );
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Get paginated notes
    const result = await pool.query(
      `
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
      LIMIT $2 OFFSET $3
      `,
      [contactId, limit, offset]
    );

    return { notes: result.rows, total };
  } catch (error) {
    logger.error('Error getting contact notes:', error);
    throw Object.assign(new Error('Failed to retrieve contact notes'), { cause: error });
  }
}

/**
 * Get a single note by ID
 */
export async function getContactNoteById(noteId: string): Promise<ContactNote | null> {
  try {
    const result = await pool.query(
      `
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
      `,
      [noteId]
    );

    return result.rows[0] || null;
  } catch (error) {
    logger.error('Error getting contact note by ID:', error);
    throw Object.assign(new Error('Failed to retrieve contact note'), { cause: error });
  }
}

/**
 * Create a new contact note
 */
export async function createContactNote(
  contactId: string,
  data: CreateContactNoteDTO,
  userId: string
): Promise<ContactNote> {
  try {
    const result = await pool.query(
      `
      INSERT INTO contact_notes (
        contact_id, case_id, note_type, subject, content,
        is_internal, is_important, is_pinned, is_alert, attachments, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        contactId,
        data.case_id || null,
        data.note_type || 'note',
        data.subject || null,
        data.content,
        data.is_internal || false,
        data.is_important || false,
        data.is_pinned || false,
        data.is_alert || false,
        data.attachments ? JSON.stringify(data.attachments) : null,
        userId,
      ]
    );

    logger.info(`Contact note created for contact ${contactId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error creating contact note:', error);
    throw Object.assign(new Error('Failed to create contact note'), { cause: error });
  }
}

/**
 * Update a contact note
 */
export async function updateContactNote(
  noteId: string,
  data: UpdateContactNoteDTO
): Promise<ContactNote | null> {
  try {
    const fields: string[] = [];
    const values: any[] = [];
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

    if (data.is_alert !== undefined) {
      fields.push(`is_alert = $${paramIndex++}`);
      values.push(data.is_alert);
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

    const result = await pool.query(
      `UPDATE contact_notes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Contact note updated: ${noteId}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Error updating contact note:', error);
    throw Object.assign(new Error('Failed to update contact note'), { cause: error });
  }
}

/**
 * Delete a contact note
 */
export async function deleteContactNote(noteId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM contact_notes WHERE id = $1 RETURNING id`,
      [noteId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    logger.info(`Contact note deleted: ${noteId}`);
    return true;
  } catch (error) {
    logger.error('Error deleting contact note:', error);
    throw Object.assign(new Error('Failed to delete contact note'), { cause: error });
  }
}

/**
 * Get notes by case ID (for showing contact notes related to a specific case)
 */
export async function getNotesByCaseId(caseId: string): Promise<ContactNote[]> {
  try {
    const result = await pool.query(
      `
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
      `,
      [caseId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting notes by case ID:', error);
    throw Object.assign(new Error('Failed to retrieve notes'), { cause: error });
  }
}
