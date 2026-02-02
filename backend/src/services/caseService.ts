/**
 * Case Management Service
 * Handles all case management operations
 */

import pool from '../config/database';
import { logger } from '../config/logger';
import type {
  Case,
  CaseWithDetails,
  CaseFilter,
  CreateCaseDTO,
  UpdateCaseDTO,
  CaseSummary,
  CaseNote,
  CreateCaseNoteDTO,
  UpdateCaseStatusDTO,
} from '../types/case';

/**
 * Generate unique case number
 */
function generateCaseNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `CASE-${year}${month}${day}-${random}`;
}

/**
 * Create a new case
 */
export async function createCase(data: CreateCaseDTO, userId?: string): Promise<Case> {
  const caseNumber = generateCaseNumber();

  // Get default "Intake" status
  const statusResult = await pool.query(
    `SELECT id FROM case_statuses WHERE status_type = 'intake' AND is_active = true ORDER BY sort_order LIMIT 1`
  );

  const statusId = statusResult.rows[0]?.id;
  if (!statusId) {
    throw new Error('No active intake status found');
  }

  const result = await pool.query(
    `
    INSERT INTO cases (
      case_number, contact_id, account_id, case_type_id, status_id,
      title, description, priority, source, referral_source,
      assigned_to, assigned_team, due_date, intake_data, custom_data,
      tags, is_urgent, created_by, modified_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
      data.priority || 'medium',
      data.source || null,
      data.referral_source || null,
      data.assigned_to || null,
      data.assigned_team || null,
      data.due_date || null,
      JSON.stringify(data.intake_data || null),
      JSON.stringify(data.custom_data || null),
      data.tags || null,
      data.is_urgent || false,
      userId,
      userId,
    ]
  );

  // Create initial note
  await pool.query(
    `INSERT INTO case_notes (case_id, note_type, content, created_by) VALUES ($1, 'note', $2, $3)`,
    [result.rows[0].id, 'Case created', userId]
  );

  logger.info(`Case created: ${caseNumber}`, { caseId: result.rows[0].id });
  return result.rows[0];
}

/**
 * Get cases with filtering
 */
export async function getCases(filter: CaseFilter = {}): Promise<{ cases: CaseWithDetails[]; total: number }> {
  let query = `
    SELECT c.*,
      ct.name as case_type_name, ct.color as case_type_color, ct.icon as case_type_icon,
      cs.name as status_name, cs.color as status_color, cs.status_type,
      con.first_name as contact_first_name, con.last_name as contact_last_name,
      con.email as contact_email, con.phone as contact_phone,
      u.first_name as assigned_first_name, u.last_name as assigned_last_name,
      (SELECT COUNT(*) FROM case_notes WHERE case_id = c.id) as notes_count,
      (SELECT COUNT(*) FROM case_documents WHERE case_id = c.id) as documents_count
    FROM cases c
    LEFT JOIN case_types ct ON c.case_type_id = ct.id
    LEFT JOIN case_statuses cs ON c.status_id = cs.id
    LEFT JOIN contacts con ON c.contact_id = con.id
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE 1=1
  `;

  const params: any[] = [];
  let paramIndex = 1;

  if (filter.contact_id) {
    query += ` AND c.contact_id = $${paramIndex++}`;
    params.push(filter.contact_id);
  }

  if (filter.case_type_id) {
    query += ` AND c.case_type_id = $${paramIndex++}`;
    params.push(filter.case_type_id);
  }

  if (filter.status_id) {
    query += ` AND c.status_id = $${paramIndex++}`;
    params.push(filter.status_id);
  }

  if (filter.priority) {
    query += ` AND c.priority = $${paramIndex++}`;
    params.push(filter.priority);
  }

  if (filter.assigned_to) {
    query += ` AND c.assigned_to = $${paramIndex++}`;
    params.push(filter.assigned_to);
  }

  if (filter.is_urgent !== undefined) {
    query += ` AND c.is_urgent = $${paramIndex++}`;
    params.push(filter.is_urgent);
  }

  if (filter.search) {
    query += ` AND (c.case_number ILIKE $${paramIndex} OR c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`;
    params.push(`%${filter.search}%`);
    paramIndex++;
  }

  // Count total
  const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS count_query`, params);
  const total = parseInt(countResult.rows[0].count);

  // Add sorting and pagination
  const sortBy = filter.sort_by || 'created_at';
  const sortOrder = filter.sort_order || 'desc';
  query += ` ORDER BY c.${sortBy} ${sortOrder}`;

  const limit = filter.limit || 20;
  const offset = ((filter.page || 1) - 1) * limit;
  query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return { cases: result.rows, total };
}

/**
 * Get case by ID
 */
export async function getCaseById(caseId: string): Promise<CaseWithDetails | null> {
  const result = await pool.query(
    `
    SELECT c.*,
      ct.name as case_type_name, ct.color as case_type_color, ct.icon as case_type_icon,
      cs.name as status_name, cs.color as status_color, cs.status_type,
      con.first_name as contact_first_name, con.last_name as contact_last_name,
      con.email as contact_email, con.phone as contact_phone,
      u.first_name as assigned_first_name, u.last_name as assigned_last_name, u.email as assigned_email,
      (SELECT COUNT(*) FROM case_notes WHERE case_id = c.id) as notes_count,
      (SELECT COUNT(*) FROM case_documents WHERE case_id = c.id) as documents_count,
      (SELECT COUNT(*) FROM case_services WHERE case_id = c.id) as services_count
    FROM cases c
    LEFT JOIN case_types ct ON c.case_type_id = ct.id
    LEFT JOIN case_statuses cs ON c.status_id = cs.id
    LEFT JOIN contacts con ON c.contact_id = con.id
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.id = $1
  `,
    [caseId]
  );

  return result.rows[0] || null;
}

/**
 * Update case
 */
export async function updateCase(caseId: string, data: UpdateCaseDTO, userId?: string): Promise<Case> {
  const fields: string[] = [];
  const values: any[] = [];
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
    values.push(data.priority);
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

  if (data.custom_data !== undefined) {
    fields.push(`custom_data = $${paramIndex++}`);
    values.push(JSON.stringify(data.custom_data));
  }

  fields.push(`modified_by = $${paramIndex++}`);
  values.push(userId);

  fields.push(`updated_at = NOW()`);

  values.push(caseId);

  const result = await pool.query(
    `UPDATE cases SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * Update case status
 */
export async function updateCaseStatus(
  caseId: string,
  data: UpdateCaseStatusDTO,
  userId?: string
): Promise<Case> {
  // Get current status
  const currentCase = await pool.query(`SELECT status_id FROM cases WHERE id = $1`, [caseId]);
  const previousStatusId = currentCase.rows[0]?.status_id;

  // Update case status
  const result = await pool.query(
    `UPDATE cases SET status_id = $1, modified_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [data.new_status_id, userId, caseId]
  );

  // Create status change note
  await pool.query(
    `
    INSERT INTO case_notes (
      case_id, note_type, content, previous_status_id, new_status_id, created_by
    ) VALUES ($1, 'status_change', $2, $3, $4, $5)
  `,
    [caseId, data.notes || 'Status updated', previousStatusId, data.new_status_id, userId]
  );

  logger.info(`Case status updated`, { caseId, newStatus: data.new_status_id });
  return result.rows[0];
}

/**
 * Get case notes
 */
export async function getCaseNotes(caseId: string): Promise<CaseNote[]> {
  const result = await pool.query(
    `
    SELECT cn.*, u.first_name, u.last_name
    FROM case_notes cn
    LEFT JOIN users u ON cn.created_by = u.id
    WHERE cn.case_id = $1
    ORDER BY cn.created_at DESC
  `,
    [caseId]
  );

  return result.rows;
}

/**
 * Create case note
 */
export async function createCaseNote(data: CreateCaseNoteDTO, userId?: string): Promise<CaseNote> {
  const result = await pool.query(
    `
    INSERT INTO case_notes (
      case_id, note_type, subject, content, is_internal, is_important, attachments, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `,
    [
      data.case_id,
      data.note_type,
      data.subject || null,
      data.content,
      data.is_internal || false,
      data.is_important || false,
      JSON.stringify(data.attachments || null),
      userId,
    ]
  );

  return result.rows[0];
}

/**
 * Get case summary statistics
 */
export async function getCaseSummary(): Promise<CaseSummary> {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_cases,
      COUNT(*) FILTER (WHERE cs.status_type IN ('intake', 'active', 'review')) as open_cases,
      COUNT(*) FILTER (WHERE cs.status_type IN ('closed', 'cancelled')) as closed_cases,
      COUNT(*) FILTER (WHERE c.priority = 'low') as priority_low,
      COUNT(*) FILTER (WHERE c.priority = 'medium') as priority_medium,
      COUNT(*) FILTER (WHERE c.priority = 'high') as priority_high,
      COUNT(*) FILTER (WHERE c.priority = 'urgent') as priority_urgent,
      COUNT(*) FILTER (WHERE cs.status_type = 'intake') as status_intake,
      COUNT(*) FILTER (WHERE cs.status_type = 'active') as status_active,
      COUNT(*) FILTER (WHERE cs.status_type = 'review') as status_review,
      COUNT(*) FILTER (WHERE cs.status_type = 'closed') as status_closed,
      COUNT(*) FILTER (WHERE cs.status_type = 'cancelled') as status_cancelled,
      COUNT(*) FILTER (WHERE c.due_date <= CURRENT_DATE + INTERVAL '7 days' AND c.due_date >= CURRENT_DATE) as due_this_week,
      COUNT(*) FILTER (WHERE c.due_date < CURRENT_DATE AND cs.status_type NOT IN ('closed', 'cancelled')) as overdue,
      COUNT(*) FILTER (WHERE c.assigned_to IS NULL AND cs.status_type NOT IN ('closed', 'cancelled')) as unassigned
    FROM cases c
    LEFT JOIN case_statuses cs ON c.status_id = cs.id
  `);

  const row = result.rows[0];
  return {
    total_cases: parseInt(row.total_cases),
    open_cases: parseInt(row.open_cases),
    closed_cases: parseInt(row.closed_cases),
    by_priority: {
      low: parseInt(row.priority_low),
      medium: parseInt(row.priority_medium),
      high: parseInt(row.priority_high),
      urgent: parseInt(row.priority_urgent),
    },
    by_status_type: {
      intake: parseInt(row.status_intake),
      active: parseInt(row.status_active),
      review: parseInt(row.status_review),
      closed: parseInt(row.status_closed),
      cancelled: parseInt(row.status_cancelled),
    },
    by_case_type: {},
    cases_due_this_week: parseInt(row.due_this_week),
    overdue_cases: parseInt(row.overdue),
    unassigned_cases: parseInt(row.unassigned),
  };
}

/**
 * Get case types
 */
export async function getCaseTypes(): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM case_types WHERE is_active = true ORDER BY name`
  );
  return result.rows;
}

/**
 * Get case statuses
 */
export async function getCaseStatuses(): Promise<any[]> {
  const result = await pool.query(
    `SELECT * FROM case_statuses WHERE is_active = true ORDER BY sort_order`
  );
  return result.rows;
}

/**
 * Delete case
 */
export async function deleteCase(caseId: string): Promise<void> {
  await pool.query(`DELETE FROM cases WHERE id = $1`, [caseId]);
  logger.info(`Case deleted`, { caseId });
}
