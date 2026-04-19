import type {
  BulkStatusUpdateDTO,
  CaseFilter,
  CreateCaseDTO,
  CreateCaseOutcomeDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  CreateCaseMilestoneDTO,
  CreateCaseNoteDTO,
  CreateCaseRelationshipDTO,
  CreateCaseServiceDTO,
  ReassignCaseDTO,
  UpdateCaseDocumentDTO,
  UpdateCaseDTO,
  UpdateCaseNoteDTO,
  UpdateCaseOutcomeDTO,
  UpdateCaseServiceDTO,
  UpdateCaseStatusDTO,
  UpdateCaseMilestoneDTO,
} from '@app-types/case';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';

export interface CaseCatalogPort {
  getCases(filter: CaseFilter, organizationId?: string): Promise<{ cases: unknown[]; total: number }>;
  getCaseById(caseId: string, organizationId?: string): Promise<unknown | null>;
  getCaseTimeline(
    caseId: string,
    options?: { limit?: number; cursor?: string },
    organizationId?: string
  ): Promise<{ items: unknown[]; page: { limit: number; has_more: boolean; next_cursor: string | null } }>;
  getCaseSummary(organizationId?: string): Promise<unknown>;
  getCaseTypes(): Promise<unknown[]>;
  getCaseStatuses(): Promise<unknown[]>;
}

export interface CaseLifecyclePort {
  createCase(data: CreateCaseDTO, userId?: string, organizationId?: string): Promise<unknown>;
  updateCase(caseId: string, data: UpdateCaseDTO, userId?: string, organizationId?: string): Promise<unknown>;
  updateCaseStatus(caseId: string, data: UpdateCaseStatusDTO, userId?: string, organizationId?: string): Promise<unknown>;
  reassignCase(caseId: string, data: ReassignCaseDTO, userId?: string, organizationId?: string): Promise<unknown>;
  bulkUpdateCaseStatus(data: BulkStatusUpdateDTO, userId?: string, organizationId?: string): Promise<unknown>;
  deleteCase(caseId: string, organizationId?: string): Promise<void>;
}

export interface CaseNotesPort {
  getCaseNotes(caseId: string, organizationId?: string): Promise<unknown[]>;
  createCaseNote(data: CreateCaseNoteDTO, userId?: string, organizationId?: string): Promise<unknown>;
  updateCaseNote(noteId: string, data: UpdateCaseNoteDTO, userId?: string, organizationId?: string): Promise<unknown>;
  deleteCaseNote(noteId: string, organizationId?: string): Promise<boolean>;
}

export interface CaseMilestonesPort {
  getCaseMilestones(caseId: string, organizationId?: string): Promise<unknown[]>;
  createCaseMilestone(caseId: string, data: CreateCaseMilestoneDTO, userId?: string, organizationId?: string): Promise<unknown>;
  updateCaseMilestone(milestoneId: string, data: UpdateCaseMilestoneDTO, organizationId?: string): Promise<unknown>;
  deleteCaseMilestone(milestoneId: string, organizationId?: string): Promise<void>;
}

export interface CaseRelationshipsPort {
  getCaseRelationships(caseId: string, organizationId?: string): Promise<unknown[]>;
  createCaseRelationship(caseId: string, data: CreateCaseRelationshipDTO, userId?: string, organizationId?: string): Promise<unknown>;
  deleteCaseRelationship(relationshipId: string, organizationId?: string): Promise<void>;
}

export interface CaseServiceAssignmentsPort {
  getCaseServices(caseId: string, organizationId?: string): Promise<unknown[]>;
  createCaseService(caseId: string, data: CreateCaseServiceDTO, userId?: string, organizationId?: string): Promise<unknown>;
  updateCaseService(serviceId: string, data: UpdateCaseServiceDTO, userId?: string, organizationId?: string): Promise<unknown>;
  deleteCaseService(serviceId: string, organizationId?: string): Promise<void>;
}

export interface CaseOutcomesPort {
  listOutcomeDefinitions(includeInactive?: boolean, organizationId?: string): Promise<unknown[]>;
  getInteractionOutcomes(caseId: string, interactionId: string, organizationId?: string): Promise<unknown[]>;
  saveInteractionOutcomes(
    caseId: string,
    interactionId: string,
    payload: UpdateInteractionOutcomeImpactsDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown[]>;
  getCaseOutcomes(caseId: string, organizationId?: string): Promise<unknown[]>;
  createCaseOutcome(caseId: string, data: CreateCaseOutcomeDTO, userId?: string, organizationId?: string): Promise<unknown>;
  updateCaseOutcome(outcomeId: string, data: UpdateCaseOutcomeDTO, userId?: string, organizationId?: string): Promise<unknown>;
  deleteCaseOutcome(outcomeId: string, organizationId?: string): Promise<boolean>;
  getCaseTopicDefinitions(caseId: string, organizationId?: string): Promise<unknown[]>;
  createCaseTopicDefinition(caseId: string, data: CreateCaseTopicDefinitionDTO, userId?: string, organizationId?: string): Promise<unknown>;
  getCaseTopicEvents(caseId: string, organizationId?: string): Promise<unknown[]>;
  addCaseTopicEvent(caseId: string, data: CreateCaseTopicEventDTO, userId?: string, organizationId?: string): Promise<unknown>;
  deleteCaseTopicEvent(topicEventId: string, organizationId?: string): Promise<boolean>;
}

export interface CaseDocumentsPort {
  getCaseDocuments(caseId: string, organizationId?: string): Promise<unknown[]>;
  getCaseDocumentById(caseId: string, documentId: string, organizationId?: string): Promise<unknown | null>;
  createCaseDocument(input: {
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
    organizationId?: string;
  }): Promise<unknown>;
  updateCaseDocument(documentId: string, data: UpdateCaseDocumentDTO, userId?: string, organizationId?: string): Promise<unknown>;
  deleteCaseDocument(documentId: string, userId?: string, organizationId?: string): Promise<boolean>;
}
