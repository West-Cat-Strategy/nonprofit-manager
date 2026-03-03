import type { FollowUpsPort } from '../types/ports';

export class FollowUpsUseCase {
  constructor(private readonly repository: FollowUpsPort) {}

  getDomain(): FollowUpsPort['domain'] {
    return this.repository.domain;
  }
}
