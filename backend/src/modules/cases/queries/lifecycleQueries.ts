import { Pool } from 'pg';
import { logger } from '@config/logger';
import type {
  BulkStatusUpdateDTO,
  Case,
  CreateCaseDTO,
  ReassignCaseDTO,
  UpdateCaseDTO,
  UpdateCaseStatusDTO,
} from '@app-types/case';
import { generateCaseNumber, normalizeCasePriority } from './shared';

export const createCaseQuery = async (
  db: Pool,
  data: CreateCaseDTO,
  userId?: string
): Promise<Case> => {
  const caseNumber = await generateCaseNumber(db);

  const statusResult = await db.query(
    `SELECT id FROM case_statuses WHERE status_type = 'intake' AND is_active = true ORDER BY sort_order LIMIT 1`
  );

  const statusId = statusResult.rows[0]?.id;
  if (!statusId) {
    throw new Error('No active intake status found');
  }

  const result = await db.query(
    `
    INSERT INTO cases (
      case_number, contact_id, account_id, case_type_id, status_id,
      title, description, priority, source, referral_source,
      assigned_to, assigned_team, due_date, intake_data, custom_data,
      tags, is_urgent, client_viewable, created_by, modified_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *
  `,
    [
      caseNumber,
      data.contact_id,
      data.account_id || null,
      data.case_type_id,
      statusId,
      data.title,
      data.description || null,
      normalizeCasePriority(data.priority) || 'medium',
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

  if (data.outcome !== undefined) {
    fields.push(`outcome = $${paramIndex++}`);
    values.push(data.outcome);
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

  return result.rows[0];
};

export const updateCaseStatusQuery = async (
  db: Pool,
  caseId: string,
  data: UpdateCaseStatusDTO,
  userId?: string
): Promise<Case> => {
  const currentCase = await db.query(`SELECT status_id FROM cases WHERE id = $1`, [caseId]);
  const previousStatusId = currentCase.rows[0]?.status_id;

  const result = await db.query(
    `UPDATE cases SET status_id = $1, modified_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [data.new_status_id, userId, caseId]
  );

  await db.query(
    `
    INSERT INTO case_notes (
      case_id, note_type, content, previous_status_id, new_status_id, created_by
    ) VALUES ($1, 'status_change', $2, $3, $4, $5)
  `,
    [caseId, data.notes || 'Status updated', previousStatusId, data.new_status_id, userId]
  );

  logger.info(`Case status updated`, { caseId, newStatus: data.new_status_id });
  return result.rows[0];
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

  const currentCases = await db.query(`SELECT id, status_id FROM cases WHERE id = ANY($1)`, [caseIds]);

  const updateResult = await db.query(
    `UPDATE cases SET status_id = $1, modified_by = $2, updated_at = NOW() WHERE id = ANY($3)`,
    [data.new_status_id, userId, caseIds]
  );

  for (const row of currentCases.rows) {
    await db.query(
      `INSERT INTO case_notes (case_id, note_type, content, previous_status_id, new_status_id, created_by)
       VALUES ($1, 'status_change', $2, $3, $4, $5)`,
      [row.id, data.notes || 'Bulk status update', row.status_id, data.new_status_id, userId]
    );
  }

  logger.info('Bulk status update', { count: updateResult.rowCount, newStatusId: data.new_status_id });
  return { updated: updateResult.rowCount || 0 };
};

export const deleteCaseQuery = async (db: Pool, caseId: string): Promise<void> => {
  await db.query(`DELETE FROM cases WHERE id = $1`, [caseId]);
  logger.info(`Case deleted`, { caseId });
};
