import { Pool, PoolClient } from 'pg';
import type { CaseNote, CreateCaseNoteDTO, UpdateCaseNoteDTO } from '@app-types/case';
import {
  normalizeCaseNoteType,
  requireCaseIdForNote,
  requireCaseOwnership,
  resolveVisibleToClient,
} from './shared';

type PgExecutor = Pool | PoolClient;

const CASE_NOTE_SELECT_WITH_OUTCOMES = `
  SELECT
    cn.*,
    u.first_name,
    u.last_name,
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
      WHERE ioi.interaction_id = cn.id
    ), '[]'::json) AS outcome_impacts
  FROM case_notes cn
  LEFT JOIN users u ON cn.created_by = u.id
`;

export const getCaseNoteByIdQuery = async (
  db: PgExecutor,
  noteId: string
): Promise<CaseNote | null> => {
  const result = await db.query(
    `${CASE_NOTE_SELECT_WITH_OUTCOMES}
    WHERE cn.id = $1
    LIMIT 1`,
    [noteId]
  );

  return result.rows[0] || null;
};

export const getCaseNotesQuery = async (db: PgExecutor, caseId: string): Promise<CaseNote[]> => {
  const result = await db.query(
    `${CASE_NOTE_SELECT_WITH_OUTCOMES}
    WHERE cn.case_id = $1
    ORDER BY cn.created_at DESC`,
    [caseId]
  );

  return result.rows;
};

export const createCaseNoteQuery = async (
  db: PgExecutor,
  data: CreateCaseNoteDTO,
  userId?: string
): Promise<CaseNote> => {
  await requireCaseOwnership(db, data.case_id);
  const visibleToClient = resolveVisibleToClient({
    visible_to_client: data.visible_to_client,
    is_portal_visible: data.is_portal_visible,
    is_internal: data.is_internal,
  });
  const isInternal = data.is_internal !== undefined ? data.is_internal : !visibleToClient;

  const insertedResult = await db.query(
    `
    INSERT INTO case_notes (
      case_id,
      note_type,
      subject,
      category,
      content,
      is_internal,
      visible_to_client,
      is_important,
      attachments,
      source_entity_type,
      source_entity_id,
      created_by,
      updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::uuid, $12, $13)
    RETURNING id
  `,
    [
      data.case_id,
      normalizeCaseNoteType(data.note_type) || 'note',
      data.subject || null,
      data.category || null,
      data.content,
      isInternal,
      visibleToClient,
      data.is_important || false,
      JSON.stringify(data.attachments || null),
      data.source_entity_type || null,
      data.source_entity_id || null,
      userId,
      userId || null,
    ]
  );

  const noteId = insertedResult.rows[0]?.id as string | undefined;
  if (!noteId) {
    throw new Error('Failed to create case note');
  }

  const note = await getCaseNoteByIdQuery(db, noteId);
  if (!note) {
    throw new Error('Case note not found');
  }

  return note;
};

export const updateCaseNoteQuery = async (
  db: PgExecutor,
  noteId: string,
  data: UpdateCaseNoteDTO,
  userId?: string
): Promise<CaseNote> => {
  const caseId = await requireCaseIdForNote(db, noteId);
  await requireCaseOwnership(db, caseId);

  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (data.note_type !== undefined) {
    fields.push(`note_type = $${index++}`);
    values.push(normalizeCaseNoteType(data.note_type) || 'note');
  }

  if (data.subject !== undefined) {
    fields.push(`subject = $${index++}`);
    values.push(data.subject || null);
  }

  if (data.category !== undefined) {
    fields.push(`category = $${index++}`);
    values.push(data.category || null);
  }

  if (data.content !== undefined) {
    fields.push(`content = $${index++}`);
    values.push(data.content);
  }

  const hasExplicitVisible = data.visible_to_client !== undefined || data.is_portal_visible !== undefined;
  const hasExplicitInternal = data.is_internal !== undefined;

  if (hasExplicitVisible) {
    const visible = resolveVisibleToClient({
      visible_to_client: data.visible_to_client,
      is_portal_visible: data.is_portal_visible,
    });
    fields.push(`visible_to_client = $${index++}`);
    values.push(visible);
    if (!hasExplicitInternal) {
      fields.push(`is_internal = $${index++}`);
      values.push(!visible);
    }
  }

  if (hasExplicitInternal) {
    fields.push(`is_internal = $${index++}`);
    values.push(data.is_internal);
    if (!hasExplicitVisible) {
      fields.push(`visible_to_client = $${index++}`);
      values.push(!data.is_internal);
    }
  }

  if (data.is_important !== undefined) {
    fields.push(`is_important = $${index++}`);
    values.push(data.is_important);
  }

  if (data.attachments !== undefined) {
    fields.push(`attachments = $${index++}`);
    values.push(JSON.stringify(data.attachments || null));
  }

  if (data.source_entity_type !== undefined) {
    fields.push(`source_entity_type = $${index++}`);
    values.push(data.source_entity_type || null);
  }

  if (data.source_entity_id !== undefined) {
    fields.push(`source_entity_id = $${index++}`);
    values.push(data.source_entity_id || null);
  }

  if (fields.length === 0) {
    const hasOutcomePayload = data.outcome_impacts !== undefined || data.outcomes_mode !== undefined;
    if (!hasOutcomePayload) {
      throw new Error('No fields to update');
    }

    const existing = await getCaseNoteByIdQuery(db, noteId);
    if (!existing) {
      throw new Error('Case note not found');
    }
    return existing;
  }

  fields.push(`updated_at = NOW()`);
  fields.push(`updated_by = $${index++}`);
  values.push(userId || null);
  values.push(noteId, caseId);

  const updated = await db.query(
    `UPDATE case_notes
     SET ${fields.join(', ')}
     WHERE id = $${index}
       AND case_id = $${index + 1}
     RETURNING id`,
    values
  );

  if (!updated.rows[0]) {
    throw new Error('Case note not found');
  }

  const note = await getCaseNoteByIdQuery(db, noteId);
  if (!note) {
    throw new Error('Case note not found');
  }

  return note;
};

export const deleteCaseNoteQuery = async (db: PgExecutor, noteId: string): Promise<boolean> => {
  const caseId = await requireCaseIdForNote(db, noteId);
  await requireCaseOwnership(db, caseId);

  const result = await db.query(
    `
    DELETE FROM case_notes
    WHERE id = $1
      AND case_id = $2
    RETURNING id
  `,
    [noteId, caseId]
  );
  return Boolean(result.rows[0]);
};
