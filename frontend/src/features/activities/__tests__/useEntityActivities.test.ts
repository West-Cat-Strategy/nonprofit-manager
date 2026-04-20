/**
 * Entity Activities Hook Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityActivities } from '../hooks/useEntityActivities';
import { activitiesApiClient } from '../api';
import type { ActivityFeedPayload } from '../types';

vi.mock('../api', () => ({
  activitiesApiClient: {
    getEntityActivities: vi.fn(),
  },
}));

describe('useEntityActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads entity activities on mount', async () => {
    const mockActivities = {
      activities: [
        {
          id: 'activity-1',
          type: 'case_created' as const,
          title: 'Case created',
          description: 'Case CB-1001: Housing support',
          entity_type: 'case' as const,
          entity_id: 'case-1',
          user_id: 'user-1',
          user_name: 'Case Worker',
          timestamp: '2026-04-19T12:00:00Z',
        },
      ],
      total: 1,
    } satisfies ActivityFeedPayload;

    vi.mocked(activitiesApiClient.getEntityActivities).mockResolvedValueOnce(mockActivities);

    const { result } = renderHook(() =>
      useEntityActivities({
        entityType: 'case',
        entityId: 'case-1',
      })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toEqual(mockActivities.activities);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('handles entity activity errors gracefully', async () => {
    vi.mocked(activitiesApiClient.getEntityActivities).mockRejectedValueOnce(
      new Error('Failed to fetch')
    );

    const { result } = renderHook(() =>
      useEntityActivities({
        entityType: 'contact',
        entityId: 'contact-1',
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load activities');
    expect(result.current.activities).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('passes the entity filters to the api client', async () => {
    const mockActivities = {
      activities: [],
      total: 0,
    } satisfies ActivityFeedPayload;

    vi.mocked(activitiesApiClient.getEntityActivities).mockResolvedValueOnce(mockActivities);

    renderHook(() =>
      useEntityActivities({
        entityType: 'contact',
        entityId: 'contact-1',
      })
    );

    await waitFor(() => {
      expect(activitiesApiClient.getEntityActivities).toHaveBeenCalledWith({
        entityType: 'contact',
        entityId: 'contact-1',
      });
    });
  });
});
