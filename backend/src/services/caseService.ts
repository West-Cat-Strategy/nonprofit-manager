/**
 * Case Management Service
 * Handles all case management operations
 */

import { Pool } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
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
  CaseMilestone,
  CreateCaseRelationshipDTO,
  CaseRelationship,
  CreateCaseServiceDTO,
  UpdateCaseServiceDTO,
  CaseService as CaseServiceType,
} from '@app-types/case';

export class CaseService {
  constructor(private pool: Pool) { }

  private normalizeProviderName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  private async resolveExternalServiceProviderId(
    providerName?: string | null,
    providerType?: string | null,
    userId?: string
  ): Promise<{ providerId: string | null; providerName: string | null }> {
    if (!providerName || !providerName.trim()) {
      return { providerId: null, providerName: null };
    }

    const normalizedName = this.normalizeProviderName(providerName);
    const existing = await this.pool.query(
      `
      SELECT id, provider_name
      FROM external_service_providers
      WHERE LOWER(BTRIM(provider_name)) = LOWER(BTRIM($1))
      LIMIT 1
    `,
      [normalizedName]
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      if (providerType && providerType.trim()) {
        await this.pool.query(
          `
          UPDATE external_service_providers
          SET provider_type = COALESCE(provider_type, $1),
              modified_by = $2
          WHERE id = $3
        `,
          [providerType.trim(), userId || null, row.id]
        );
      }
      return { providerId: row.id, providerName: row.provider_name };
    }

    const inserted = await this.pool.query(
      `
      INSERT INTO external_service_providers (provider_name, provider_type, created_by, modified_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, provider_name
    `,
      [normalizedName, providerType?.trim() || null, userId || null, userId || null]
    );

    return {
      providerId: inserted.rows[0].id,
      providerName: inserted.rows[0].provider_name,
    };
  }

  private async getExternalProviderById(
    providerId?: string | null
  ): Promise<{ id: string; provider_name: string } | null> {
    if (!providerId) {
      return null;
    }

    const result = await this.pool.query(
      `
      SELECT id, provider_name
      FROM external_service_providers
      WHERE id = $1
      LIMIT 1
    `,
      [providerId]
    );

    return result.rows[0] || null;
  }

  /**
   * Generate unique case number using a sequence query to avoid collisions
   */
  private async generateCaseNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const prefix = `CASE-${year}${month}${day}`;

