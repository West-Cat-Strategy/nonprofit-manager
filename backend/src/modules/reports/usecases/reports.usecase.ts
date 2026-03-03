import type { ReportsPort } from '../types/ports';

export class ReportsUseCase {
  constructor(private readonly repository: ReportsPort) {}

  getDomain(): ReportsPort['domain'] {
    return this.repository.domain;
  }
}
