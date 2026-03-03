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
import {
  getCaseByIdQuery,
  getCaseStatusesQuery,
  getCaseSummaryQuery,
  getCasesQuery,
  getCaseTimelineQuery,
  getCaseTypesQuery,
} from '@modules/cases/queries/catalogQueries';
import {
  bulkUpdateStatusQuery,
  createCaseQuery,
  deleteCaseQuery,
  reassignCaseQuery,
  updateCaseQuery,
  updateCaseStatusQuery,
} from '@modules/cases/queries/lifecycleQueries';
import {
  createCaseNoteQuery,
  deleteCaseNoteQuery,
  getCaseNotesQuery,
  updateCaseNoteQuery,
} from '@modules/cases/queries/notesQueries';
import {
  addCaseTopicEventQuery,
  createCaseOutcomeQuery,
  createCaseTopicDefinitionQuery,
  deleteCaseOutcomeQuery,
  deleteCaseTopicEventQuery,
  getCaseOutcomesQuery,
  getCaseTopicDefinitionsQuery,
  getCaseTopicEventsQuery,
  updateCaseOutcomeQuery,
} from '@modules/cases/queries/outcomesQueries';
import {
  createCaseDocumentQuery,
  deleteCaseDocumentQuery,
  getCaseDocumentByIdQuery,
  getCaseDocumentsQuery,
  updateCaseDocumentQuery,
} from '@modules/cases/queries/documentsQueries';

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
   * Create a new case
   */
  async createCase(data: CreateCaseDTO, userId?: string): Promise<Case> {
    return createCaseQuery(this.pool, data, userId);
  }

  /**
   * Get cases with filtering
   */
  async getCases(filter: CaseFilter = {}): Promise<{ cases: CaseWithDetails[]; total: number }> {
    return getCasesQuery(this.pool, filter);
  }

  /**
   * Get case by ID
   */
  async getCaseById(caseId: string): Promise<CaseWithDetails | null> {
    return getCaseByIdQuery(this.pool, caseId);
  }

  /**
   * Update case
   */
  async updateCase(caseId: string, data: UpdateCaseDTO, userId?: string): Promise<Case> {
    return updateCaseQuery(this.pool, caseId, data, userId);
  }

  /**
   * Update case status
   */
  async updateCaseStatus(
    caseId: string,
    data: UpdateCaseStatusDTO,
    userId?: string
  ): Promise<Case> {
    return updateCaseStatusQuery(this.pool, caseId, data, userId);
  }

  /**
   * Get case notes
   */
  async getCaseNotes(caseId: string): Promise<CaseNote[]> {
    return getCaseNotesQuery(this.pool, caseId);
  }

  /**
   * Create case note
   */
  async createCaseNote(data: CreateCaseNoteDTO, userId?: string): Promise<CaseNote> {
    return createCaseNoteQuery(this.pool, data, userId);
  }

  /**
   * Update case note
   */
  async updateCaseNote(noteId: string, data: UpdateCaseNoteDTO, userId?: string): Promise<CaseNote> {
    return updateCaseNoteQuery(this.pool, noteId, data, userId);
  }

  /**
   * Delete case note
   */
  async deleteCaseNote(noteId: string): Promise<boolean> {
    return deleteCaseNoteQuery(this.pool, noteId);
  }

  /**
   * List structured case outcomes
   */
  async getCaseOutcomes(caseId: string): Promise<CaseOutcomeEvent[]> {
    return getCaseOutcomesQuery(this.pool, caseId);
  }

  /**
   * Create structured case outcome
   */
  async createCaseOutcome(caseId: string, data: CreateCaseOutcomeDTO, userId?: string): Promise<CaseOutcomeEvent> {
    return createCaseOutcomeQuery(this.pool, caseId, data, userId);
  }

  /**
   * Update structured case outcome
   */
  async updateCaseOutcome(outcomeId: string, data: UpdateCaseOutcomeDTO, userId?: string): Promise<CaseOutcomeEvent> {
    return updateCaseOutcomeQuery(this.pool, outcomeId, data, userId);
  }

  /**
   * Delete structured case outcome
   */
  async deleteCaseOutcome(outcomeId: string): Promise<boolean> {
    return deleteCaseOutcomeQuery(this.pool, outcomeId);
  }

  /**
   * Topic definitions for a case (account-scoped)
   */
  async getCaseTopicDefinitions(caseId: string): Promise<CaseTopicDefinition[]> {
    return getCaseTopicDefinitionsQuery(this.pool, caseId);
  }

  /**
   * Create topic definition for case account scope
   */
  async createCaseTopicDefinition(caseId: string, data: CreateCaseTopicDefinitionDTO, userId?: string): Promise<CaseTopicDefinition> {
    return createCaseTopicDefinitionQuery(this.pool, caseId, data, userId);
  }

  /**
   * List case topic events
   */
  async getCaseTopicEvents(caseId: string): Promise<CaseTopicEvent[]> {
    return getCaseTopicEventsQuery(this.pool, caseId);
  }

  /**
   * Add topic event to case
   */
  async addCaseTopicEvent(caseId: string, data: CreateCaseTopicEventDTO, userId?: string): Promise<CaseTopicEvent> {
    return addCaseTopicEventQuery(this.pool, caseId, data, userId);
  }

  /**
   * Remove topic event from case
   */
  async deleteCaseTopicEvent(topicEventId: string): Promise<boolean> {
    return deleteCaseTopicEventQuery(this.pool, topicEventId);
  }

  /**
   * List case documents
   */
  async getCaseDocuments(caseId: string): Promise<CaseDocument[]> {
    return getCaseDocumentsQuery(this.pool, caseId);
  }

  /**
   * Get case document by id with ownership checks
   */
  async getCaseDocumentById(caseId: string, documentId: string): Promise<CaseDocument | null> {
    return getCaseDocumentByIdQuery(this.pool, caseId, documentId);
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
    return createCaseDocumentQuery(this.pool, input);
  }

  /**
   * Update case document metadata
   */
  async updateCaseDocument(documentId: string, data: UpdateCaseDocumentDTO, userId?: string): Promise<CaseDocument> {
    return updateCaseDocumentQuery(this.pool, documentId, data, userId);
  }

  /**
   * Soft delete case document
   */
  async deleteCaseDocument(documentId: string, userId?: string): Promise<boolean> {
    return deleteCaseDocumentQuery(this.pool, documentId, userId);
  }

  /**
   * Aggregate case timeline
   */
  async getCaseTimeline(
    caseId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ items: CaseTimelineEvent[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> {
    return getCaseTimelineQuery(this.pool, caseId, options);
  }

  /**
   * Get case summary statistics
   */
  async getCaseSummary(organizationId?: string): Promise<CaseSummary> {
    return getCaseSummaryQuery(this.pool, organizationId);
  }

  /**
   * Get case types
   */
  async getCaseTypes(): Promise<any[]> {
    return (await getCaseTypesQuery(this.pool)) as any[];
  }

  /**
   * Get case statuses
   */
  async getCaseStatuses(): Promise<any[]> {
    return (await getCaseStatusesQuery(this.pool)) as any[];
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
    return reassignCaseQuery(
      this.pool,
      caseId,
      {
        assigned_to: newAssigneeId,
        reason,
      },
      userId
    );
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
    return bulkUpdateStatusQuery(
      this.pool,
      {
        case_ids: caseIds,
        new_status_id: newStatusId,
        notes,
      },
      userId
    );
  }

  /**
   * Delete case
   */
  async deleteCase(caseId: string): Promise<void> {
    return deleteCaseQuery(this.pool, caseId);
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