    // Count existing cases today and increment
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM cases WHERE case_number LIKE $1`,
      [`${prefix}-%`]
    );
    const seq = (parseInt(result.rows[0].count) + 1).toString().padStart(5, '0');
    return `${prefix}-${seq}`;
  }

  /**
   * Create a new case
   */
  async createCase(data: CreateCaseDTO, userId?: string): Promise<Case> {
    const caseNumber = await this.generateCaseNumber();

    // Get default "Intake" status
    const statusResult = await this.pool.query(
      `SELECT id FROM case_statuses WHERE status_type = 'intake' AND is_active = true ORDER BY sort_order LIMIT 1`
    );

    const statusId = statusResult.rows[0]?.id;
    if (!statusId) {
      throw new Error('No active intake status found');
    }

    const result = await this.pool.query(
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
    await this.pool.query(
      `INSERT INTO case_notes (case_id, note_type, content, created_by) VALUES ($1, 'note', $2, $3)`,
      [result.rows[0].id, 'Case created', userId]
    );

    logger.info(`Case created: ${caseNumber}`, { caseId: result.rows[0].id });
    return result.rows[0];
  }

  /**
   * Get cases with filtering
   */
  async getCases(filter: CaseFilter = {}): Promise<{ cases: CaseWithDetails[]; total: number }> {
    const filters: string[] = [];
    const params: any[] = [];
    let needsStatusJoin = false;

    const addFilter = (sql: string, value?: unknown) => {
      if (value !== undefined) {
        params.push(value);
        filters.push(sql.replace('?', `$${params.length}`));
      } else {
        filters.push(sql);
      }
    };

    if (filter.contact_id) {
      addFilter('c.contact_id = ?', filter.contact_id);
    }

    if (filter.case_type_id) {
      addFilter('c.case_type_id = ?', filter.case_type_id);
    }

    if (filter.status_id) {
      addFilter('c.status_id = ?', filter.status_id);
    }

    if (filter.priority) {
      addFilter('c.priority = ?', filter.priority);
    }

    if (filter.assigned_to) {
      addFilter('c.assigned_to = ?', filter.assigned_to);
    }

    if (filter.is_urgent !== undefined) {
      addFilter('c.is_urgent = ?', filter.is_urgent);
    }

    if (filter.quick_filter) {
      if (filter.quick_filter === 'active') {
        needsStatusJoin = true;
        filters.push(`cs.status_type NOT IN ('closed', 'cancelled')`);
      }

      if (filter.quick_filter === 'urgent') {
        filters.push(`(c.is_urgent = true OR c.priority = 'urgent')`);
      }

      if (filter.quick_filter === 'unassigned') {
        needsStatusJoin = true;
        filters.push('c.assigned_to IS NULL');
        filters.push(`cs.status_type NOT IN ('closed', 'cancelled')`);
      }

      if (filter.quick_filter === 'overdue') {
        needsStatusJoin = true;
        filters.push('c.due_date IS NOT NULL');
        filters.push('c.due_date < NOW()');
        filters.push(`cs.status_type NOT IN ('closed', 'cancelled')`);
      }

      if (filter.quick_filter === 'due_soon') {
        needsStatusJoin = true;
        const days = typeof filter.due_within_days === 'number' && filter.due_within_days > 0 ? filter.due_within_days : 7;
        filters.push('c.due_date IS NOT NULL');
        params.push(days);
        filters.push(`c.due_date >= NOW() AND c.due_date <= NOW() + ($${params.length} * INTERVAL '1 day')`);
        filters.push(`cs.status_type NOT IN ('closed', 'cancelled')`);
      }
    }

    if (filter.search) {
      const searchValue = `%${filter.search}%`;
      params.push(searchValue, searchValue, searchValue);
      filters.push(
        `(c.case_number ILIKE $${params.length - 2} OR c.title ILIKE $${params.length - 1} OR c.description ILIKE $${params.length})`
      );
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const countJoinClause = needsStatusJoin ? 'LEFT JOIN case_statuses cs ON c.status_id = cs.id' : '';
    const countResult = await this.pool.query(`SELECT COUNT(*) FROM cases c ${countJoinClause} ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

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
      ${whereClause}
    `;

    // Add sorting and pagination
    const sortColumns: Record<string, string> = {
      created_at: 'c.created_at',
      updated_at: 'c.updated_at',
      case_number: 'c.case_number',
      title: 'c.title',
      priority: 'c.priority',
      due_date: 'c.due_date',
      status_id: 'c.status_id',
      case_type_id: 'c.case_type_id',
      intake_date: 'c.intake_date',
    };

    const sortBy = sortColumns[filter.sort_by || 'created_at'] || 'c.created_at';
    const sortOrder = filter.sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    const limit = filter.limit || 20;
    const offset = ((filter.page || 1) - 1) * limit;
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await this.pool.query(query, params);
    return { cases: result.rows, total };
  }

  /**
   * Get case by ID
   */
  async getCaseById(caseId: string): Promise<CaseWithDetails | null> {
    const result = await this.pool.query(
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
  async updateCase(caseId: string, data: UpdateCaseDTO, userId?: string): Promise<Case> {
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

    const result = await this.pool.query(
      `UPDATE cases SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Update case status
   */
  async updateCaseStatus(
    caseId: string,
    data: UpdateCaseStatusDTO,
    userId?: string
  ): Promise<Case> {
    // Get current status
    const currentCase = await this.pool.query(`SELECT status_id FROM cases WHERE id = $1`, [caseId]);
    const previousStatusId = currentCase.rows[0]?.status_id;

    // Update case status
    const result = await this.pool.query(
      `UPDATE cases SET status_id = $1, modified_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [data.new_status_id, userId, caseId]
    );

    // Create status change note
    await this.pool.query(
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
  async getCaseNotes(caseId: string): Promise<CaseNote[]> {
    const result = await this.pool.query(
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
  async createCaseNote(data: CreateCaseNoteDTO, userId?: string): Promise<CaseNote> {
    const result = await this.pool.query(
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
  async getCaseSummary(): Promise<CaseSummary> {
    const result = await this.pool.query(`
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
        COUNT(*) FILTER (WHERE c.assigned_to IS NULL AND cs.status_type NOT IN ('closed', 'cancelled')) as unassigned,
        AVG(EXTRACT(EPOCH FROM (COALESCE(c.closed_date, NOW()) - c.intake_date)) / 86400)
          FILTER (WHERE cs.status_type IN ('closed', 'cancelled')) as avg_duration
      FROM cases c
      LEFT JOIN case_statuses cs ON c.status_id = cs.id
    `);

    // Get counts by case type
    const typeResult = await this.pool.query(`
      SELECT ct.name, COUNT(*) as count
      FROM cases c
      JOIN case_types ct ON c.case_type_id = ct.id
      GROUP BY ct.name
      ORDER BY count DESC
    `);

    const byCaseType: Record<string, number> = {};
    for (const row of typeResult.rows) {
      byCaseType[row.name] = parseInt(row.count);
    }

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
      by_case_type: byCaseType,
      average_case_duration_days: row.avg_duration ? Math.round(parseFloat(row.avg_duration)) : undefined,
      cases_due_this_week: parseInt(row.due_this_week),
      overdue_cases: parseInt(row.overdue),
      unassigned_cases: parseInt(row.unassigned),
    };
  }

  /**
   * Get case types
   */
  async getCaseTypes(): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM case_types WHERE is_active = true ORDER BY name`
    );
    return result.rows;
  }

