const mockQuery = jest.fn();
const mockListRecentActivities = jest.fn();

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
  },
}));

jest.mock('../../services/activityEventService', () => ({
  activityEventService: {
    listRecentActivities: (...args: unknown[]) => mockListRecentActivities(...args),
  },
}));

import { ActivityService } from '../../services/activityService';

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActivityService();
  });

  it('merges recent activities, keeps primary duplicates, and sorts newest first', async () => {
    mockListRecentActivities.mockResolvedValueOnce([
      {
        id: 'case-1',
        type: 'case_created',
        title: 'Recorded case event',
        description: 'Primary duplicate should win',
        timestamp: '2026-03-13T12:00:00.000Z',
        user_id: 'user-1',
        user_name: 'Primary User',
        entity_type: 'case',
        entity_id: '1',
        metadata: {},
      },
    ]);

    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            case_number: 'CASE-001',
            title: 'Generated case event',
            created_at: '2026-03-12T12:00:00.000Z',
            assigned_to: 'user-2',
            status_name: 'Open',
            user_name: 'Case Owner',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '2',
            amount: '42.00',
            donation_date: '2026-03-11T12:00:00.000Z',
            payment_method: 'card',
            donor_name: 'Donor One',
            contact_name: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '3',
            hours_logged: '3.5',
            activity_date: '2026-03-10T12:00:00.000Z',
            notes: 'Shift note',
            volunteer_name: 'Volunteer One',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '4',
            registered_at: '2026-03-09T12:00:00.000Z',
            event_name: 'Community Dinner',
            attendee_name: 'Attendee One',
          },
        ],
      });

    const result = await service.getRecentActivities(10);

    expect(mockListRecentActivities).toHaveBeenCalledWith(10, undefined);
    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(result.map((activity) => activity.id)).toEqual([
      'case-1',
      'donation-2',
      'volunteer-3',
      'event-reg-4',
    ]);
    expect(result.find((activity) => activity.id === 'case-1')?.title).toBe('Recorded case event');
  });
});
