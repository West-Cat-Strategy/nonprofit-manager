import { Pool, PoolClient, QueryResult } from 'pg';
import { logger } from '@config/logger';
import type {
  BulkStatusUpdateDTO,
  Case,
  CreateCaseDTO,
  ReassignCaseDTO,
  UpdateCaseDTO,
  UpdateCaseStatusDTO,
} from '@app-types/case';
import { createCaseWorkflowArtifacts } from '@services/caseWorkflowService';
import { generateCaseNumber, normalizeCasePriority } from './shared';

const dedupeStrings = (values: Array<string | null | undefined>): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of values) {
    if (typeof rawValue !== 'string') continue;
    const value = rawValue.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
};

const normalizeStringArray = (values: Array<string | null | undefined> | undefined): string[] | undefined => {
  if (!Array.isArray(values)) return values;
  return dedupeStrings(values);
};

const normalizeSingleString = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const resolveCaseTypeIds = (data: { case_type_id?: string; case_type_ids?: string[] }): string[] => {
  const normalizedIds = normalizeStringArray(data.case_type_ids);
  if (normalizedIds && normalizedIds.length > 0) {
    return normalizedIds;
  }

  const singleTypeId = normalizeSingleString(data.case_type_id);
  return singleTypeId ? [singleTypeId] : [];
};

const resolveCaseOutcomeValues = (data: { outcome?: string | null; case_outcome_values?: string[] }): string[] => {
  const normalizedValues = normalizeStringArray(data.case_outcome_values);
  if (normalizedValues && normalizedValues.length > 0) {
    return normalizedValues;
  }

  const singleOutcome = normalizeSingleString(data.outcome);
  return singleOutcome ? [singleOutcome] : [];
};

const persistCaseTypeAssignments = async (
  db: Pool,
  caseId: string,
  caseTypeIds: string[],
  userId?: string
): Promise<void> => {
  await db.query(`DELETE FROM case_type_assignments WHERE case_id = $1`, [caseId]);

  if (caseTypeIds.length === 0) {
    return;
  }

  await db.query(
    `
    INSERT INTO case_type_assignments (
      case_id,
      case_type_id,
      sort_order,
      is_primary,
      created_by,
      modified_by
    )
    SELECT
      $1,
      input.case_type_id,
      input.sort_order - 1,
      input.sort_order = 1,
      $2,
      $2
    FROM unnest($3::uuid[]) WITH ORDINALITY AS input(case_type_id, sort_order)
  `,
    [caseId, userId || null, caseTypeIds]
  );
};

export const upsertCaseTypeAssignments = async (
  db: Pool | PoolClient,
  caseId: string,
  caseTypeIds: string[],
  userId?: string
): Promise<void> => {
  const normalizedIds = normalizeStringArray(caseTypeIds);
  if (!normalizedIds || normalizedIds.length === 0) {
    return;
  }

  await db.query(
    `
    INSERT INTO case_type_assignments (
      case_id,
      case_type_id,
      sort_order,
      is_primary,
      created_by,
      modified_by
    )
    SELECT
      $1,
      input.case_type_id,
      input.sort_order - 1,
      input.sort_order = 1,
      $2,
      $2
    FROM unnest($3::uuid[]) WITH ORDINALITY AS input(case_type_id, sort_order)
    ON CONFLICT (case_id, case_type_id) DO UPDATE
    SET sort_order = EXCLUDED.sort_order,
        is_primary = EXCLUDED.is_primary,
        modified_by = EXCLUDED.modified_by,
        updated_at = NOW()
  `,
    [caseId, userId || null, normalizedIds]
  );
};

const persistCaseOutcomeAssignments = async (
  db: Pool,
  caseId: string,
  outcomeValues: string[],
  userId?: string
): Promise<void> => {
  await db.query(`DELETE FROM case_outcome_assignments WHERE case_id = $1`, [caseId]);

  if (outcomeValues.length === 0) {
    return;
  }

  await db.query(
    `
    INSERT INTO case_outcome_assignments (
      case_id,
      outcome_value,
      sort_order,
      is_primary,
      created_by,
      modified_by
    )
    SELECT
      $1,
      input.outcome_value,
      input.sort_order - 1,
      input.sort_order = 1,
      $2,
      $2
    FROM unnest($3::text[]) WITH ORDINALITY AS input(outcome_value, sort_order)
  `,
    [caseId, userId || null, outcomeValues]
  );
};

