/**
 * Case Management Service
 * Handles all case management operations
 */

import { Pool } from 'pg';
import pool from '@config/database';
import { logger } from '@config/logger';
import type {
  Case,
  CaseDocument,
  CaseOutcomeEvent,
  CaseTimelineEvent,
  CaseTopicDefinition,
  CaseTopicEvent,
  CaseWithDetails,
  CaseFilter,
  CreateCaseDTO,
  UpdateCaseDTO,
  CaseSummary,
  CaseNote,
  CreateCaseNoteDTO,
  UpdateCaseNoteDTO,
  CreateCaseOutcomeDTO,
  UpdateCaseOutcomeDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  UpdateCaseDocumentDTO,
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

  private normalizeCasePriority(priority?: string | null): string | null | undefined {
    if (priority === undefined) return undefined;
    if (priority === null) return null;
    if (priority === 'critical') return 'urgent';
    return priority;
  }

  private normalizeCaseNoteType(noteType?: string): string | undefined {
    if (!noteType) return noteType;
    if (noteType === 'case_note') return 'note';
    return noteType;
  }

  private toBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
      if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    }
    return undefined;
  }

  private resolveVisibleToClient(input: {
    visible_to_client?: unknown;
    is_portal_visible?: unknown;
    is_internal?: unknown;
  }): boolean {
    const explicitVisible = this.toBoolean(input.visible_to_client);
    if (explicitVisible !== undefined) return explicitVisible;

    const portalVisible = this.toBoolean(input.is_portal_visible);
    if (portalVisible !== undefined) return portalVisible;

    const isInternal = this.toBoolean(input.is_internal);
    if (isInternal !== undefined) return !isInternal;

    return false;
  }

  private async getCaseOwnership(caseId: string): Promise<{ case_id: string; contact_id: string; account_id: string | null } | null> {
    const result = await this.pool.query(
      `
      SELECT id AS case_id, contact_id, account_id
      FROM cases
      WHERE id = $1
      LIMIT 1
    `,
      [caseId]
    );

    return result.rows[0] || null;
  }

  private async requireCaseOwnership(caseId: string): Promise<{ case_id: string; contact_id: string; account_id: string | null }> {
    const ownership = await this.getCaseOwnership(caseId);
    if (!ownership) {
      throw new Error('Case not found');
    }

    return ownership;
  }

  private async requireCaseIdForNote(noteId: string): Promise<string> {
    const result = await this.pool.query(
      `
      SELECT case_id
      FROM case_notes
      WHERE id = $1
      LIMIT 1
    `,
      [noteId]
    );

    const caseId = result.rows[0]?.case_id as string | undefined;
    if (!caseId) {
      throw new Error('Case note not found');
    }
    return caseId;
  }

  private async requireCaseIdForOutcome(outcomeId: string): Promise<string> {
    const result = await this.pool.query(
      `
      SELECT case_id
      FROM case_outcomes
      WHERE id = $1
      LIMIT 1
    `,
      [outcomeId]
    );

    const caseId = result.rows[0]?.case_id as string | undefined;
    if (!caseId) {
      throw new Error('Case outcome not found');
    }
    return caseId;
  }

  private async requireCaseIdForTopicEvent(topicEventId: string): Promise<string> {
    const result = await this.pool.query(
      `
      SELECT case_id
      FROM case_topic_events
      WHERE id = $1
      LIMIT 1
    `,
      [topicEventId]
    );

    const caseId = result.rows[0]?.case_id as string | undefined;
    if (!caseId) {
      throw new Error('Case topic event not found');
    }
    return caseId;
  }

  private async requireCaseIdForDocument(documentId: string): Promise<string> {
    const result = await this.pool.query(
      `
      SELECT case_id
      FROM case_documents
      WHERE id = $1
      LIMIT 1
    `,
      [documentId]
    );

    const caseId = result.rows[0]?.case_id as string | undefined;
    if (!caseId) {
      throw new Error('Case document not found');
    }
    return caseId;
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
        this.normalizeCasePriority(data.priority) || 'medium',
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
      values.push(this.normalizeCasePriority(data.priority));
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
    await this.requireCaseOwnership(data.case_id);
    const visibleToClient = this.resolveVisibleToClient({
      visible_to_client: data.visible_to_client,
      is_portal_visible: data.is_portal_visible,
      is_internal: data.is_internal,
    });
    const isInternal = data.is_internal !== undefined ? data.is_internal : !visibleToClient;

    const insertedResult = await this.pool.query(
      `
      INSERT INTO case_notes (
        case_id, note_type, subject, category, content, is_internal, visible_to_client, is_important, attachments, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `,
      [
        data.case_id,
        this.normalizeCaseNoteType(data.note_type) || 'note',
        data.subject || null,
        data.category || null,
        data.content,
        isInternal,
        visibleToClient,
        data.is_important || false,
        JSON.stringify(data.attachments || null),
        userId,
        userId || null,
      ]
    );

    const noteId = insertedResult.rows[0]?.id;

    const result = await this.pool.query(
      `
      SELECT
        cn.*,
        u.first_name,
        u.last_name,
        '[]'::json AS outcome_impacts
      FROM case_notes cn
      LEFT JOIN users u ON cn.created_by = u.id
      WHERE cn.id = $1
      LIMIT 1
    `,
      [noteId]
    );

    return result.rows[0];
  }

  /**
   * Update case note
   */
  async updateCaseNote(noteId: string, data: UpdateCaseNoteDTO, userId?: string): Promise<CaseNote> {
    const caseId = await this.requireCaseIdForNote(noteId);
    await this.requireCaseOwnership(caseId);

    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.note_type !== undefined) {
      fields.push(`note_type = $${index++}`);
      values.push(this.normalizeCaseNoteType(data.note_type) || 'note');
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
      const visible = this.resolveVisibleToClient({
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

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    fields.push(`updated_by = $${index++}`);
    values.push(userId || null);
    values.push(noteId, caseId);

    const updated = await this.pool.query(
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

    const result = await this.pool.query(
      `
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
      WHERE cn.id = $1
      LIMIT 1
    `,
      [noteId]
    );

    return result.rows[0];
  }

  /**
   * Delete case note
   */
  async deleteCaseNote(noteId: string): Promise<boolean> {
    const caseId = await this.requireCaseIdForNote(noteId);
    await this.requireCaseOwnership(caseId);

    const result = await this.pool.query(
      `
      DELETE FROM case_notes
      WHERE id = $1
        AND case_id = $2
      RETURNING id
    `,
      [noteId, caseId]
    );
    return Boolean(result.rows[0]);
  }

  /**
   * List structured case outcomes
   */
  async getCaseOutcomes(caseId: string): Promise<CaseOutcomeEvent[]> {
    await this.requireCaseOwnership(caseId);
    const result = await this.pool.query(
      `
      SELECT
        co.*,
        u.first_name,
        u.last_name
      FROM case_outcomes co
      LEFT JOIN users u ON u.id = co.created_by
      WHERE co.case_id = $1
      ORDER BY co.outcome_date DESC, co.created_at DESC
    `,
      [caseId]
    );

    return result.rows;
  }

  /**
   * Create structured case outcome
   */
  async createCaseOutcome(caseId: string, data: CreateCaseOutcomeDTO, userId?: string): Promise<CaseOutcomeEvent> {
    const ownership = await this.requireCaseOwnership(caseId);
    const visibleToClient = this.resolveVisibleToClient({
      visible_to_client: data.visible_to_client,
      is_portal_visible: data.is_portal_visible,
    });
    const result = await this.pool.query(
      `
      INSERT INTO case_outcomes (
        case_id,
        account_id,
        outcome_type,
        outcome_date,
        notes,
        visible_to_client,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, $6, $7, $7)
      RETURNING *
    `,
      [
        caseId,
        ownership.account_id,
        data.outcome_type || null,
        data.outcome_date || null,
        data.notes || null,
        visibleToClient,
        userId || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update structured case outcome
   */
  async updateCaseOutcome(outcomeId: string, data: UpdateCaseOutcomeDTO, userId?: string): Promise<CaseOutcomeEvent> {
    const caseId = await this.requireCaseIdForOutcome(outcomeId);
    await this.requireCaseOwnership(caseId);

    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.outcome_type !== undefined) {
      fields.push(`outcome_type = $${index++}`);
      values.push(data.outcome_type || null);
    }

    if (data.outcome_date !== undefined) {
      fields.push(`outcome_date = $${index++}`);
      values.push(data.outcome_date);
    }

    if (data.notes !== undefined) {
      fields.push(`notes = $${index++}`);
      values.push(data.notes || null);
    }

    if (data.visible_to_client !== undefined || data.is_portal_visible !== undefined) {
      fields.push(`visible_to_client = $${index++}`);
      values.push(
        this.resolveVisibleToClient({
          visible_to_client: data.visible_to_client,
          is_portal_visible: data.is_portal_visible,
        })
      );
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    fields.push(`updated_by = $${index++}`);
    values.push(userId || null);
    values.push(outcomeId, caseId);

    const result = await this.pool.query(
      `
      UPDATE case_outcomes
      SET ${fields.join(', ')}
      WHERE id = $${index}
        AND case_id = $${index + 1}
      RETURNING *
    `,
      values
    );

    if (!result.rows[0]) {
      throw new Error('Case outcome not found');
    }

    return result.rows[0];
  }

  /**
   * Delete structured case outcome
   */
  async deleteCaseOutcome(outcomeId: string): Promise<boolean> {
    const caseId = await this.requireCaseIdForOutcome(outcomeId);
    await this.requireCaseOwnership(caseId);

    const result = await this.pool.query(
      `
      DELETE FROM case_outcomes
      WHERE id = $1
        AND case_id = $2
      RETURNING id
    `,
      [outcomeId, caseId]
    );
    return Boolean(result.rows[0]);
  }

  /**
   * Topic definitions for a case (account-scoped)
   */
  async getCaseTopicDefinitions(caseId: string): Promise<CaseTopicDefinition[]> {
    const ownership = await this.requireCaseOwnership(caseId);
    const result = await this.pool.query(
      `
      SELECT *
      FROM case_topic_definitions
      WHERE is_active = true
        AND (
          ($1::uuid IS NULL AND account_id IS NULL)
          OR account_id = $1
        )
      ORDER BY name ASC
    `,
      [ownership.account_id]
    );
    return result.rows;
  }

  /**
   * Create topic definition for case account scope
   */
  async createCaseTopicDefinition(caseId: string, data: CreateCaseTopicDefinitionDTO, userId?: string): Promise<CaseTopicDefinition> {
    const ownership = await this.requireCaseOwnership(caseId);
    const normalized = data.name.trim().toLowerCase().replace(/\s+/g, ' ');
    const result = await this.pool.query(
      `
      INSERT INTO case_topic_definitions (
        account_id, name, normalized_name, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $4)
      ON CONFLICT (account_id, normalized_name)
      DO UPDATE SET
        name = EXCLUDED.name,
        is_active = true,
        updated_at = NOW(),
        updated_by = EXCLUDED.updated_by
      RETURNING *
    `,
      [ownership.account_id, data.name.trim(), normalized, userId || null]
    );

    return result.rows[0];
  }

  /**
   * List case topic events
   */
  async getCaseTopicEvents(caseId: string): Promise<CaseTopicEvent[]> {
    await this.requireCaseOwnership(caseId);
    const result = await this.pool.query(
      `
      SELECT
        cte.*,
        ctd.name AS topic_name,
        u.first_name,
        u.last_name
      FROM case_topic_events cte
      JOIN case_topic_definitions ctd ON ctd.id = cte.topic_definition_id
      LEFT JOIN users u ON u.id = cte.created_by
      WHERE cte.case_id = $1
      ORDER BY cte.discussed_at DESC, cte.created_at DESC
    `,
      [caseId]
    );
    return result.rows;
  }

  /**
   * Add topic event to case
   */
  async addCaseTopicEvent(caseId: string, data: CreateCaseTopicEventDTO, userId?: string): Promise<CaseTopicEvent> {
    const ownership = await this.requireCaseOwnership(caseId);
    let topicDefinitionId = data.topic_definition_id || null;

    if (!topicDefinitionId && data.topic_name) {
      const createdDefinition = await this.createCaseTopicDefinition(caseId, { name: data.topic_name }, userId);
      topicDefinitionId = createdDefinition.id;
    }

    if (!topicDefinitionId) {
      throw new Error('topic_definition_id or topic_name is required');
    }

    const result = await this.pool.query(
      `
      INSERT INTO case_topic_events (
        case_id,
        account_id,
        topic_definition_id,
        discussed_at,
        notes,
        created_by,
        updated_by
      )
      VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()), $5, $6, $6)
      RETURNING *
    `,
      [
        caseId,
        ownership.account_id,
        topicDefinitionId,
        data.discussed_at || null,
        data.notes || null,
        userId || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Remove topic event from case
   */
  async deleteCaseTopicEvent(topicEventId: string): Promise<boolean> {
    const caseId = await this.requireCaseIdForTopicEvent(topicEventId);
    await this.requireCaseOwnership(caseId);

    const result = await this.pool.query(
      `
      DELETE FROM case_topic_events
      WHERE id = $1
        AND case_id = $2
      RETURNING id
    `,
      [topicEventId, caseId]
    );
    return Boolean(result.rows[0]);
  }

  /**
   * List case documents
   */
  async getCaseDocuments(caseId: string): Promise<CaseDocument[]> {
    await this.requireCaseOwnership(caseId);
    const result = await this.pool.query(
      `
      SELECT
        cd.*,
        COALESCE(cd.original_filename, cd.document_name) AS original_filename,
        COALESCE(cd.file_size, 0)::bigint AS file_size,
        u.first_name,
        u.last_name
      FROM case_documents cd
      LEFT JOIN users u ON u.id = cd.uploaded_by
      WHERE cd.case_id = $1
        AND COALESCE(cd.is_active, true) = true
      ORDER BY COALESCE(cd.created_at, cd.uploaded_at) DESC, cd.uploaded_at DESC
    `,
      [caseId]
    );
    return result.rows;
  }

  /**
   * Get case document by id with ownership checks
   */
  async getCaseDocumentById(caseId: string, documentId: string): Promise<CaseDocument | null> {
    await this.requireCaseOwnership(caseId);
    const result = await this.pool.query(
      `
      SELECT
        cd.*,
        COALESCE(cd.original_filename, cd.document_name) AS original_filename,
        COALESCE(cd.file_size, 0)::bigint AS file_size
      FROM case_documents cd
      WHERE cd.id = $1
        AND cd.case_id = $2
        AND COALESCE(cd.is_active, true) = true
      LIMIT 1
    `,
      [documentId, caseId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create case document metadata row
   */
  async createCaseDocument(input: {
    caseId: string;
    fileName: string;
    originalFilename: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    documentType?: string;
    documentName?: string;
    description?: string;
    visibleToClient?: boolean;
    userId?: string;
  }): Promise<CaseDocument> {
    const ownership = await this.requireCaseOwnership(input.caseId);

    const result = await this.pool.query(
      `
      INSERT INTO case_documents (
        case_id,
        account_id,
        document_name,
        document_type,
        description,
        file_path,
        file_size,
        mime_type,
        file_name,
        original_filename,
        visible_to_client,
        is_active,
        uploaded_at,
        uploaded_by,
        created_at,
        updated_at,
        updated_by
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), $12, NOW(), NOW(), $12
      )
      RETURNING *
    `,
      [
        input.caseId,
        ownership.account_id,
        input.documentName?.trim() || input.originalFilename,
        input.documentType || 'other',
        input.description?.trim() || null,
        input.filePath,
        input.fileSize,
        input.mimeType,
        input.fileName,
        input.originalFilename,
        input.visibleToClient || false,
        input.userId || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update case document metadata
   */
  async updateCaseDocument(documentId: string, data: UpdateCaseDocumentDTO, userId?: string): Promise<CaseDocument> {
    const caseId = await this.requireCaseIdForDocument(documentId);
    await this.requireCaseOwnership(caseId);

    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (data.document_name !== undefined) {
      fields.push(`document_name = $${index++}`);
      values.push(data.document_name || null);
    }

    if (data.document_type !== undefined) {
      fields.push(`document_type = $${index++}`);
      values.push(data.document_type || null);
    }

    if (data.description !== undefined) {
      fields.push(`description = $${index++}`);
      values.push(data.description || null);
    }

    if (data.visible_to_client !== undefined || data.is_portal_visible !== undefined) {
      fields.push(`visible_to_client = $${index++}`);
      values.push(
        this.resolveVisibleToClient({
          visible_to_client: data.visible_to_client,
          is_portal_visible: data.is_portal_visible,
        })
      );
    }

    if (data.is_active !== undefined) {
      fields.push(`is_active = $${index++}`);
      values.push(data.is_active);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    fields.push(`updated_by = $${index++}`);
    values.push(userId || null);
    values.push(documentId, caseId);

    const result = await this.pool.query(
      `
      UPDATE case_documents
      SET ${fields.join(', ')}
      WHERE id = $${index}
        AND case_id = $${index + 1}
      RETURNING *
    `,
      values
    );

    if (!result.rows[0]) {
      throw new Error('Case document not found');
    }

    return result.rows[0];
  }

  /**
   * Soft delete case document
   */
  async deleteCaseDocument(documentId: string, userId?: string): Promise<boolean> {
    const caseId = await this.requireCaseIdForDocument(documentId);
    await this.requireCaseOwnership(caseId);

    const result = await this.pool.query(
      `
      UPDATE case_documents
      SET is_active = false, updated_at = NOW(), updated_by = $2
      WHERE id = $1
        AND case_id = $3
      RETURNING id
    `,
      [documentId, userId || null, caseId]
    );
    return Boolean(result.rows[0]);
  }

  /**
   * Aggregate case timeline
   */
  async getCaseTimeline(caseId: string): Promise<CaseTimelineEvent[]> {
    await this.requireCaseOwnership(caseId);
    const result = await this.pool.query(
      `
      SELECT * FROM (
        SELECT
          cn.id,
          'note'::text AS type,
          cn.case_id,
          cn.created_at,
          cn.visible_to_client,
          COALESCE(cn.subject, cn.note_type, 'Note') AS title,
          cn.content,
          jsonb_build_object(
            'note_type', cn.note_type,
            'category', cn.category,
            'is_important', cn.is_important,
            'is_internal', cn.is_internal
          ) AS metadata,
          cn.created_by,
          u.first_name,
          u.last_name
        FROM case_notes cn
        LEFT JOIN users u ON u.id = cn.created_by
        WHERE cn.case_id = $1

        UNION ALL

        SELECT
          co.id,
          'outcome'::text AS type,
          co.case_id,
          co.created_at,
          co.visible_to_client,
          COALESCE(co.outcome_type, 'Outcome') AS title,
          co.notes AS content,
          jsonb_build_object(
            'outcome_date', co.outcome_date
          ) AS metadata,
          co.created_by,
          u.first_name,
          u.last_name
        FROM case_outcomes co
        LEFT JOIN users u ON u.id = co.created_by
        WHERE co.case_id = $1

        UNION ALL

        SELECT
          cte.id,
          'topic'::text AS type,
          cte.case_id,
          cte.created_at,
          false AS visible_to_client,
          ctd.name AS title,
          cte.notes AS content,
          jsonb_build_object(
            'discussed_at', cte.discussed_at
          ) AS metadata,
          cte.created_by,
          u.first_name,
          u.last_name
        FROM case_topic_events cte
        JOIN case_topic_definitions ctd ON ctd.id = cte.topic_definition_id
        LEFT JOIN users u ON u.id = cte.created_by
        WHERE cte.case_id = $1

        UNION ALL

        SELECT
          cd.id,
          'document'::text AS type,
          cd.case_id,
          COALESCE(cd.created_at, cd.uploaded_at) AS created_at,
          cd.visible_to_client,
          COALESCE(cd.document_name, cd.original_filename, cd.file_name, 'Document') AS title,
          cd.description AS content,
          jsonb_build_object(
            'document_type', cd.document_type,
            'mime_type', cd.mime_type,
            'file_size', cd.file_size,
            'original_filename', COALESCE(cd.original_filename, cd.document_name)
          ) AS metadata,
          cd.uploaded_by AS created_by,
          u.first_name,
          u.last_name
        FROM case_documents cd
        LEFT JOIN users u ON u.id = cd.uploaded_by
        WHERE cd.case_id = $1
          AND COALESCE(cd.is_active, true) = true
      ) timeline
      ORDER BY created_at DESC, id DESC
    `,
      [caseId]
    );

    return result.rows;
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
export const updateCaseNote = caseServiceInstance.updateCaseNote.bind(caseServiceInstance);
export const deleteCaseNote = caseServiceInstance.deleteCaseNote.bind(caseServiceInstance);
export const getCaseOutcomes = caseServiceInstance.getCaseOutcomes.bind(caseServiceInstance);
export const createCaseOutcome = caseServiceInstance.createCaseOutcome.bind(caseServiceInstance);
export const updateCaseOutcome = caseServiceInstance.updateCaseOutcome.bind(caseServiceInstance);
export const deleteCaseOutcome = caseServiceInstance.deleteCaseOutcome.bind(caseServiceInstance);
export const getCaseTopicDefinitions = caseServiceInstance.getCaseTopicDefinitions.bind(caseServiceInstance);
export const createCaseTopicDefinition = caseServiceInstance.createCaseTopicDefinition.bind(caseServiceInstance);
export const getCaseTopicEvents = caseServiceInstance.getCaseTopicEvents.bind(caseServiceInstance);
export const addCaseTopicEvent = caseServiceInstance.addCaseTopicEvent.bind(caseServiceInstance);
export const deleteCaseTopicEvent = caseServiceInstance.deleteCaseTopicEvent.bind(caseServiceInstance);
export const getCaseDocuments = caseServiceInstance.getCaseDocuments.bind(caseServiceInstance);
export const getCaseDocumentById = caseServiceInstance.getCaseDocumentById.bind(caseServiceInstance);
export const createCaseDocument = caseServiceInstance.createCaseDocument.bind(caseServiceInstance);
export const updateCaseDocument = caseServiceInstance.updateCaseDocument.bind(caseServiceInstance);
export const deleteCaseDocument = caseServiceInstance.deleteCaseDocument.bind(caseServiceInstance);
export const getCaseTimeline = caseServiceInstance.getCaseTimeline.bind(caseServiceInstance);
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
