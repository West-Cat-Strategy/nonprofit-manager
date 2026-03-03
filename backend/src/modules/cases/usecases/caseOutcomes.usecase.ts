import type { CaseOutcomesPort } from '../types/ports';
import type {
  CreateCaseOutcomeDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  UpdateCaseOutcomeDTO,
} from '@app-types/case';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';

const normalizeText = (value: string | undefined | null): string | undefined | null => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export class CaseOutcomesUseCase {
  constructor(private readonly repository: CaseOutcomesPort) {}

  listDefinitions(includeInactive?: boolean): Promise<unknown[]> {
    return this.repository.listOutcomeDefinitions(includeInactive);
  }

  getInteractionOutcomes(caseId: string, interactionId: string): Promise<unknown[]> {
    return this.repository.getInteractionOutcomes(caseId, interactionId);
  }

  saveInteractionOutcomes(
    caseId: string,
    interactionId: string,
    payload: UpdateInteractionOutcomeImpactsDTO,
    userId?: string
  ): Promise<unknown[]> {
    return this.repository.saveInteractionOutcomes(caseId, interactionId, payload, userId);
  }

  listCaseOutcomes(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseOutcomes(caseId.trim());
  }

  createCaseOutcome(caseId: string, data: CreateCaseOutcomeDTO, userId?: string): Promise<unknown> {
    const normalizedData: CreateCaseOutcomeDTO = {
      ...data,
      outcome_type: normalizeText(data.outcome_type) ?? undefined,
      notes: normalizeText(data.notes) ?? undefined,
    };
    return this.repository.createCaseOutcome(caseId.trim(), normalizedData, userId);
  }

  updateCaseOutcome(outcomeId: string, data: UpdateCaseOutcomeDTO, userId?: string): Promise<unknown> {
    const normalizedData: UpdateCaseOutcomeDTO = {
      ...data,
      outcome_type: normalizeText(data.outcome_type),
      notes: normalizeText(data.notes),
    };
    return this.repository.updateCaseOutcome(outcomeId.trim(), normalizedData, userId);
  }

  deleteCaseOutcome(outcomeId: string): Promise<boolean> {
    return this.repository.deleteCaseOutcome(outcomeId.trim());
  }

  listTopicDefinitions(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseTopicDefinitions(caseId.trim());
  }

  createTopicDefinition(caseId: string, data: CreateCaseTopicDefinitionDTO, userId?: string): Promise<unknown> {
    const normalizedData: CreateCaseTopicDefinitionDTO = {
      ...data,
      name: data.name.trim(),
    };
    return this.repository.createCaseTopicDefinition(caseId.trim(), normalizedData, userId);
  }

  listTopicEvents(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseTopicEvents(caseId.trim());
  }

  addTopicEvent(caseId: string, data: CreateCaseTopicEventDTO, userId?: string): Promise<unknown> {
    const normalizedData: CreateCaseTopicEventDTO = {
      ...data,
      topic_definition_id: normalizeText(data.topic_definition_id) ?? undefined,
      topic_name: normalizeText(data.topic_name) ?? undefined,
      notes: normalizeText(data.notes) ?? undefined,
    };
    return this.repository.addCaseTopicEvent(caseId.trim(), normalizedData, userId);
  }

  deleteTopicEvent(topicEventId: string): Promise<boolean> {
    return this.repository.deleteCaseTopicEvent(topicEventId.trim());
  }
}
