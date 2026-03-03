import type { SavedReportsPort } from '../types/ports';

export class SavedReportsUseCase {
  constructor(private readonly repository: SavedReportsPort) {}

  getDomain(): SavedReportsPort['domain'] {
    return this.repository.domain;
  }
}
