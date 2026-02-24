import * as outcomeDefinitionService from '@services/outcomeDefinitionService';
import * as outcomeImpactService from '@services/outcomeImpactService';
import { services } from '@container/services';
import type { CaseOutcomesPort } from '../types/ports';
import type {
  CreateCaseOutcomeDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  UpdateCaseOutcomeDTO,
} from '@app-types/case';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';

export class CaseOutcomesRepository implements CaseOutcomesPort {
  async listOutcomeDefinitions(includeInactive?: boolean): Promise<unknown[]> {
    return outcomeDefinitionService.listOutcomeDefinitions(includeInactive === true);
  }

  async getInteractionOutcomes(caseId: string, interactionId: string): Promise<unknown[]> {
    return outcomeImpactService.getInteractionOutcomes(caseId, interactionId);
  }

  async saveInteractionOutcomes(
    caseId: string,
    interactionId: string,
    payload: UpdateInteractionOutcomeImpactsDTO,
    userId?: string
  ): Promise<unknown[]> {
    return outcomeImpactService.saveInteractionOutcomes(caseId, interactionId, payload, userId);
  }

  async getCaseOutcomes(caseId: string): Promise<unknown[]> {
    return services.case.getCaseOutcomes(caseId);
  }

  async createCaseOutcome(caseId: string, data: CreateCaseOutcomeDTO, userId?: string): Promise<unknown> {
    return services.case.createCaseOutcome(caseId, data, userId);
  }

  async updateCaseOutcome(outcomeId: string, data: UpdateCaseOutcomeDTO, userId?: string): Promise<unknown> {
    return services.case.updateCaseOutcome(outcomeId, data, userId);
  }

  async deleteCaseOutcome(outcomeId: string): Promise<boolean> {
    return services.case.deleteCaseOutcome(outcomeId);
  }

  async getCaseTopicDefinitions(caseId: string): Promise<unknown[]> {
    return services.case.getCaseTopicDefinitions(caseId);
  }

  async createCaseTopicDefinition(
    caseId: string,
    data: CreateCaseTopicDefinitionDTO,
    userId?: string
  ): Promise<unknown> {
    return services.case.createCaseTopicDefinition(caseId, data, userId);
  }

  async getCaseTopicEvents(caseId: string): Promise<unknown[]> {
    return services.case.getCaseTopicEvents(caseId);
  }

  async addCaseTopicEvent(caseId: string, data: CreateCaseTopicEventDTO, userId?: string): Promise<unknown> {
    return services.case.addCaseTopicEvent(caseId, data, userId);
  }

  async deleteCaseTopicEvent(topicEventId: string): Promise<boolean> {
    return services.case.deleteCaseTopicEvent(topicEventId);
  }
}