export const createCaseQuery = async (
  db: Pool,
  data: CreateCaseDTO,
  userId?: string
): Promise<Case> => {
  const statusResult = await db.query(
    `SELECT id FROM case_statuses WHERE status_type = 'intake' AND is_active = true ORDER BY sort_order LIMIT 1`
  );

  const statusId = statusResult.rows[0]?.id;
  if (!statusId) {
    throw new Error('No active intake status found');
  }
  let result: QueryResult<Case> | null = null;
  let caseNumber = '';
  const caseTypeIds = resolveCaseTypeIds(data);
  const caseOutcomeValues = resolveCaseOutcomeValues(data);

  if (caseTypeIds.length === 0) {
    throw new Error('At least one case type is required');
  }

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    caseNumber = await generateCaseNumber(db);

    try {
      result = await db.query(
        `
        INSERT INTO cases (
          case_number, contact_id, account_id, case_type_id, status_id,
          title, description, priority, outcome, source, referral_source,
          assigned_to, assigned_team, due_date, intake_data, custom_data,
          tags, is_urgent, client_viewable, created_by, modified_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *
      `,
        [
          caseNumber,
          data.contact_id,
          data.account_id || null,
          caseTypeIds[0],
          statusId,
          data.title,
          data.description || null,
          normalizeCasePriority(data.priority) || 'medium',
          caseOutcomeValues[0] || null,
          data.source || null,
          data.referral_source || null,
          data.assigned_to || null,
          data.assigned_team || null,
          data.due_date || null,
          JSON.stringify(data.intake_data || null),
          JSON.stringify(data.custom_data || null),
          data.tags || null,
          data.is_urgent || false,
          data.client_viewable || false,
          userId,
          userId,
        ]
      );
      break;
    } catch (error) {
      const code = (error as { code?: string }).code;
      const constraint = (error as { constraint?: string }).constraint;
      if (code === '23505' && constraint === 'cases_case_number_key' && attempt < 5) {
        continue;
      }
      throw error;
    }
  }

  if (!result) {
    throw new Error('Failed to create case after retrying case number generation');
  }

  await persistCaseTypeAssignments(db, result.rows[0].id, caseTypeIds, userId);
  await persistCaseOutcomeAssignments(db, result.rows[0].id, caseOutcomeValues, userId);

  await db.query(
    `INSERT INTO case_notes (case_id, note_type, content, created_by) VALUES ($1, 'note', $2, $3)`,
    [result.rows[0].id, 'Case created', userId]
  );

  logger.info(`Case created: ${caseNumber}`, { caseId: result.rows[0].id });
  return result.rows[0];
};