  /**
   * Get case statuses
   */
  async getCaseStatuses(): Promise<any[]> {
    const result = await this.pool.query(
      `SELECT * FROM case_statuses WHERE is_active = true ORDER BY sort_order`
    );
    return result.rows;
  }

  /**
   * Get case milestones
   */
  async getCaseMilestones(caseId: string): Promise<CaseMilestone[]> {
    const result = await this.pool.query(
      `SELECT * FROM case_milestones WHERE case_id = $1 ORDER BY sort_order, due_date`,
      [caseId]
    );
    return result.rows;
  }

  /**
   * Create a case milestone
   */
  async createCaseMilestone(
    caseId: string,
    data: { milestone_name: string; description?: string; due_date?: string; sort_order?: number },
    userId?: string
  ): Promise<CaseMilestone> {
    const result = await this.pool.query(
      `INSERT INTO case_milestones (case_id, milestone_name, description, due_date, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [caseId, data.milestone_name, data.description || null, data.due_date || null, data.sort_order ?? 0, userId]
    );
    logger.info('Milestone created', { caseId, milestoneId: result.rows[0].id });
    return result.rows[0];
  }

  /**
   * Update a case milestone
   */
  async updateCaseMilestone(
    milestoneId: string,
    data: { milestone_name?: string; description?: string; due_date?: string; is_completed?: boolean; sort_order?: number }
  ): Promise<CaseMilestone> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.milestone_name !== undefined) {
      fields.push(`milestone_name = $${idx++}`);
      values.push(data.milestone_name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.due_date !== undefined) {
      fields.push(`due_date = $${idx++}`);
      values.push(data.due_date);
    }
    if (data.is_completed !== undefined) {
      fields.push(`is_completed = $${idx++}`);
      values.push(data.is_completed);
      if (data.is_completed) {
        fields.push(`completed_date = CURRENT_DATE`);
      } else {
        fields.push(`completed_date = NULL`);
      }
    }
    if (data.sort_order !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(data.sort_order);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(milestoneId);
    const result = await this.pool.query(
      `UPDATE case_milestones SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!result.rows[0]) {
      throw new Error('Milestone not found');
    }

    return result.rows[0];
  }

  /**
   * Delete a case milestone
   */
  async deleteCaseMilestone(milestoneId: string): Promise<void> {
    await this.pool.query(`DELETE FROM case_milestones WHERE id = $1`, [milestoneId]);
    logger.info('Milestone deleted', { milestoneId });
  }

