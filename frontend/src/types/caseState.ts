import type { InteractionOutcomeImpact, OutcomeDefinition } from './outcomes';
import type {
  CaseDocument,
  CaseFilter,
  CaseMilestone,
  CaseNote,
  CaseOutcomeEvent,
  CaseRelationship,
  CaseService,
  CaseStatus,
  CaseSummary,
  CaseTimelineEvent,
  CaseTopicDefinition,
  CaseTopicEvent,
  CaseType,
  CaseWithDetails,
  ExternalServiceProvider,
} from './case';

/**
 * Redux State Types
 */
export interface CasesState {
  cases: CaseWithDetails[];
  currentCase: CaseWithDetails | null;
  caseTypes: CaseType[];
  caseStatuses: CaseStatus[];
  caseNotes: CaseNote[];
  caseMilestones: CaseMilestone[];
  caseRelationships: CaseRelationship[];
  caseServices: CaseService[];
  caseOutcomeDefinitions?: OutcomeDefinition[];
  interactionOutcomeImpacts?: Record<string, InteractionOutcomeImpact[]>;
  caseOutcomes?: CaseOutcomeEvent[];
  caseTopicDefinitions?: CaseTopicDefinition[];
  caseTopicEvents?: CaseTopicEvent[];
  caseDocuments?: CaseDocument[];
  caseTimeline?: CaseTimelineEvent[];
  summary: CaseSummary | null;
  total: number;
  loading: boolean;
  error: string | null;
  outcomesLoading?: boolean;
  outcomesSaving?: boolean;
  outcomesError?: string | null;
  filters: CaseFilter;
  selectedCaseIds: string[];
  contactCasesByContactId?: Record<
    string,
    {
      cases: CaseWithDetails[];
      loading: boolean;
      error: string | null;
      fetchedAt: number | null;
    }
  >;
}

/**
 * API Response Types
 */
export interface CasesResponse {
  cases: CaseWithDetails[];
  total: number;
  pagination: {
    page: number;
    limit: number;
  };
}

export interface CaseTypesResponse {
  types: CaseType[];
}

export interface CaseStatusesResponse {
  statuses: CaseStatus[];
}

export interface CaseNotesResponse {
  notes: CaseNote[];
}

export interface CaseMilestonesResponse {
  milestones: CaseMilestone[];
}

export interface CaseRelationshipsResponse {
  relationships: CaseRelationship[];
}

export interface CaseServicesResponse {
  services: CaseService[];
}

export interface ExternalServiceProvidersResponse {
  providers: ExternalServiceProvider[];
}
