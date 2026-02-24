import type {
  BulkStatusUpdateDTO,
  CaseDocument,
  CaseOutcomeEvent,
  CaseTimelineEvent,
  CaseTopicDefinition,
  CaseTopicEvent,
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
  CreateCaseOutcomeDTO,
  CreateCaseRelationshipDTO,
  CreateCaseServiceDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  ReassignCaseDTO,
  UpdateCaseDTO,
  UpdateCaseDocumentDTO,
  UpdateCaseMilestoneDTO,
  UpdateCaseNoteDTO,
  UpdateCaseOutcomeDTO,
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
  getCaseTimeline(caseId: string): Promise<CaseTimelineEvent[]>;
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
  updateCaseNote(noteId: string, payload: UpdateCaseNoteDTO): Promise<CaseNote>;
  deleteCaseNote(noteId: string): Promise<void>;
  listCaseOutcomes(caseId: string): Promise<CaseOutcomeEvent[]>;
  createCaseOutcome(caseId: string, payload: CreateCaseOutcomeDTO): Promise<CaseOutcomeEvent>;
  updateCaseOutcome(outcomeId: string, payload: UpdateCaseOutcomeDTO): Promise<CaseOutcomeEvent>;
  deleteCaseOutcome(outcomeId: string): Promise<void>;
  listCaseTopicDefinitions(caseId: string): Promise<CaseTopicDefinition[]>;
  createCaseTopicDefinition(caseId: string, payload: CreateCaseTopicDefinitionDTO): Promise<CaseTopicDefinition>;
  listCaseTopicEvents(caseId: string): Promise<CaseTopicEvent[]>;
  createCaseTopicEvent(caseId: string, payload: CreateCaseTopicEventDTO): Promise<CaseTopicEvent>;
  deleteCaseTopicEvent(topicEventId: string): Promise<void>;
  listCaseDocuments(caseId: string): Promise<CaseDocument[]>;
  uploadCaseDocument(caseId: string, formData: FormData): Promise<CaseDocument>;
  updateCaseDocument(caseId: string, documentId: string, payload: UpdateCaseDocumentDTO): Promise<CaseDocument>;
  deleteCaseDocument(caseId: string, documentId: string): Promise<void>;
  getCaseDocumentDownloadUrl(caseId: string, documentId: string, disposition?: 'inline' | 'attachment'): string;
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