  /**
   * Reassign a case with audit trail
   */
  async reassignCase(
    caseId: string,
    newAssigneeId: string | null,
    reason?: string,
    userId?: string
  ): Promise<Case> {
    // Get current assignment
    const currentCase = await this.pool.query(
      `SELECT assigned_to FROM cases WHERE id = $1`,
      [caseId]
    );
    const previousAssignee = currentCase.rows[0]?.assigned_to;

    // Record in assignment history (if assigning to someone)
    if (previousAssignee) {
      await this.pool.query(
        `UPDATE case_assignments SET unassigned_at = NOW(), unassigned_by = $1
         WHERE case_id = $2 AND assigned_to = $3 AND unassigned_at IS NULL`,
        [userId, caseId, previousAssignee]
      );
    }

    if (newAssigneeId) {
      await this.pool.query(
        `INSERT INTO case_assignments (case_id, assigned_from, assigned_to, assignment_reason, assigned_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [caseId, previousAssignee || null, newAssigneeId, reason || null, userId]
      );
    }

    // Update the case
    const result = await this.pool.query(
      `UPDATE cases SET assigned_to = $1, modified_by = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [newAssigneeId, userId, caseId]
    );

    // Add a note about the reassignment
    const noteContent = newAssigneeId
      ? `Case reassigned${reason ? `: ${reason}` : ''}`
      : `Case unassigned${reason ? `: ${reason}` : ''}`;

    await this.pool.query(
      `INSERT INTO case_notes (case_id, note_type, content, created_by)
       VALUES ($1, 'update', $2, $3)`,
      [caseId, noteContent, userId]
    );

    logger.info('Case reassigned', { caseId, from: previousAssignee, to: newAssigneeId });
    return result.rows[0];
  }

  /**
   * Bulk update case status
   */
  async bulkUpdateStatus(
    caseIds: string[],
    newStatusId: string,
    notes?: string,
    userId?: string
  ): Promise<{ updated: number }> {
    if (caseIds.length === 0) return { updated: 0 };

    // Get current statuses for all cases
    const currentCases = await this.pool.query(
      `SELECT id, status_id FROM cases WHERE id = ANY($1)`,
      [caseIds]
    );

    // Update all cases
    const updateResult = await this.pool.query(
      `UPDATE cases SET status_id = $1, modified_by = $2, updated_at = NOW() WHERE id = ANY($3)`,
      [newStatusId, userId, caseIds]
    );

    // Create status change notes for each case
    for (const row of currentCases.rows) {
      await this.pool.query(
        `INSERT INTO case_notes (case_id, note_type, content, previous_status_id, new_status_id, created_by)
         VALUES ($1, 'status_change', $2, $3, $4, $5)`,
        [row.id, notes || 'Bulk status update', row.status_id, newStatusId, userId]
      );
    }

    logger.info('Bulk status update', { count: updateResult.rowCount, newStatusId });
    return { updated: updateResult.rowCount || 0 };
  }

  /**
   * Delete case
   */
  async deleteCase(caseId: string): Promise<void> {
    await this.pool.query(`DELETE FROM cases WHERE id = $1`, [caseId]);
    logger.info(`Case deleted`, { caseId });
  }

  /**
   * Get case relationships
   */
  async getCaseRelationships(caseId: string): Promise<CaseRelationship[]> {
    const result = await this.pool.query(
      `SELECT cr.*, 
              c.case_number as related_case_number, 
              c.title as related_case_title
       FROM case_relationships cr
       JOIN cases c ON cr.related_case_id = c.id
       WHERE cr.case_id = $1
       ORDER BY cr.created_at DESC`,
      [caseId]
    );
    return result.rows;
  }

  /**
   * Create case relationship
   */
  async createCaseRelationship(
    caseId: string,
    data: CreateCaseRelationshipDTO,
    userId?: string
  ): Promise<CaseRelationship> {
    const result = await this.pool.query(
      `INSERT INTO case_relationships (case_id, related_case_id, relationship_type, description, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [caseId, data.related_case_id, data.relationship_type, data.description || null, userId]
    );
    logger.info('Case relationship created', { caseId, relatedCaseId: data.related_case_id });
    return result.rows[0];
  }

  /**
   * Delete case relationship
   */
  async deleteCaseRelationship(relationshipId: string): Promise<void> {
    await this.pool.query(`DELETE FROM case_relationships WHERE id = $1`, [relationshipId]);
    logger.info('Case relationship deleted', { relationshipId });
  }

  /**
   * Get case services
   */
  async getCaseServices(caseId: string): Promise<CaseServiceType[]> {
    const result = await this.pool.query(
      `
      SELECT cs.*,
             esp.provider_name as external_service_provider_name,
             esp.provider_type as external_service_provider_type
      FROM case_services cs
      LEFT JOIN external_service_providers esp ON cs.external_service_provider_id = esp.id
      WHERE cs.case_id = $1
      ORDER BY cs.service_date DESC, cs.start_time DESC
    `,
      [caseId]
    );
    return result.rows;
  }

  /**
   * Create case service
   */
  async createCaseService(
    caseId: string,
    data: CreateCaseServiceDTO,
    userId?: string
  ): Promise<CaseServiceType> {
    let providerResolution = await this.resolveExternalServiceProviderId(
      data.service_provider,
      data.service_type || null,
      userId
    );

    if (data.external_service_provider_id) {
      const selectedProvider = await this.getExternalProviderById(data.external_service_provider_id);
      if (selectedProvider) {
        providerResolution = {
          providerId: selectedProvider.id,
          providerName: selectedProvider.provider_name,
        };
      }
    }

    const result = await this.pool.query(
      `INSERT INTO case_services (
        case_id, service_name, service_type, service_provider, external_service_provider_id,
        service_date, start_time, end_time, duration_minutes, 
        status, outcome, cost, currency, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        caseId,
        data.service_name,
        data.service_type || null,
        providerResolution.providerName || null,
        data.external_service_provider_id || providerResolution.providerId || null,
        data.service_date,
        data.start_time || null,
        data.end_time || null,
        data.duration_minutes || null,
        data.status || 'scheduled',
        data.outcome || null,
        data.cost || null,
        data.currency || 'USD',
        data.notes || null,
        userId
      ]
    );
    logger.info('Case service created', { caseId, serviceId: result.rows[0].id });
    const joined = await this.pool.query(
      `
      SELECT cs.*,
             esp.provider_name as external_service_provider_name,
             esp.provider_type as external_service_provider_type
      FROM case_services cs
      LEFT JOIN external_service_providers esp ON cs.external_service_provider_id = esp.id
      WHERE cs.id = $1
    `,
      [result.rows[0].id]
    );
    return joined.rows[0];
  }

  /**
   * Update case service
   */
  async updateCaseService(
    serviceId: string,
    data: UpdateCaseServiceDTO,
    userId?: string
  ): Promise<CaseServiceType> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const payload: Record<string, unknown> = { ...data };

    if (data.service_provider !== undefined) {
      const providerResolution = await this.resolveExternalServiceProviderId(
        data.service_provider,
        data.service_type || null,
        userId
      );
      payload.service_provider = providerResolution.providerName;
      payload.external_service_provider_id = providerResolution.providerId;
    } else if (data.external_service_provider_id !== undefined) {
      const selectedProvider = await this.getExternalProviderById(data.external_service_provider_id);
      payload.service_provider = selectedProvider?.provider_name || null;
    }

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) throw new Error('No fields to update');

