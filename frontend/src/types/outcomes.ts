export type OutcomeAttribution = 'DIRECT' | 'LIKELY' | 'POSSIBLE';
export type OutcomeUpdateMode = 'replace' | 'merge';

export interface OutcomeDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: boolean;
  is_reportable: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OutcomeDefinitionCreateInput {
  key: string;
  name: string;
  description?: string | null;
  category?: string | null;
  isActive?: boolean;
  isReportable?: boolean;
  sortOrder?: number;
}

export interface OutcomeDefinitionUpdateInput {
  key?: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  isActive?: boolean;
  isReportable?: boolean;
  sortOrder?: number;
}

export interface InteractionOutcomeImpact {
  id: string;
  interaction_id: string;
  outcome_definition_id: string;
  impact: boolean;
  attribution: OutcomeAttribution;
  intensity: number | null;
  evidence_note: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  outcome_definition: OutcomeDefinition;
}

export interface InteractionOutcomeImpactInput {
  outcomeDefinitionId: string;
  impact?: boolean;
  attribution?: OutcomeAttribution;
  intensity?: number | null;
  evidenceNote?: string | null;
}

export interface UpdateInteractionOutcomesInput {
  impacts: InteractionOutcomeImpactInput[];
  mode?: OutcomeUpdateMode;
}

export interface OutcomesReportTotal {
  outcomeDefinitionId: string;
  key: string;
  name: string;
  countImpacts: number;
  uniqueClientsImpacted: number;
}

export interface OutcomesReportTimeseriesPoint {
  bucketStart: string;
  outcomeDefinitionId: string;
  countImpacts: number;
}

export interface OutcomesReportData {
  totalsByOutcome: OutcomesReportTotal[];
  timeseries: OutcomesReportTimeseriesPoint[];
}

export interface OutcomesReportFilters {
  from: string;
  to: string;
  programId?: string;
  staffId?: string;
  interactionType?: 'note' | 'email' | 'call' | 'meeting' | 'update' | 'status_change';
  bucket?: 'week' | 'month';
  includeNonReportable?: boolean;
}
