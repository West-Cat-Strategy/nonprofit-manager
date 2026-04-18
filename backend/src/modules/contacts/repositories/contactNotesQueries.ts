/**
 * Module-owned contact note persistence and hydration helpers.
 */

import { Pool, PoolClient } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import { getRequestContext } from '@config/requestContext';
import * as contactNoteOutcomeImpactService from '../services/contactNoteOutcomeImpactService';
import type {
  ContactNote,
  ContactNoteTimelineItem,
  ContactNotesTimelineResponse,
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

const CASE_NOTE_OUTCOME_IMPACTS_JSON = `
  COALESCE((
    SELECT json_agg(
      json_build_object(
        'id', ioi.id,
        'interaction_id', ioi.interaction_id,
        'outcome_definition_id', ioi.outcome_definition_id,
        'impact', ioi.impact,
        'attribution', ioi.attribution,
        'intensity', ioi.intensity,
        'evidence_note', ioi.evidence_note,
        'created_by_user_id', ioi.created_by_user_id,
        'created_at', ioi.created_at,
        'updated_at', ioi.updated_at,
        'outcome_definition', json_build_object(
          'id', od.id,
          'key', od.key,
          'name', od.name,
          'description', od.description,
          'category', od.category,
          'is_active', od.is_active,
          'is_reportable', od.is_reportable,
          'sort_order', od.sort_order
        )
      )
      ORDER BY od.sort_order ASC, od.name ASC
    )
    FROM interaction_outcome_impacts ioi
    INNER JOIN outcome_definitions od
      ON od.id = ioi.outcome_definition_id
    WHERE ioi.interaction_id = csn.id
  ), '[]'::json) AS outcome_impacts
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

const CONTACT_TIMELINE_EVENT_ACTIVITY_TYPES = [
  'event_registration',
  'event_registration_updated',
  'event_check_in',
] as const;

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

export async function getContactNotesTimeline(
  contactId: string
): Promise<ContactNotesTimelineResponse> {
  try {
    const organizationId =
      getRequestContext()?.organizationId
      || getRequestContext()?.accountId
      || getRequestContext()?.tenantId
      || null;
    const countsResult = await pool.query<{
      contact_notes: string;
      case_notes: string;
      event_activity: string;
    }>(
      `
      SELECT
        (SELECT COUNT(*)::text FROM contact_notes WHERE contact_id = $1) AS contact_notes,
        (
          SELECT COUNT(*)::text
          FROM case_notes csn
          INNER JOIN cases c ON c.id = csn.case_id
          LEFT JOIN contacts con ON con.id = c.contact_id
          WHERE c.contact_id = $1
            AND (
              $3::uuid IS NULL
              OR COALESCE(c.account_id, con.account_id) = $3::uuid
            )
        ) AS case_notes,
        (
          SELECT COUNT(*)::text
          FROM activity_events ae
          WHERE ae.related_entity_type = 'contact'
            AND ae.related_entity_id = $1::uuid
            AND ae.activity_type = ANY($2::text[])
        ) AS event_activity
      `,
      [contactId, [...CONTACT_TIMELINE_EVENT_ACTIVITY_TYPES], organizationId]
    );

    const timelineResult = await pool.query<ContactNoteTimelineItem>(
      `
      SELECT *
      FROM (
        SELECT
          cn.id,
          'contact_note'::text AS source_type,
          true AS editable,
          cn.note_type::text AS note_type,
          NULL::text AS activity_type,
          cn.subject AS title,
          cn.content,
          cn.is_internal,
          cn.is_important,
          cn.is_pinned,
          cn.is_alert,
          cn.is_portal_visible,
          cn.created_at,
          cn.updated_at,
          cn.created_by,
          u.first_name AS created_by_first_name,
          u.last_name AS created_by_last_name,
          cn.case_id,
          c.case_number,
          c.title AS case_title,
          NULL::uuid AS event_id,
          NULL::text AS event_name,
          NULL::uuid AS registration_id,
          NULL::text AS registration_status,
          NULL::text AS previous_registration_status,
          NULL::text AS next_registration_status,
          NULL::boolean AS checked_in,
          NULL::text AS check_in_method,
          ${CONTACT_NOTE_OUTCOME_IMPACTS_JSON}
        FROM contact_notes cn
        LEFT JOIN users u ON u.id = cn.created_by
        LEFT JOIN cases c ON c.id = cn.case_id
        WHERE cn.contact_id = $1

        UNION ALL

        SELECT
          csn.id,
          'case_note'::text AS source_type,
          false AS editable,
          csn.note_type::text AS note_type,
          NULL::text AS activity_type,
          csn.subject AS title,
          csn.content,
          csn.is_internal,
          csn.is_important,
          false AS is_pinned,
          false AS is_alert,
          csn.visible_to_client AS is_portal_visible,
          csn.created_at,
          csn.updated_at,
          csn.created_by,
          cu.first_name AS created_by_first_name,
          cu.last_name AS created_by_last_name,
          csn.case_id,
          c.case_number,
          c.title AS case_title,
          NULL::uuid AS event_id,
          NULL::text AS event_name,
          NULL::uuid AS registration_id,
          NULL::text AS registration_status,
          NULL::text AS previous_registration_status,
          NULL::text AS next_registration_status,
          NULL::boolean AS checked_in,
          NULL::text AS check_in_method,
          ${CASE_NOTE_OUTCOME_IMPACTS_JSON}
        FROM case_notes csn
        INNER JOIN cases c ON c.id = csn.case_id
        LEFT JOIN contacts con ON con.id = c.contact_id
        LEFT JOIN users cu ON cu.id = csn.created_by
        WHERE c.contact_id = $1
          AND (
            $3::uuid IS NULL
            OR COALESCE(c.account_id, con.account_id) = $3::uuid
          )

        UNION ALL

        SELECT
          ae.id,
          'event_activity'::text AS source_type,
          false AS editable,
          NULL::text AS note_type,
          ae.activity_type::text AS activity_type,
          COALESCE(NULLIF(ae.metadata->>'eventName', ''), e.name, ae.title) AS title,
          CASE
            WHEN ae.activity_type = 'event_registration_updated' THEN
              COALESCE(
                NULLIF(ae.description, ''),
                CASE
                  WHEN ae.metadata->>'previousStatus' IS NOT NULL AND ae.metadata->>'nextStatus' IS NOT NULL THEN
                    CONCAT(
                      'Registration status changed from ',
                      ae.metadata->>'previousStatus',
                      ' to ',
                      ae.metadata->>'nextStatus'
                    )
                  WHEN ae.metadata->>'nextStatus' IS NOT NULL THEN
                    CONCAT('Registration status updated to ', ae.metadata->>'nextStatus')
                  ELSE
                    'Registration updated'
                END
              )
            WHEN ae.activity_type = 'event_check_in' THEN
              COALESCE(NULLIF(ae.description, ''), 'Checked in to the event')
            ELSE
              COALESCE(NULLIF(ae.description, ''), 'Registered for the event')
          END AS content,
          false AS is_internal,
          false AS is_important,
          false AS is_pinned,
          false AS is_alert,
          false AS is_portal_visible,
          ae.occurred_at AS created_at,
          ae.occurred_at AS updated_at,
          ae.actor_user_id AS created_by,
          COALESCE(au.first_name, NULLIF(ae.actor_name, '')) AS created_by_first_name,
          au.last_name AS created_by_last_name,
          COALESCE(NULLIF(ae.metadata->>'caseId', '')::uuid, er.case_id) AS case_id,
          COALESCE(linked_case.case_number, NULLIF(ae.metadata->>'caseNumber', '')) AS case_number,
          COALESCE(linked_case.title, NULLIF(ae.metadata->>'caseTitle', '')) AS case_title,
          COALESCE(e.id, er.event_id, NULLIF(ae.metadata->>'eventId', '')::uuid) AS event_id,
          COALESCE(e.name, NULLIF(ae.metadata->>'eventName', '')) AS event_name,
          NULLIF(ae.metadata->>'registrationId', '')::uuid AS registration_id,
          COALESCE(ae.metadata->>'registrationStatus', er.registration_status) AS registration_status,
          ae.metadata->>'previousStatus' AS previous_registration_status,
          ae.metadata->>'nextStatus' AS next_registration_status,
          CASE
            WHEN ae.metadata->>'checkedIn' IS NOT NULL THEN (ae.metadata->>'checkedIn')::boolean
            ELSE er.checked_in
          END AS checked_in,
          COALESCE(ae.metadata->>'method', ae.metadata->>'checkInMethod', er.check_in_method) AS check_in_method,
          '[]'::json AS outcome_impacts
        FROM activity_events ae
        LEFT JOIN event_registrations er
          ON er.id = NULLIF(ae.metadata->>'registrationId', '')::uuid
        LEFT JOIN events e
          ON e.id = ae.entity_id
        LEFT JOIN cases linked_case
          ON linked_case.id = COALESCE(NULLIF(ae.metadata->>'caseId', '')::uuid, er.case_id)
        LEFT JOIN users au
          ON au.id = ae.actor_user_id
        WHERE ae.related_entity_type = 'contact'
          AND ae.related_entity_id = $1::uuid
          AND ae.activity_type = ANY($2::text[])
      ) timeline
      ORDER BY timeline.created_at DESC, timeline.id DESC
      LIMIT 200
      `,
      [contactId, [...CONTACT_TIMELINE_EVENT_ACTIVITY_TYPES], organizationId]
    );

    const rawCounts = countsResult.rows[0] || {
      contact_notes: '0',
      case_notes: '0',
      event_activity: '0',
    };
    const counts = {
      contact_notes: Number.parseInt(rawCounts.contact_notes || '0', 10),
      case_notes: Number.parseInt(rawCounts.case_notes || '0', 10),
      event_activity: Number.parseInt(rawCounts.event_activity || '0', 10),
    };

    return {
      items: timelineResult.rows,
      counts: {
        all: counts.contact_notes + counts.case_notes + counts.event_activity,
        ...counts,
      },
    };
  } catch (error) {
    logger.error('Error getting contact notes timeline:', error);
    throw Object.assign(new Error('Failed to retrieve contact notes timeline'), { cause: error });
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