export const updateCaseQuery = async (
  db: Pool,
  caseId: string,
  data: UpdateCaseDTO,
  userId?: string
): Promise<Case> => {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;
  const hasCaseTypeInput = data.case_type_id !== undefined || data.case_type_ids !== undefined;
  const hasCaseOutcomeInput = data.outcome !== undefined || data.case_outcome_values !== undefined;
  const caseTypeIds = hasCaseTypeInput ? resolveCaseTypeIds(data) : [];
  const caseOutcomeValues = hasCaseOutcomeInput ? resolveCaseOutcomeValues(data) : [];

  if (hasCaseTypeInput && caseTypeIds.length === 0) {
    throw new Error('At least one case type is required');
  }

  if (data.title !== undefined) {
    fields.push(`title = $${paramIndex++}`);
    values.push(data.title);
  }

  if (data.description !== undefined) {
    fields.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }

  if (data.priority !== undefined) {
    fields.push(`priority = $${paramIndex++}`);
    values.push(normalizeCasePriority(data.priority));
  }

  if (hasCaseTypeInput) {
    fields.push(`case_type_id = $${paramIndex++}`);
    values.push(caseTypeIds[0]);
  }

  if (data.assigned_to !== undefined) {
    fields.push(`assigned_to = $${paramIndex++}`);
    values.push(data.assigned_to);
  }

  if (data.due_date !== undefined) {
    fields.push(`due_date = $${paramIndex++}`);
    values.push(data.due_date);
  }

  if (data.tags !== undefined) {
    fields.push(`tags = $${paramIndex++}`);
    values.push(data.tags);
  }

  if (data.is_urgent !== undefined) {
    fields.push(`is_urgent = $${paramIndex++}`);
    values.push(data.is_urgent);
  }

  if (data.client_viewable !== undefined) {
    fields.push(`client_viewable = $${paramIndex++}`);
    values.push(data.client_viewable);
  }

  if (data.custom_data !== undefined) {
    fields.push(`custom_data = $${paramIndex++}`);
    values.push(JSON.stringify(data.custom_data));
  }

  if (hasCaseOutcomeInput) {
    fields.push(`outcome = $${paramIndex++}`);
    values.push(caseOutcomeValues[0] || null);
  }

  if (data.outcome_notes !== undefined) {
    fields.push(`outcome_notes = $${paramIndex++}`);
    values.push(data.outcome_notes);
  }

  if (data.closure_reason !== undefined) {
    fields.push(`closure_reason = $${paramIndex++}`);
    values.push(data.closure_reason);
  }

  if (data.requires_followup !== undefined) {
    fields.push(`requires_followup = $${paramIndex++}`);
    values.push(data.requires_followup);
  }

  if (data.followup_date !== undefined) {
    fields.push(`followup_date = $${paramIndex++}`);
    values.push(data.followup_date);
  }

  fields.push(`modified_by = $${paramIndex++}`);
  values.push(userId);
  fields.push(`updated_at = NOW()`);
  values.push(caseId);

  const result = await db.query(
    `UPDATE cases SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (hasCaseTypeInput) {
    await persistCaseTypeAssignments(db, caseId, caseTypeIds, userId);
  }

  if (hasCaseOutcomeInput) {
    await persistCaseOutcomeAssignments(db, caseId, caseOutcomeValues, userId);
  }

  return result.rows[0];
};

export const updateCaseStatusQuery = async (
  db: Pool,
  caseId: string,
  data: UpdateCaseStatusDTO,
  userId?: string
): Promise<Case> => {
  const noteText = data.notes?.trim() || '';
  if (!noteText) {
    throw Object.assign(new Error('Status change notes are required'), {
      statusCode: 400,
      code: 'validation_error',
    });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const currentCase = await client.query(`SELECT status_id FROM cases WHERE id = $1 FOR UPDATE`, [caseId]);
    const previousStatusId = currentCase.rows[0]?.status_id as string | undefined;
    if (!previousStatusId) {
      throw Object.assign(new Error('Case not found'), {
        statusCode: 404,
        code: 'not_found',
      });
    }

    const nextStatusResult = await client.query<{
      id: string;
      name: string;
      status_type: 'intake' | 'active' | 'review' | 'closed' | 'cancelled';
    }>(
      `
      SELECT id, name, status_type
      FROM case_statuses
      WHERE id = $1
      LIMIT 1
    `,
      [data.new_status_id]
    );

    const nextStatus = nextStatusResult.rows[0];
    if (!nextStatus) {
      throw Object.assign(new Error('Case status not found'), {
        statusCode: 404,
        code: 'not_found',
      });
    }

    const requiresOutcome = ['review', 'closed', 'cancelled'].includes(nextStatus.status_type);
    const outcomeDefinitionIds = data.outcome_definition_ids || [];
    if (requiresOutcome && outcomeDefinitionIds.length === 0) {
      throw Object.assign(new Error('Outcome definitions are required for this status transition'), {
        statusCode: 400,
        code: 'validation_error',
      });
    }

    const result = await client.query(
      `UPDATE cases SET status_id = $1, modified_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [data.new_status_id, userId, caseId]
    );

    await createCaseWorkflowArtifacts(client, {
      caseId,
      userId: userId || null,
      note: {
        noteType: 'status_change',
        subject: `Status updated to ${nextStatus.name}`,
        content: noteText,
        previousStatusId,
        newStatusId: data.new_status_id,
        sourceEntityType: 'case_status',
        sourceEntityId: data.new_status_id,
      },
      outcomes: requiresOutcome
        ? {
            outcomeDefinitionIds,
            notes: noteText,
            visibleToClient: Boolean(data.outcome_visibility),
            workflowStage: 'case_status',
            sourceEntityType: 'case_status',
            sourceEntityId: data.new_status_id,
          }
        : undefined,
    });

    await client.query('COMMIT');

    logger.info(`Case status updated`, { caseId, newStatus: data.new_status_id });
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const reassignCaseQuery = async (
  db: Pool,
  caseId: string,
  data: ReassignCaseDTO,
  userId?: string
): Promise<Case> => {
  const currentCase = await db.query(`SELECT assigned_to FROM cases WHERE id = $1`, [caseId]);
  const previousAssignee = currentCase.rows[0]?.assigned_to;
  const newAssigneeId = data.assigned_to;

  if (previousAssignee) {
    await db.query(
      `UPDATE case_assignments SET unassigned_at = NOW(), unassigned_by = $1
       WHERE case_id = $2 AND assigned_to = $3 AND unassigned_at IS NULL`,
      [userId, caseId, previousAssignee]
    );
  }

  if (newAssigneeId) {
    await db.query(
      `INSERT INTO case_assignments (case_id, assigned_from, assigned_to, assignment_reason, assigned_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [caseId, previousAssignee || null, newAssigneeId, data.reason || null, userId]
    );
  }

  const result = await db.query(
    `UPDATE cases SET assigned_to = $1, modified_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [newAssigneeId, userId, caseId]
  );

  const noteContent = newAssigneeId
    ? `Case reassigned${data.reason ? `: ${data.reason}` : ''}`
    : `Case unassigned${data.reason ? `: ${data.reason}` : ''}`;

  await db.query(
    `INSERT INTO case_notes (case_id, note_type, content, created_by)
     VALUES ($1, 'update', $2, $3)`,
    [caseId, noteContent, userId]
  );

  logger.info('Case reassigned', { caseId, from: previousAssignee, to: newAssigneeId });
  return result.rows[0];
};

export const bulkUpdateStatusQuery = async (
  db: Pool,
  data: BulkStatusUpdateDTO,
  userId?: string
): Promise<{ updated: number }> => {
  const caseIds = data.case_ids;
  if (caseIds.length === 0) return { updated: 0 };

  const noteText = data.notes?.trim() || '';
  if (!noteText) {
    throw Object.assign(new Error('Bulk status updates require notes'), {
      statusCode: 400,
      code: 'validation_error',
    });
  }

  const nextStatusResult = await db.query<{ status_type: string }>(
    `
    SELECT status_type
    FROM case_statuses
    WHERE id = $1
    LIMIT 1
  `,
    [data.new_status_id]
  );

  const nextStatusType = nextStatusResult.rows[0]?.status_type;
  if (['review', 'closed', 'cancelled'].includes(nextStatusType || '')) {
    throw Object.assign(
      new Error(
        'Bulk status updates are not allowed for review, closed, or cancelled states because outcomes are required per case'
      ),
      {
        statusCode: 400,
        code: 'validation_error',
      }
    );
  }

  await db.query(
    `
    INSERT INTO case_notes (case_id, note_type, content, previous_status_id, new_status_id, created_by)
    SELECT
      c.id,
      'status_change',
      $1,
      c.status_id,
      $2,
      $3
    FROM cases c
    WHERE c.id = ANY($4::uuid[])
  `,
    [noteText, data.new_status_id, userId, caseIds]
  );

  const updateResult = await db.query(
    `UPDATE cases SET status_id = $1, modified_by = $2, updated_at = NOW() WHERE id = ANY($3::uuid[])`,
    [data.new_status_id, userId, caseIds]
  );

  logger.info('Bulk status update', { count: updateResult.rowCount, newStatusId: data.new_status_id });
  return { updated: updateResult.rowCount || 0 };
};

export const deleteCaseQuery = async (db: Pool, caseId: string): Promise<void> => {
  await db.query(`DELETE FROM cases WHERE id = $1`, [caseId]);
  logger.info(`Case deleted`, { caseId });
};
