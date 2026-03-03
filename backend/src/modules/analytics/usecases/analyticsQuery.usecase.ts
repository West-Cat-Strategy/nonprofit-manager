import type { AnalyticsQueryPort } from '../types/ports';

export class AnalyticsQueryUseCase {
  constructor(private readonly repository: AnalyticsQueryPort) {}

  getDomain(): AnalyticsQueryPort['domain'] {
    return this.repository.domain;
  }
}
