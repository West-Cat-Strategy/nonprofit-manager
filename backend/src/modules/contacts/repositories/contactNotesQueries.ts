/**
 * Module-owned contact note persistence and hydration helpers.
 * Legacy `@services/contactNoteService` re-exports from this file as a thin wrapper.
 */

import { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import * as contactNoteOutcomeImpactService from '../services/contactNoteOutcomeImpactService';
import type {
  ContactNote,
  CreateContactNoteDTO,
  UpdateContactNoteDTO,
} from '@app-types/contact';

type PgExecutor = Pool | PoolClient;

const CONTACT_NOTE_OUTCOME_IMPACTS_JSON = `
  COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', cnoi.id,
        'interaction_id', cnoi.interaction_id,
        'outcome_definition_id', cnoi.outcome_definition_id,
        'impact', cnoi.impact,
        'attribution', cnoi.attribution,
        'intensity', cnoi.intensity,
        'evidence_note', cnoi.evidence_note,
        'created_by_user_id', cnoi.created_by_user_id,
        'created_at', cnoi.created_at,
        'updated_at', cnoi.updated_at,
        'outcome_definition', json_build_object(
          'id', od.id,
          'key', od.key,
          'name', od.name,
          'description', od.description,
          'category', od.category,
          'is_active', od.is_active,
          'is_reportable', od.is_reportable,
          'sort_order', od.sort_order,
          'created_at', od.created_at,
          'updated_at', od.updated_at
        )
      )
      ORDER BY od.sort_order ASC, od.name ASC
    )
    FROM contact_note_outcome_impacts cnoi
    INNER JOIN outcome_definitions od
      ON od.id = cnoi.outcome_definition_id
    WHERE cnoi.interaction_id = cn.id
  ), '[]'::json) AS outcome_impacts
`;

const CONTACT_NOTE_SELECT_WITH_OUTCOMES = `
  SELECT
    cn.*,
    u.first_name AS created_by_first_name,
    u.last_name AS created_by_last_name,
    c.case_number,
    c.title AS case_title,
    ${CONTACT_NOTE_OUTCOME_IMPACTS_JSON}
  FROM contact_notes cn
  LEFT JOIN users u ON cn.created_by = u.id
  LEFT JOIN cases c ON cn.case_id = c.id
`;

const CONTACT_NOTE_CASE_SELECT_WITH_OUTCOMES = `
  SELECT
    cn.*,
    u.first_name AS created_by_first_name,
    u.last_name AS created_by_last_name,
    ct.first_name AS contact_first_name,
    ct.last_name AS contact_last_name,
    ${CONTACT_NOTE_OUTCOME_IMPACTS_JSON}
  FROM contact_notes cn
  LEFT JOIN users u ON cn.created_by = u.id
  LEFT JOIN contacts ct ON cn.contact_id = ct.id
`;

const getContactNoteByIdQuery = async (
  db: PgExecutor,
  noteId: string
): Promise<ContactNote | null> => {
  const result = await db.query(
    `${CONTACT_NOTE_SELECT_WITH_OUTCOMES}
     WHERE cn.id = $1
     LIMIT 1`,
    [noteId]
  );

  return result.rows[0] || null;
};

const createContactNoteQuery = async (
  db: PgExecutor,
  contactId: string,
  data: CreateContactNoteDTO,
  userId: string
): Promise<ContactNote> => {
  const insertResult = await db.query(
    `
    INSERT INTO contact_notes (
      contact_id, case_id, note_type, subject, content,
      is_internal, is_important, is_pinned, is_alert,
      is_portal_visible, portal_visible_at, portal_visible_by,
      attachments, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id
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
      data.is_portal_visible || false,
      data.is_portal_visible ? new Date() : null,
      data.is_portal_visible ? userId : null,
      data.attachments ? JSON.stringify(data.attachments) : null,
      userId,
    ]
  );

  const noteId = insertResult.rows[0]?.id as string | undefined;
  if (!noteId) {
    throw new Error('Failed to create contact note');
  }

  const note = await getContactNoteByIdQuery(db, noteId);
  if (!note) {
    throw new Error('Contact note not found after create');
  }

  return note;
};

const updateContactNoteQuery = async (
  db: PgExecutor,
  noteId: string,
  data: UpdateContactNoteDTO,
  userId?: string
): Promise<ContactNote | null> => {
  const fields: string[] = [];
  const values: unknown[] = [];
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

  if (data.attachments !== undefined) {
    fields.push(`attachments = $${paramIndex++}`);
    values.push(data.attachments ? JSON.stringify(data.attachments) : null);
  }

  const hasOutcomePayload = data.outcome_impacts !== undefined || data.outcomes_mode !== undefined;

  if (fields.length === 0) {
    if (!hasOutcomePayload) {
      throw new Error('No fields to update');
    }
    return getContactNoteByIdQuery(db, noteId);
  }

  fields.push(`updated_at = NOW()`);
  values.push(noteId);

  const result = await db.query(
    `UPDATE contact_notes SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getContactNoteByIdQuery(db, noteId);
};

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
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM contact_notes WHERE contact_id = $1',
      [contactId]
    );
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const result = await pool.query(
      `${CONTACT_NOTE_SELECT_WITH_OUTCOMES}
       WHERE cn.contact_id = $1
       ORDER BY cn.is_pinned DESC, cn.created_at DESC
       LIMIT $2 OFFSET $3`,
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
    return await getContactNoteByIdQuery(pool, noteId);
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
  const hasInlineOutcomes = data.outcome_impacts !== undefined || data.outcomes_mode !== undefined;

  if (!hasInlineOutcomes) {
    try {
      const note = await createContactNoteQuery(pool, contactId, data, userId);
      logger.info(`Contact note created for contact ${contactId}`);
      return note;
    } catch (error) {
      logger.error('Error creating contact note:', error);
      throw Object.assign(new Error('Failed to create contact note'), { cause: error });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const createdNote = await createContactNoteQuery(client, contactId, data, userId);
    await contactNoteOutcomeImpactService.saveContactNoteOutcomesWithExecutor(
      client,
      createdNote.id,
      {
        impacts: data.outcome_impacts || [],
        mode: data.outcomes_mode || 'replace',
      },
      userId
    );

    const hydratedNote = await getContactNoteByIdQuery(client, createdNote.id);
    await client.query('COMMIT');

    logger.info(`Contact note created for contact ${contactId}`);
    return hydratedNote ?? createdNote;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    logger.error('Error creating contact note with inline outcomes:', error);
    throw Object.assign(new Error('Failed to create contact note'), { cause: error });
  } finally {
    client.release();
  }
}

/**
 * Update a contact note
 */
export async function updateContactNote(
  noteId: string,
  data: UpdateContactNoteDTO,
  userId?: string
): Promise<ContactNote | null> {
  const hasInlineOutcomes = data.outcome_impacts !== undefined || data.outcomes_mode !== undefined;

  if (!hasInlineOutcomes) {
    try {
      const updated = await updateContactNoteQuery(pool, noteId, data, userId);
      if (updated) {
        logger.info(`Contact note updated: ${noteId}`);
      }
      return updated;
    } catch (error) {
      logger.error('Error updating contact note:', error);
      throw Object.assign(new Error('Failed to update contact note'), { cause: error });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const updatedNote = await updateContactNoteQuery(client, noteId, data, userId);
    if (!updatedNote) {
      await client.query('ROLLBACK');
      return null;
    }

    await contactNoteOutcomeImpactService.saveContactNoteOutcomesWithExecutor(
      client,
      updatedNote.id,
      {
        impacts: data.outcome_impacts || [],
        mode: data.outcomes_mode || 'replace',
      },
      userId
    );

    const hydratedNote = await getContactNoteByIdQuery(client, updatedNote.id);
    await client.query('COMMIT');

    logger.info(`Contact note updated: ${noteId}`);
    return hydratedNote ?? updatedNote;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    logger.error('Error updating contact note with inline outcomes:', error);
    throw Object.assign(new Error('Failed to update contact note'), { cause: error });
  } finally {
    client.release();
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
      `${CONTACT_NOTE_CASE_SELECT_WITH_OUTCOMES}
       WHERE cn.case_id = $1
       ORDER BY cn.created_at DESC`,
      [caseId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error getting notes by case ID:', error);
    throw Object.assign(new Error('Failed to retrieve notes'), { cause: error });
  }
}
