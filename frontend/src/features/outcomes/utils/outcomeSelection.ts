import type {
  InteractionOutcomeImpact,
  InteractionOutcomeImpactInput,
} from '../../../types/outcomes';

export const buildOutcomeImpactPayload = (
  outcomeDefinitionIds: string[]
): InteractionOutcomeImpactInput[] =>
  outcomeDefinitionIds.map((outcomeDefinitionId) => ({
    outcomeDefinitionId,
    impact: true,
    attribution: 'DIRECT',
  }));

export const getSelectedOutcomeDefinitionIds = (
  impacts?: InteractionOutcomeImpact[]
): string[] => (impacts || []).map((impact) => impact.outcome_definition_id);
