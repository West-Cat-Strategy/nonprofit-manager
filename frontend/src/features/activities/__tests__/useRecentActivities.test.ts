/**
 * Activities Hooks Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecentActivities } from '../hooks/useRecentActivities';
import { activitiesApiClient } from '../api';
import type { ActivityFeedPayload } from '../types';

vi.mock('../api', () => ({
  activitiesApiClient: {
    getRecentActivities: vi.fn(),
  },
}));

describe('useRecentActivities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads recent activities on mount', async () => {
    const mockActivities = {
      activities: [
        {
          id: 'activity-1',
          type: 'contact_created' as const,
          title: 'Contact created',
          description: 'John Doe was added',
          entity_type: 'contact' as const,
          entity_id: 'contact-1',
          user_id: 'user-1',
          user_name: 'Jane Smith',
          timestamp: '2026-04-19T12:00:00Z',
        },
      ],
      total: 1,
    } satisfies ActivityFeedPayload;

    vi.mocked(activitiesApiClient.getRecentActivities).mockResolvedValueOnce(mockActivities);

    const { result } = renderHook(() => useRecentActivities());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activities).toEqual(mockActivities.activities);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('handles errors gracefully', async () => {
    vi.mocked(activitiesApiClient.getRecentActivities).mockRejectedValueOnce(
      new Error('Failed to fetch')
    );

    const { result } = renderHook(() => useRecentActivities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load activities');
    expect(result.current.activities).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('respects limit filter', async () => {
    const mockActivities = {
      activities: [],
      total: 0,
    } satisfies ActivityFeedPayload;

    vi.mocked(activitiesApiClient.getRecentActivities).mockResolvedValueOnce(mockActivities);

    renderHook(() => useRecentActivities({ limit: 10 }));

    await waitFor(() => {
      expect(activitiesApiClient.getRecentActivities).toHaveBeenCalledWith({ limit: 10 });
    });
  });
});
