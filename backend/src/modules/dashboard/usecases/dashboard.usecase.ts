import type { DashboardPort } from '../types/ports';

export class DashboardUseCase {
  constructor(private readonly repository: DashboardPort) {}

  getDomain(): DashboardPort['domain'] {
    return this.repository.domain;
  }
}
