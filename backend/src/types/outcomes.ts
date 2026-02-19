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
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateOutcomeDefinitionDTO {
  key: string;
  name: string;
  description?: string | null;
  category?: string | null;
  isActive?: boolean;
  isReportable?: boolean;
  sortOrder?: number;
}

export interface UpdateOutcomeDefinitionDTO {
  key?: string;
  name?: string;
  description?: string | null;
  category?: string | null;
  isActive?: boolean;
  isReportable?: boolean;
  sortOrder?: number;
}

export interface ReorderOutcomeDefinitionsDTO {
  orderedIds: string[];
}

export interface InteractionOutcomeImpactInput {
  outcomeDefinitionId: string;
  impact?: boolean;
  attribution?: OutcomeAttribution;
  intensity?: number | null;
  evidenceNote?: string | null;
}

export interface UpdateInteractionOutcomeImpactsDTO {
  impacts: InteractionOutcomeImpactInput[];
  mode?: OutcomeUpdateMode;
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
  created_at: Date | string;
  updated_at: Date | string;
  outcome_definition: OutcomeDefinition;
}

export interface OutcomeReportFilters {
  from: string;
  to: string;
  staffId?: string;
  interactionType?: string;
  bucket: 'week' | 'month';
  includeNonReportable?: boolean;
  programId?: string;
}

export interface OutcomeReportTotal {
  outcomeDefinitionId: string;
  key: string;
  name: string;
  countImpacts: number;
  uniqueClientsImpacted: number;
}

export interface OutcomeReportTimeseriesPoint {
  bucketStart: string;
  outcomeDefinitionId: string;
  countImpacts: number;
}

export interface OutcomeReportResult {
  totalsByOutcome: OutcomeReportTotal[];
  timeseries: OutcomeReportTimeseriesPoint[];
}
