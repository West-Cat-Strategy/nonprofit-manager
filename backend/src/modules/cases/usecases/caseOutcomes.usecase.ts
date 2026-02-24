import type { CaseOutcomesPort } from '../types/ports';
import type {
  CreateCaseOutcomeDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  UpdateCaseOutcomeDTO,
} from '@app-types/case';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';

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
    return this.repository.getCaseOutcomes(caseId);
  }

  createCaseOutcome(caseId: string, data: CreateCaseOutcomeDTO, userId?: string): Promise<unknown> {
    return this.repository.createCaseOutcome(caseId, data, userId);
  }

  updateCaseOutcome(outcomeId: string, data: UpdateCaseOutcomeDTO, userId?: string): Promise<unknown> {
    return this.repository.updateCaseOutcome(outcomeId, data, userId);
  }

  deleteCaseOutcome(outcomeId: string): Promise<boolean> {
    return this.repository.deleteCaseOutcome(outcomeId);
  }

  listTopicDefinitions(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseTopicDefinitions(caseId);
  }

  createTopicDefinition(caseId: string, data: CreateCaseTopicDefinitionDTO, userId?: string): Promise<unknown> {
    return this.repository.createCaseTopicDefinition(caseId, data, userId);
  }

  listTopicEvents(caseId: string): Promise<unknown[]> {
    return this.repository.getCaseTopicEvents(caseId);
  }

  addTopicEvent(caseId: string, data: CreateCaseTopicEventDTO, userId?: string): Promise<unknown> {
    return this.repository.addCaseTopicEvent(caseId, data, userId);
  }

  deleteTopicEvent(topicEventId: string): Promise<boolean> {
    return this.repository.deleteCaseTopicEvent(topicEventId);
  }
}
