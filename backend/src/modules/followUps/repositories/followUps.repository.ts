import type { FollowUpsPort } from '../types/ports';

export class FollowUpsRepository implements FollowUpsPort {
  readonly domain = 'followUps' as const;
}
