import * as outcomeDefinitionService from '@services/outcomeDefinitionService';
import * as outcomeImpactService from '@services/outcomeImpactService';
import type { CaseOutcomesPort } from '../types/ports';
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
}