    values.push(serviceId);
    await this.pool.query(
      `UPDATE case_services SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    const result = await this.pool.query(
      `
      SELECT cs.*,
             esp.provider_name as external_service_provider_name,
             esp.provider_type as external_service_provider_type
      FROM case_services cs
      LEFT JOIN external_service_providers esp ON cs.external_service_provider_id = esp.id
      WHERE cs.id = $1
    `,
      [serviceId]
    );

    if (!result.rows[0]) throw new Error('Service not found');
    return result.rows[0];
  }

  /**
   * Delete case service
   */
  async deleteCaseService(serviceId: string): Promise<void> {
    await this.pool.query(`DELETE FROM case_services WHERE id = $1`, [serviceId]);
    logger.info('Case service deleted', { serviceId });
  }
}

// Backwards compatible exports for existing code
const caseServiceInstance = new CaseService(pool);

export const createCase = caseServiceInstance.createCase.bind(caseServiceInstance);
export const getCases = caseServiceInstance.getCases.bind(caseServiceInstance);
export const getCaseById = caseServiceInstance.getCaseById.bind(caseServiceInstance);
export const updateCase = caseServiceInstance.updateCase.bind(caseServiceInstance);
export const updateCaseStatus = caseServiceInstance.updateCaseStatus.bind(caseServiceInstance);
export const getCaseNotes = caseServiceInstance.getCaseNotes.bind(caseServiceInstance);
export const createCaseNote = caseServiceInstance.createCaseNote.bind(caseServiceInstance);
export const getCaseSummary = caseServiceInstance.getCaseSummary.bind(caseServiceInstance);
export const getCaseTypes = caseServiceInstance.getCaseTypes.bind(caseServiceInstance);
export const getCaseStatuses = caseServiceInstance.getCaseStatuses.bind(caseServiceInstance);
export const deleteCase = caseServiceInstance.deleteCase.bind(caseServiceInstance);
export const getCaseMilestones = caseServiceInstance.getCaseMilestones.bind(caseServiceInstance);
export const createCaseMilestone = caseServiceInstance.createCaseMilestone.bind(caseServiceInstance);
export const updateCaseMilestone = caseServiceInstance.updateCaseMilestone.bind(caseServiceInstance);
export const deleteCaseMilestone = caseServiceInstance.deleteCaseMilestone.bind(caseServiceInstance);
export const reassignCase = caseServiceInstance.reassignCase.bind(caseServiceInstance);
export const bulkUpdateStatus = caseServiceInstance.bulkUpdateStatus.bind(caseServiceInstance);

export const getCaseRelationships = caseServiceInstance.getCaseRelationships.bind(caseServiceInstance);
export const createCaseRelationship = caseServiceInstance.createCaseRelationship.bind(caseServiceInstance);
export const deleteCaseRelationship = caseServiceInstance.deleteCaseRelationship.bind(caseServiceInstance);
export const getCaseServices = caseServiceInstance.getCaseServices.bind(caseServiceInstance);
export const createCaseService = caseServiceInstance.createCaseService.bind(caseServiceInstance);
export const updateCaseService = caseServiceInstance.updateCaseService.bind(caseServiceInstance);
export const deleteCaseService = caseServiceInstance.deleteCaseService.bind(caseServiceInstance);
