import * as outcomeDefinitionService from '@services/outcomeDefinitionService';
import * as outcomeImpactService from '@services/outcomeImpactService';
import pool from '@config/database';
import type { CaseOutcomesPort } from '../types/ports';
import type {
  CreateCaseOutcomeDTO,
  CreateCaseTopicDefinitionDTO,
  CreateCaseTopicEventDTO,
  UpdateCaseOutcomeDTO,
} from '@app-types/case';
import type { UpdateInteractionOutcomeImpactsDTO } from '@app-types/outcomes';
import {
  addCaseTopicEventQuery,
  createCaseOutcomeQuery,
  createCaseTopicDefinitionQuery,
  deleteCaseOutcomeQuery,
  deleteCaseTopicEventQuery,
  getCaseOutcomesQuery,
  getCaseTopicDefinitionsQuery,
  getCaseTopicEventsQuery,
  updateCaseOutcomeQuery,
} from '../queries/outcomesQueries';

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
    return getCaseOutcomesQuery(pool, caseId);
  }

  async createCaseOutcome(caseId: string, data: CreateCaseOutcomeDTO, userId?: string): Promise<unknown> {
    return createCaseOutcomeQuery(pool, caseId, data, userId);
  }

  async updateCaseOutcome(outcomeId: string, data: UpdateCaseOutcomeDTO, userId?: string): Promise<unknown> {
    return updateCaseOutcomeQuery(pool, outcomeId, data, userId);
  }

  async deleteCaseOutcome(outcomeId: string): Promise<boolean> {
    return deleteCaseOutcomeQuery(pool, outcomeId);
  }

  async getCaseTopicDefinitions(caseId: string): Promise<unknown[]> {
    return getCaseTopicDefinitionsQuery(pool, caseId);
  }

  async createCaseTopicDefinition(
    caseId: string,
    data: CreateCaseTopicDefinitionDTO,
    userId?: string
  ): Promise<unknown> {
    return createCaseTopicDefinitionQuery(pool, caseId, data, userId);
  }

  async getCaseTopicEvents(caseId: string): Promise<unknown[]> {
    return getCaseTopicEventsQuery(pool, caseId);
  }

  async addCaseTopicEvent(caseId: string, data: CreateCaseTopicEventDTO, userId?: string): Promise<unknown> {
    return addCaseTopicEventQuery(pool, caseId, data, userId);
  }

  async deleteCaseTopicEvent(topicEventId: string): Promise<boolean> {
    return deleteCaseTopicEventQuery(pool, topicEventId);
  }
}
