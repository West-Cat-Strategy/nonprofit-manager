import type { CaseOutcomesPort } from '../types/ports';
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
}
