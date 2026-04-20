/**
 * Activities API Client Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../services/api';
import { ActivitiesApiClient } from '../api/activitiesApiClient';
import type { ActivityFeedPayload } from '../types';

vi.mock('../../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('ActivitiesApiClient', () => {
  const client = new ActivitiesApiClient();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches recent activities with default parameters', async () => {
    const mockActivities = {
      activities: [
        {
          id: 'activity-1',
          type: 'contact_created' as const,
          title: 'Contact created',
          description: 'John Doe was added to the directory',
          entity_type: 'contact' as const,
          entity_id: 'contact-1',
          user_id: 'user-1',
          user_name: 'Jane Smith',
          timestamp: '2026-04-19T12:00:00Z',
        },
      ],
      total: 1,
    } satisfies ActivityFeedPayload;

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockActivities,
      },
    } as never);

    const result = await client.getRecentActivities();

    expect(api.get).toHaveBeenCalledWith('/v2/activities/recent');
    expect(result).toEqual(mockActivities);
  });

  it('fetches recent activities with limit parameter', async () => {
    const mockActivities = {
      activities: [],
      total: 0,
    } satisfies ActivityFeedPayload;

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockActivities,
      },
    } as never);

    await client.getRecentActivities({ limit: 10 });

    expect(api.get).toHaveBeenCalledWith('/v2/activities/recent?limit=10');
  });

  it('fetches entity-specific activities', async () => {
    const mockActivities = {
      activities: [
        {
          id: 'activity-2',
          type: 'case_created' as const,
          title: 'Case created',
          description: 'Case CB-1001: Housing support',
          entity_type: 'case' as const,
          entity_id: 'case-1',
          user_id: 'user-1',
          user_name: 'Jane Smith',
          timestamp: '2026-04-19T11:00:00Z',
        },
      ],
      total: 1,
    } satisfies ActivityFeedPayload;

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockActivities,
      },
    } as never);

    const result = await client.getEntityActivities({
      entityType: 'case',
      entityId: 'case-1',
    });

    expect(api.get).toHaveBeenCalledWith('/v2/activities/case/case-1');
    expect(result).toEqual(mockActivities);
  });

  it('does not append unsupported entity query parameters', async () => {
    const mockActivities = {
      activities: [],
      total: 0,
    } satisfies ActivityFeedPayload;

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockActivities,
      },
    } as never);

    await client.getEntityActivities({
      entityType: 'donation',
      entityId: 'donation-1',
    });

    expect(api.get).toHaveBeenCalledWith('/v2/activities/donation/donation-1');
  });
});
