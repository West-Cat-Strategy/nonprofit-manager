/**
 * Case Management Service
 * Handles case management operations for the module
 */

import { Pool } from 'pg';
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
  createCaseMilestoneQuery,
  deleteCaseMilestoneQuery,
  getCaseMilestonesQuery,
  updateCaseMilestoneQuery,
} from '@modules/cases/queries/milestonesQueries';
import {
  bulkUpdateStatusQuery,
  createCaseQuery,
  deleteCaseQuery,
  reassignCaseQuery,
  updateCaseQuery,
  updateCaseStatusQuery,
} from '@modules/cases/queries/lifecycleQueries';
import {
  createCaseRelationshipQuery,
  deleteCaseRelationshipQuery,
  getCaseRelationshipsQuery,
} from '@modules/cases/queries/relationshipsQueries';
import {
  createCaseNoteQuery,
  deleteCaseNoteQuery,
  getCaseNotesQuery,
  updateCaseNoteQuery,
} from '@modules/cases/queries/notesQueries';
import {
  createCaseServiceQuery,
  deleteCaseServiceQuery,
  getCaseServicesQuery,
  updateCaseServiceQuery,
} from '@modules/cases/queries/servicesQueries';
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
  async getCaseById(caseId: string, organizationId?: string): Promise<CaseWithDetails | null> {
    return getCaseByIdQuery(this.pool, caseId, organizationId);
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
  async getCaseNotes(caseId: string, organizationId?: string): Promise<CaseNote[]> {
    return getCaseNotesQuery(this.pool, caseId, organizationId);
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
  async getCaseOutcomes(caseId: string, organizationId?: string): Promise<CaseOutcomeEvent[]> {
    return getCaseOutcomesQuery(this.pool, caseId, organizationId);
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
  async getCaseTopicDefinitions(caseId: string, organizationId?: string): Promise<CaseTopicDefinition[]> {
    return getCaseTopicDefinitionsQuery(this.pool, caseId, organizationId);
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
  async getCaseTopicEvents(caseId: string, organizationId?: string): Promise<CaseTopicEvent[]> {
    return getCaseTopicEventsQuery(this.pool, caseId, organizationId);
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
  async getCaseDocuments(caseId: string, organizationId?: string): Promise<CaseDocument[]> {
    return getCaseDocumentsQuery(this.pool, caseId, organizationId);
  }

  /**
   * Get case document by id with ownership checks
   */
  async getCaseDocumentById(caseId: string, documentId: string, organizationId?: string): Promise<CaseDocument | null> {
    return getCaseDocumentByIdQuery(this.pool, caseId, documentId, organizationId);
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
    options?: { limit?: number; cursor?: string },
    organizationId?: string
  ): Promise<{ items: CaseTimelineEvent[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }> {
    return getCaseTimelineQuery(this.pool, caseId, options, organizationId);
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
    return getCaseMilestonesQuery(this.pool, caseId);
  }

  /**
   * Create a case milestone
   */
  async createCaseMilestone(
    caseId: string,
    data: { milestone_name: string; description?: string; due_date?: string; sort_order?: number },
    userId?: string
  ): Promise<CaseMilestone> {
    return createCaseMilestoneQuery(this.pool, caseId, data, userId);
  }

  /**
   * Update a case milestone
   */
  async updateCaseMilestone(
    milestoneId: string,
    data: { milestone_name?: string; description?: string; due_date?: string; is_completed?: boolean; sort_order?: number }
  ): Promise<CaseMilestone> {
    return updateCaseMilestoneQuery(this.pool, milestoneId, data);
  }

  /**
   * Delete a case milestone
   */
  async deleteCaseMilestone(milestoneId: string): Promise<void> {
    return deleteCaseMilestoneQuery(this.pool, milestoneId);
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
    return getCaseRelationshipsQuery(this.pool, caseId);
  }

  /**
   * Create case relationship
   */
  async createCaseRelationship(
    caseId: string,
    data: CreateCaseRelationshipDTO,
    userId?: string
  ): Promise<CaseRelationship> {
    return createCaseRelationshipQuery(this.pool, caseId, data, userId);
  }

  /**
   * Delete case relationship
   */
  async deleteCaseRelationship(relationshipId: string): Promise<void> {
    return deleteCaseRelationshipQuery(this.pool, relationshipId);
  }

  /**
   * Get case services
   */
  async getCaseServices(caseId: string): Promise<CaseServiceType[]> {
    return getCaseServicesQuery(this.pool, caseId);
  }

  /**
   * Create case service
   */
  async createCaseService(
    caseId: string,
    data: CreateCaseServiceDTO,
    userId?: string
  ): Promise<CaseServiceType> {
    return createCaseServiceQuery(this.pool, caseId, data, userId);
  }

  /**
   * Update case service
   */
  async updateCaseService(
    serviceId: string,
    data: UpdateCaseServiceDTO,
    userId?: string
  ): Promise<CaseServiceType> {
    return updateCaseServiceQuery(this.pool, serviceId, data, userId);
  }

  /**
   * Delete case service
   */
  async deleteCaseService(serviceId: string): Promise<void> {
    return deleteCaseServiceQuery(this.pool, serviceId);
  }
}
