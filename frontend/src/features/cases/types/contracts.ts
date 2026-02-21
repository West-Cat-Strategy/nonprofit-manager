import type {
  BulkStatusUpdateDTO,
  CaseFilter,
  CaseMilestone,
  CaseNote,
  CaseRelationship,
  CaseService,
  CaseStatus,
  CaseSummary,
  CaseType,
  CaseWithDetails,
  CasesResponse,
  CreateCaseDTO,
  CreateCaseMilestoneDTO,
  CreateCaseNoteDTO,
  CreateCaseRelationshipDTO,
  CreateCaseServiceDTO,
  ReassignCaseDTO,
  UpdateCaseDTO,
  UpdateCaseMilestoneDTO,
  UpdateCaseServiceDTO,
  UpdateCaseStatusDTO,
} from '../../../types/case';
import type {
  InteractionOutcomeImpact,
  OutcomeDefinition,
  UpdateInteractionOutcomesInput,
} from '../../../types/outcomes';

export interface CasesListQuery {
  search?: string;
  contactId?: string;
  accountId?: string;
  caseTypeId?: string;
  statusId?: string;
  priority?: CaseFilter['priority'];
  assignedTo?: string;
  assignedTeam?: string;
  isUrgent?: boolean;
  requiresFollowup?: boolean;
  intakeStartDate?: string;
  intakeEndDate?: string;
  dueDateStart?: string;
  dueDateEnd?: string;
  quickFilter?: CaseFilter['quick_filter'];
  dueWithinDays?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CasesApiClientPort {
  listCases(query?: CasesListQuery): Promise<CasesResponse>;
  getCase(caseId: string): Promise<CaseWithDetails>;
  createCase(payload: CreateCaseDTO): Promise<CaseWithDetails>;
  updateCase(caseId: string, payload: UpdateCaseDTO): Promise<CaseWithDetails>;
  deleteCase(caseId: string): Promise<void>;
  updateCaseStatus(caseId: string, payload: UpdateCaseStatusDTO): Promise<CaseWithDetails>;
  reassignCase(caseId: string, payload: ReassignCaseDTO): Promise<CaseWithDetails>;
  bulkUpdateStatus(payload: BulkStatusUpdateDTO): Promise<unknown>;
  getCaseSummary(): Promise<CaseSummary>;
  getCaseTypes(): Promise<CaseType[]>;
  getCaseStatuses(): Promise<CaseStatus[]>;
  listCaseNotes(caseId: string): Promise<{ notes: CaseNote[]; total?: number }>;
  createCaseNote(payload: CreateCaseNoteDTO): Promise<CaseNote>;
  listCaseMilestones(caseId: string): Promise<CaseMilestone[]>;
  createCaseMilestone(caseId: string, payload: CreateCaseMilestoneDTO): Promise<CaseMilestone>;
  updateCaseMilestone(milestoneId: string, payload: UpdateCaseMilestoneDTO): Promise<CaseMilestone>;
  deleteCaseMilestone(milestoneId: string): Promise<void>;
  listCaseRelationships(caseId: string): Promise<CaseRelationship[]>;
  createCaseRelationship(caseId: string, payload: CreateCaseRelationshipDTO): Promise<CaseRelationship>;
  deleteCaseRelationship(relationshipId: string): Promise<void>;
  listCaseServices(caseId: string): Promise<CaseService[]>;
  createCaseService(caseId: string, payload: CreateCaseServiceDTO): Promise<CaseService>;
  updateCaseService(serviceId: string, payload: UpdateCaseServiceDTO): Promise<CaseService>;
  deleteCaseService(serviceId: string): Promise<void>;
  listOutcomeDefinitions(includeInactive?: boolean): Promise<OutcomeDefinition[]>;
  getInteractionOutcomes(caseId: string, interactionId: string): Promise<InteractionOutcomeImpact[]>;
  updateInteractionOutcomes(
    caseId: string,
    interactionId: string,
    payload: UpdateInteractionOutcomesInput
  ): Promise<InteractionOutcomeImpact[]>;
}
