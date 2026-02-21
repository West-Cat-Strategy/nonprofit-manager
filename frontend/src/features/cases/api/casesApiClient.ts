import api from '../../../services/api';
import type {
  BulkStatusUpdateDTO,
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
import type { CasesApiClientPort, CasesListQuery } from '../types/contracts';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

const extractData = <T>(value: ApiEnvelope<T> | T): T => {
  if (value && typeof value === 'object' && 'success' in value && 'data' in value) {
    return (value as ApiEnvelope<T>).data;
  }
  return value as T;
};

export class CasesApiClient implements CasesApiClientPort {
  private buildListParams(query: CasesListQuery = {}): URLSearchParams {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.contactId) params.set('contact_id', query.contactId);
    if (query.accountId) params.set('account_id', query.accountId);
    if (query.caseTypeId) params.set('case_type_id', query.caseTypeId);
    if (query.statusId) params.set('status_id', query.statusId);
    if (query.priority) params.set('priority', query.priority);
    if (query.assignedTo) params.set('assigned_to', query.assignedTo);
    if (query.assignedTeam) params.set('assigned_team', query.assignedTeam);
    if (typeof query.isUrgent === 'boolean') params.set('is_urgent', String(query.isUrgent));
    if (typeof query.requiresFollowup === 'boolean') params.set('requires_followup', String(query.requiresFollowup));
    if (query.intakeStartDate) params.set('intake_start_date', query.intakeStartDate);
    if (query.intakeEndDate) params.set('intake_end_date', query.intakeEndDate);
    if (query.dueDateStart) params.set('due_date_start', query.dueDateStart);
    if (query.dueDateEnd) params.set('due_date_end', query.dueDateEnd);
    if (query.quickFilter) params.set('quick_filter', query.quickFilter);
    if (typeof query.dueWithinDays === 'number') params.set('due_within_days', String(query.dueWithinDays));
    if (typeof query.page === 'number') params.set('page', String(query.page));
    if (typeof query.limit === 'number') params.set('limit', String(query.limit));
    if (query.sortBy) params.set('sort_by', query.sortBy);
    if (query.sortOrder) params.set('sort_order', query.sortOrder);
    return params;
  }

  async listCases(query: CasesListQuery = {}): Promise<CasesResponse> {
    const params = this.buildListParams(query);
    const response = await api.get<ApiEnvelope<CasesResponse>>(`/v2/cases?${params.toString()}`);
    return extractData(response.data);
  }

  async getCase(caseId: string): Promise<CaseWithDetails> {
    const response = await api.get<ApiEnvelope<CaseWithDetails>>(`/v2/cases/${caseId}`);
    return extractData(response.data);
  }

  async createCase(payload: CreateCaseDTO): Promise<CaseWithDetails> {
    const response = await api.post<ApiEnvelope<CaseWithDetails>>('/v2/cases', payload);
    return extractData(response.data);
  }

  async updateCase(caseId: string, payload: UpdateCaseDTO): Promise<CaseWithDetails> {
    const response = await api.put<ApiEnvelope<CaseWithDetails>>(`/v2/cases/${caseId}`, payload);
    return extractData(response.data);
  }

  async deleteCase(caseId: string): Promise<void> {
    await api.delete(`/v2/cases/${caseId}`);
  }

  async updateCaseStatus(caseId: string, payload: UpdateCaseStatusDTO): Promise<CaseWithDetails> {
    const response = await api.put<ApiEnvelope<CaseWithDetails>>(`/v2/cases/${caseId}/status`, payload);
    return extractData(response.data);
  }

  async reassignCase(caseId: string, payload: ReassignCaseDTO): Promise<CaseWithDetails> {
    const response = await api.put<ApiEnvelope<CaseWithDetails>>(`/v2/cases/${caseId}/reassign`, payload);
    return extractData(response.data);
  }

  async bulkUpdateStatus(payload: BulkStatusUpdateDTO): Promise<unknown> {
    const response = await api.post<ApiEnvelope<unknown>>('/v2/cases/bulk-status', payload);
    return extractData(response.data);
  }

  async getCaseSummary(): Promise<CaseSummary> {
    const response = await api.get<ApiEnvelope<CaseSummary>>('/v2/cases/summary');
    return extractData(response.data);
  }

  async getCaseTypes(): Promise<CaseType[]> {
    const response = await api.get<ApiEnvelope<CaseType[]>>('/v2/cases/types');
    return extractData(response.data);
  }

  async getCaseStatuses(): Promise<CaseStatus[]> {
    const response = await api.get<ApiEnvelope<CaseStatus[]>>('/v2/cases/statuses');
    return extractData(response.data);
  }

  async listCaseNotes(caseId: string): Promise<{ notes: CaseNote[]; total?: number }> {
    const response = await api.get<ApiEnvelope<{ notes: CaseNote[]; total?: number }>>(`/v2/cases/${caseId}/notes`);
    return extractData(response.data);
  }

  async createCaseNote(payload: CreateCaseNoteDTO): Promise<CaseNote> {
    const response = await api.post<ApiEnvelope<CaseNote>>('/v2/cases/notes', payload);
    return extractData(response.data);
  }

  async listCaseMilestones(caseId: string): Promise<CaseMilestone[]> {
    const response = await api.get<ApiEnvelope<CaseMilestone[]>>(`/v2/cases/${caseId}/milestones`);
    return extractData(response.data);
  }

  async createCaseMilestone(caseId: string, payload: CreateCaseMilestoneDTO): Promise<CaseMilestone> {
    const response = await api.post<ApiEnvelope<CaseMilestone>>(`/v2/cases/${caseId}/milestones`, payload);
    return extractData(response.data);
  }

  async updateCaseMilestone(milestoneId: string, payload: UpdateCaseMilestoneDTO): Promise<CaseMilestone> {
    const response = await api.put<ApiEnvelope<CaseMilestone>>(`/v2/cases/milestones/${milestoneId}`, payload);
    return extractData(response.data);
  }

  async deleteCaseMilestone(milestoneId: string): Promise<void> {
    await api.delete(`/v2/cases/milestones/${milestoneId}`);
  }

  async listCaseRelationships(caseId: string): Promise<CaseRelationship[]> {
    const response = await api.get<ApiEnvelope<CaseRelationship[]>>(`/v2/cases/${caseId}/relationships`);
    return extractData(response.data);
  }

  async createCaseRelationship(caseId: string, payload: CreateCaseRelationshipDTO): Promise<CaseRelationship> {
    const response = await api.post<ApiEnvelope<CaseRelationship>>(`/v2/cases/${caseId}/relationships`, payload);
    return extractData(response.data);
  }

  async deleteCaseRelationship(relationshipId: string): Promise<void> {
    await api.delete(`/v2/cases/relationships/${relationshipId}`);
  }

  async listCaseServices(caseId: string): Promise<CaseService[]> {
    const response = await api.get<ApiEnvelope<CaseService[]>>(`/v2/cases/${caseId}/services`);
    return extractData(response.data);
  }

  async createCaseService(caseId: string, payload: CreateCaseServiceDTO): Promise<CaseService> {
    const response = await api.post<ApiEnvelope<CaseService>>(`/v2/cases/${caseId}/services`, payload);
    return extractData(response.data);
  }

  async updateCaseService(serviceId: string, payload: UpdateCaseServiceDTO): Promise<CaseService> {
    const response = await api.put<ApiEnvelope<CaseService>>(`/v2/cases/services/${serviceId}`, payload);
    return extractData(response.data);
  }

  async deleteCaseService(serviceId: string): Promise<void> {
    await api.delete(`/v2/cases/services/${serviceId}`);
  }

  async listOutcomeDefinitions(includeInactive: boolean = false): Promise<OutcomeDefinition[]> {
    const response = await api.get<ApiEnvelope<OutcomeDefinition[]> | OutcomeDefinition[]>(
      `/v2/cases/outcomes/definitions?includeInactive=${String(includeInactive)}`
    );
    return extractData(response.data);
  }

  async getInteractionOutcomes(caseId: string, interactionId: string): Promise<InteractionOutcomeImpact[]> {
    const response = await api.get<ApiEnvelope<InteractionOutcomeImpact[]> | InteractionOutcomeImpact[]>(
      `/v2/cases/${caseId}/interactions/${interactionId}/outcomes`
    );
    return extractData(response.data);
  }

  async updateInteractionOutcomes(
    caseId: string,
    interactionId: string,
    payload: UpdateInteractionOutcomesInput
  ): Promise<InteractionOutcomeImpact[]> {
    const response = await api.put<ApiEnvelope<InteractionOutcomeImpact[]> | InteractionOutcomeImpact[]>(
      `/v2/cases/${caseId}/interactions/${interactionId}/outcomes`,
      payload
    );
    return extractData(response.data);
  }
}

export const casesApiClient = new CasesApiClient();
