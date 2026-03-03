import type { ScheduledReportsPort } from '../types/ports';

export class ScheduledReportsUseCase {
  constructor(private readonly repository: ScheduledReportsPort) {}

  getDomain(): ScheduledReportsPort['domain'] {
    return this.repository.domain;
  }
}
