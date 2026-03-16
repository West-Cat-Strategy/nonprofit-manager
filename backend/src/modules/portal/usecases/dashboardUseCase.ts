import { PortalRepository } from '../repositories/portalRepository';

export class PortalDashboardUseCase {
  constructor(private readonly repository: PortalRepository) {}

  getDashboard(contactId: string, portalUserId: string): Promise<Record<string, unknown>> {
    return this.repository.getDashboard(contactId, portalUserId);
  }
}
