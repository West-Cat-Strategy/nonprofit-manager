import type {
  BulkStatusUpdateDTO,
  CaseFilter,
  CreateCaseDTO,
  CreateCaseMilestoneDTO,
  CreateCaseNoteDTO,
  CreateCaseRelationshipDTO,
  CreateCaseServiceDTO,
  ReassignCaseDTO,
  UpdateCaseDTO,
  UpdateCaseServiceDTO,
  UpdateCaseStatusDTO,
  UpdateCaseMilestoneDTO,
} from '@app-types/case';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';

export interface CaseCatalogPort {
  getCases(filter: CaseFilter): Promise<{ cases: unknown[]; total: number }>;
  getCaseById(caseId: string): Promise<unknown | null>;
  getCaseSummary(): Promise<unknown>;
  getCaseTypes(): Promise<unknown[]>;
  getCaseStatuses(): Promise<unknown[]>;
}

export interface CaseLifecyclePort {
  createCase(data: CreateCaseDTO, userId?: string): Promise<unknown>;
  updateCase(caseId: string, data: UpdateCaseDTO, userId?: string): Promise<unknown>;
  updateCaseStatus(caseId: string, data: UpdateCaseStatusDTO, userId?: string): Promise<unknown>;
  reassignCase(caseId: string, data: ReassignCaseDTO, userId?: string): Promise<unknown>;
  bulkUpdateCaseStatus(data: BulkStatusUpdateDTO, userId?: string): Promise<unknown>;
  deleteCase(caseId: string): Promise<void>;
}

export interface CaseNotesPort {
  getCaseNotes(caseId: string): Promise<unknown[]>;
  createCaseNote(data: CreateCaseNoteDTO, userId?: string): Promise<unknown>;
}

export interface CaseMilestonesPort {
  getCaseMilestones(caseId: string): Promise<unknown[]>;
  createCaseMilestone(caseId: string, data: CreateCaseMilestoneDTO, userId?: string): Promise<unknown>;
  updateCaseMilestone(milestoneId: string, data: UpdateCaseMilestoneDTO): Promise<unknown>;
  deleteCaseMilestone(milestoneId: string): Promise<void>;
}

export interface CaseRelationshipsPort {
  getCaseRelationships(caseId: string): Promise<unknown[]>;
  createCaseRelationship(caseId: string, data: CreateCaseRelationshipDTO, userId?: string): Promise<unknown>;
  deleteCaseRelationship(relationshipId: string): Promise<void>;
}

export interface CaseServiceAssignmentsPort {
  getCaseServices(caseId: string): Promise<unknown[]>;
  createCaseService(caseId: string, data: CreateCaseServiceDTO, userId?: string): Promise<unknown>;
  updateCaseService(serviceId: string, data: UpdateCaseServiceDTO, userId?: string): Promise<unknown>;
  deleteCaseService(serviceId: string): Promise<void>;
}

export interface CaseOutcomesPort {
  listOutcomeDefinitions(includeInactive?: boolean): Promise<unknown[]>;
  getInteractionOutcomes(caseId: string, interactionId: string): Promise<unknown[]>;
  saveInteractionOutcomes(
    caseId: string,
    interactionId: string,
    payload: UpdateInteractionOutcomeImpactsDTO,
    userId?: string
  ): Promise<unknown[]>;
}
