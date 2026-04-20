import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ActivityFeedWidget from '../ActivityFeedWidget';
import type { DashboardWidget } from '../../../types/dashboard';
import { useRecentActivities } from '../../../features/activities/hooks';

vi.mock('../../../features/activities/hooks', () => ({
  useRecentActivities: vi.fn(),
}));

const mockWidget: DashboardWidget = {
  id: 'activity-feed-1',
  type: 'activity_feed',
  title: 'Activity Feed',
  enabled: true,
  layout: {
    i: 'activity-feed-1',
    x: 0,
    y: 0,
    w: 4,
    h: 3,
  },
};

describe('ActivityFeedWidget', () => {
  const refreshMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useRecentActivities).mockReturnValue({
      activities: [],
      total: 0,
      loading: false,
      error: null,
      refresh: refreshMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses the feature-owned recent activities hook and refresh interval', () => {
    render(<ActivityFeedWidget widget={mockWidget} editMode={false} onRemove={() => {}} />);

    expect(useRecentActivities).toHaveBeenCalledWith({ limit: 10 });

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it('renders activity records from the feature hook', () => {
    vi.mocked(useRecentActivities).mockReturnValue({
      activities: [
        {
          id: 'activity-1',
          type: 'donation_received',
          title: 'Donation received',
          description: 'Taylor donated $50.00',
          timestamp: '2026-04-19T12:00:00.000Z',
          user_id: null,
          user_name: 'Taylor',
          entity_type: 'donation',
          entity_id: 'donation-1',
          metadata: {},
        },
      ],
      total: 1,
      loading: false,
      error: null,
      refresh: refreshMock,
    });

    render(<ActivityFeedWidget widget={mockWidget} editMode={false} onRemove={() => {}} />);

    expect(screen.getByText('Donation received')).toBeInTheDocument();
    expect(screen.getByText('Taylor donated $50.00')).toBeInTheDocument();
  });

  it('renders the empty state when there are no recent activities', () => {
    render(<ActivityFeedWidget widget={mockWidget} editMode={false} onRemove={() => {}} />);

    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });
});
