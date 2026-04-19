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
  async listOutcomeDefinitions(includeInactive?: boolean, _organizationId?: string): Promise<unknown[]> {
    return outcomeDefinitionService.listOutcomeDefinitions(includeInactive === true);
  }

  async getInteractionOutcomes(caseId: string, interactionId: string, organizationId?: string): Promise<unknown[]> {
    return outcomeImpactService.getInteractionOutcomes(caseId, interactionId, organizationId);
  }

  async saveInteractionOutcomes(
    caseId: string,
    interactionId: string,
    payload: UpdateInteractionOutcomeImpactsDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown[]> {
    return outcomeImpactService.saveInteractionOutcomes(caseId, interactionId, payload, userId, organizationId);
  }

  async getCaseOutcomes(caseId: string, organizationId?: string): Promise<unknown[]> {
    return getCaseOutcomesQuery(pool, caseId, organizationId);
  }

  async createCaseOutcome(
    caseId: string,
    data: CreateCaseOutcomeDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return createCaseOutcomeQuery(pool, caseId, data, userId, organizationId);
  }

  async updateCaseOutcome(
    outcomeId: string,
    data: UpdateCaseOutcomeDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return updateCaseOutcomeQuery(pool, outcomeId, data, userId, organizationId);
  }

  async deleteCaseOutcome(outcomeId: string, organizationId?: string): Promise<boolean> {
    return deleteCaseOutcomeQuery(pool, outcomeId, organizationId);
  }

  async getCaseTopicDefinitions(caseId: string, organizationId?: string): Promise<unknown[]> {
    return getCaseTopicDefinitionsQuery(pool, caseId, organizationId);
  }

  async createCaseTopicDefinition(
    caseId: string,
    data: CreateCaseTopicDefinitionDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return createCaseTopicDefinitionQuery(pool, caseId, data, userId, organizationId);
  }

  async getCaseTopicEvents(caseId: string, organizationId?: string): Promise<unknown[]> {
    return getCaseTopicEventsQuery(pool, caseId, organizationId);
  }

  async addCaseTopicEvent(
    caseId: string,
    data: CreateCaseTopicEventDTO,
    userId?: string,
    organizationId?: string
  ): Promise<unknown> {
    return addCaseTopicEventQuery(pool, caseId, data, userId, organizationId);
  }

  async deleteCaseTopicEvent(topicEventId: string, organizationId?: string): Promise<boolean> {
    return deleteCaseTopicEventQuery(pool, topicEventId, organizationId);
  }
}
