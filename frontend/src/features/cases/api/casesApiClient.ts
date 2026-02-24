import api from '../../../services/api';
import { unwrapApiData } from '../../../services/apiEnvelope';
import type { ApiEnvelope } from '../../../services/apiEnvelope';
import type {
  BulkStatusUpdateDTO,
  CasePriority,
  CaseDocument,
  CaseOutcomeEvent,
  CaseTimelineEvent,
  CaseTopicDefinition,
  CaseTopicEvent,
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
import type { CasesApiClientPort, CasesListQuery } from '../types/contracts';
import { normalizeCasePriorityForApi } from '../utils/casePriority';

export class CasesApiClient implements CasesApiClientPort {
  private normalizePriorityPayload<T extends { priority?: CasePriority }>(payload: T): T {
    const normalizedPriority = normalizeCasePriorityForApi(payload.priority);
    if (
      normalizedPriority === undefined ||
      normalizedPriority === null ||
      normalizedPriority === payload.priority
    ) {
      return payload;
    }

    return {
      ...payload,
      priority: normalizedPriority,
    };
  }

  private buildListParams(query: CasesListQuery = {}): URLSearchParams {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.contactId) params.set('contact_id', query.contactId);
    if (query.accountId) params.set('account_id', query.accountId);
    if (query.caseTypeId) params.set('case_type_id', query.caseTypeId);
    if (query.statusId) params.set('status_id', query.statusId);
    if (query.priority) {
      const normalizedPriority = normalizeCasePriorityForApi(query.priority);
      if (normalizedPriority) {
        params.set('priority', normalizedPriority);
      }
    }
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
    return unwrapApiData(response.data);
  }

  async getCase(caseId: string): Promise<CaseWithDetails> {
    const response = await api.get<ApiEnvelope<CaseWithDetails>>(`/v2/cases/${caseId}`);
    return unwrapApiData(response.data);
  }

  async getCaseTimeline(caseId: string): Promise<CaseTimelineEvent[]> {
    const response = await api.get<ApiEnvelope<CaseTimelineEvent[]>>(`/v2/cases/${caseId}/timeline`);
    return unwrapApiData(response.data);
  }

  async createCase(payload: CreateCaseDTO): Promise<CaseWithDetails> {
    const response = await api.post<ApiEnvelope<CaseWithDetails>>(
      '/v2/cases',
      this.normalizePriorityPayload(payload)
    );
    return unwrapApiData(response.data);
  }

  async updateCase(caseId: string, payload: UpdateCaseDTO): Promise<CaseWithDetails> {
    const response = await api.put<ApiEnvelope<CaseWithDetails>>(
      `/v2/cases/${caseId}`,
      this.normalizePriorityPayload(payload)
    );
    return unwrapApiData(response.data);
  }

  async deleteCase(caseId: string): Promise<void> {
    await api.delete(`/v2/cases/${caseId}`);
  }

  async updateCaseStatus(caseId: string, payload: UpdateCaseStatusDTO): Promise<CaseWithDetails> {
    const response = await api.put<ApiEnvelope<CaseWithDetails>>(`/v2/cases/${caseId}/status`, payload);
    return unwrapApiData(response.data);
  }

  async reassignCase(caseId: string, payload: ReassignCaseDTO): Promise<CaseWithDetails> {
    const response = await api.put<ApiEnvelope<CaseWithDetails>>(`/v2/cases/${caseId}/reassign`, payload);
    return unwrapApiData(response.data);
  }

  async bulkUpdateStatus(payload: BulkStatusUpdateDTO): Promise<unknown> {
    const response = await api.post<ApiEnvelope<unknown>>('/v2/cases/bulk-status', payload);
    return unwrapApiData(response.data);
  }

  async getCaseSummary(): Promise<CaseSummary> {
    const response = await api.get<ApiEnvelope<CaseSummary>>('/v2/cases/summary');
    return unwrapApiData(response.data);
  }

  async getCaseTypes(): Promise<CaseType[]> {
    const response = await api.get<ApiEnvelope<CaseType[]>>('/v2/cases/types');
    return unwrapApiData(response.data);
  }

  async getCaseStatuses(): Promise<CaseStatus[]> {
    const response = await api.get<ApiEnvelope<CaseStatus[]>>('/v2/cases/statuses');
    return unwrapApiData(response.data);
  }

  async listCaseNotes(caseId: string): Promise<{ notes: CaseNote[]; total?: number }> {
    const response = await api.get<ApiEnvelope<{ notes: CaseNote[]; total?: number } | CaseNote[]>>(
      `/v2/cases/${caseId}/notes`
    );
    const data = unwrapApiData(response.data);
    if (Array.isArray(data)) {
      return { notes: data, total: data.length };
    }
    return data;
  }

  async createCaseNote(payload: CreateCaseNoteDTO): Promise<CaseNote> {
    const response = await api.post<ApiEnvelope<CaseNote>>('/v2/cases/notes', payload);
    return unwrapApiData(response.data);
  }

  async updateCaseNote(noteId: string, payload: UpdateCaseNoteDTO): Promise<CaseNote> {
    const response = await api.put<ApiEnvelope<CaseNote>>(`/v2/cases/notes/${noteId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteCaseNote(noteId: string): Promise<void> {
    await api.delete(`/v2/cases/notes/${noteId}`);
  }

  async listCaseOutcomes(caseId: string): Promise<CaseOutcomeEvent[]> {
    const response = await api.get<ApiEnvelope<CaseOutcomeEvent[]>>(`/v2/cases/${caseId}/outcomes`);
    return unwrapApiData(response.data);
  }

  async createCaseOutcome(caseId: string, payload: CreateCaseOutcomeDTO): Promise<CaseOutcomeEvent> {
    const response = await api.post<ApiEnvelope<CaseOutcomeEvent>>(`/v2/cases/${caseId}/outcomes`, payload);
    return unwrapApiData(response.data);
  }

  async updateCaseOutcome(outcomeId: string, payload: UpdateCaseOutcomeDTO): Promise<CaseOutcomeEvent> {
    const response = await api.put<ApiEnvelope<CaseOutcomeEvent>>(`/v2/cases/outcomes/${outcomeId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteCaseOutcome(outcomeId: string): Promise<void> {
    await api.delete(`/v2/cases/outcomes/${outcomeId}`);
  }

  async listCaseTopicDefinitions(caseId: string): Promise<CaseTopicDefinition[]> {
    const response = await api.get<ApiEnvelope<CaseTopicDefinition[]>>(
      `/v2/cases/${caseId}/topics/definitions`
    );
    return unwrapApiData(response.data);
  }

  async createCaseTopicDefinition(
    caseId: string,
    payload: CreateCaseTopicDefinitionDTO
  ): Promise<CaseTopicDefinition> {
    const response = await api.post<ApiEnvelope<CaseTopicDefinition>>(
      `/v2/cases/${caseId}/topics/definitions`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async listCaseTopicEvents(caseId: string): Promise<CaseTopicEvent[]> {
    const response = await api.get<ApiEnvelope<CaseTopicEvent[]>>(`/v2/cases/${caseId}/topics`);
    return unwrapApiData(response.data);
  }

  async createCaseTopicEvent(caseId: string, payload: CreateCaseTopicEventDTO): Promise<CaseTopicEvent> {
    const response = await api.post<ApiEnvelope<CaseTopicEvent>>(`/v2/cases/${caseId}/topics`, payload);
    return unwrapApiData(response.data);
  }

  async deleteCaseTopicEvent(topicEventId: string): Promise<void> {
    await api.delete(`/v2/cases/topics/${topicEventId}`);
  }

  async listCaseDocuments(caseId: string): Promise<CaseDocument[]> {
    const response = await api.get<ApiEnvelope<CaseDocument[]>>(`/v2/cases/${caseId}/documents`);
    return unwrapApiData(response.data);
  }

  async uploadCaseDocument(caseId: string, formData: FormData): Promise<CaseDocument> {
    const response = await api.post<ApiEnvelope<CaseDocument>>(`/v2/cases/${caseId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrapApiData(response.data);
  }

  async updateCaseDocument(
    caseId: string,
    documentId: string,
    payload: UpdateCaseDocumentDTO
  ): Promise<CaseDocument> {
    const response = await api.put<ApiEnvelope<CaseDocument>>(
      `/v2/cases/${caseId}/documents/${documentId}`,
      payload
    );
    return unwrapApiData(response.data);
  }

  async deleteCaseDocument(caseId: string, documentId: string): Promise<void> {
    await api.delete(`/v2/cases/${caseId}/documents/${documentId}`);
  }

  getCaseDocumentDownloadUrl(
    caseId: string,
    documentId: string,
    disposition: 'inline' | 'attachment' = 'attachment'
  ): string {
    const query = disposition === 'inline' ? '?disposition=inline' : '';
    return `/api/v2/cases/${caseId}/documents/${documentId}/download${query}`;
  }

  async listCaseMilestones(caseId: string): Promise<CaseMilestone[]> {
    const response = await api.get<ApiEnvelope<CaseMilestone[]>>(`/v2/cases/${caseId}/milestones`);
    return unwrapApiData(response.data);
  }

  async createCaseMilestone(caseId: string, payload: CreateCaseMilestoneDTO): Promise<CaseMilestone> {
    const response = await api.post<ApiEnvelope<CaseMilestone>>(`/v2/cases/${caseId}/milestones`, payload);
    return unwrapApiData(response.data);
  }

  async updateCaseMilestone(milestoneId: string, payload: UpdateCaseMilestoneDTO): Promise<CaseMilestone> {
    const response = await api.put<ApiEnvelope<CaseMilestone>>(`/v2/cases/milestones/${milestoneId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteCaseMilestone(milestoneId: string): Promise<void> {
    await api.delete(`/v2/cases/milestones/${milestoneId}`);
  }

  async listCaseRelationships(caseId: string): Promise<CaseRelationship[]> {
    const response = await api.get<ApiEnvelope<CaseRelationship[]>>(`/v2/cases/${caseId}/relationships`);
    return unwrapApiData(response.data);
  }

  async createCaseRelationship(caseId: string, payload: CreateCaseRelationshipDTO): Promise<CaseRelationship> {
    const response = await api.post<ApiEnvelope<CaseRelationship>>(`/v2/cases/${caseId}/relationships`, payload);
    return unwrapApiData(response.data);
  }

  async deleteCaseRelationship(relationshipId: string): Promise<void> {
    await api.delete(`/v2/cases/relationships/${relationshipId}`);
  }

  async listCaseServices(caseId: string): Promise<CaseService[]> {
    const response = await api.get<ApiEnvelope<CaseService[]>>(`/v2/cases/${caseId}/services`);
    return unwrapApiData(response.data);
  }

  async createCaseService(caseId: string, payload: CreateCaseServiceDTO): Promise<CaseService> {
    const response = await api.post<ApiEnvelope<CaseService>>(`/v2/cases/${caseId}/services`, payload);
    return unwrapApiData(response.data);
  }

  async updateCaseService(serviceId: string, payload: UpdateCaseServiceDTO): Promise<CaseService> {
    const response = await api.put<ApiEnvelope<CaseService>>(`/v2/cases/services/${serviceId}`, payload);
    return unwrapApiData(response.data);
  }

  async deleteCaseService(serviceId: string): Promise<void> {
    await api.delete(`/v2/cases/services/${serviceId}`);
  }

  async listOutcomeDefinitions(includeInactive: boolean = false): Promise<OutcomeDefinition[]> {
    const response = await api.get<ApiEnvelope<OutcomeDefinition[]>>(
      `/v2/cases/outcomes/definitions?includeInactive=${String(includeInactive)}`
    );
    return unwrapApiData(response.data);
  }

  async getInteractionOutcomes(caseId: string, interactionId: string): Promise<InteractionOutcomeImpact[]> {
    const response = await api.get<ApiEnvelope<InteractionOutcomeImpact[]>>(
      `/v2/cases/${caseId}/interactions/${interactionId}/outcomes`
    );
    return unwrapApiData(response.data);
  }

  async updateInteractionOutcomes(
    caseId: string,
    interactionId: string,
    payload: UpdateInteractionOutcomesInput
  ): Promise<InteractionOutcomeImpact[]> {
    const response = await api.put<ApiEnvelope<InteractionOutcomeImpact[]>>(
      `/v2/cases/${caseId}/interactions/${interactionId}/outcomes`,
      payload
    );
    return unwrapApiData(response.data);
  }
}

export const casesApiClient = new CasesApiClient();
