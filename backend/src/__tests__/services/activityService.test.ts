const mockQuery = jest.fn();
const mockListRecentActivities = jest.fn();
const mockListActivitiesForEntity = jest.fn();

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
  },
}));

jest.mock('@services/activityEventService', () => ({
  activityEventService: {
    listRecentActivities: (...args: unknown[]) => mockListRecentActivities(...args),
    listActivitiesForEntity: (...args: unknown[]) => mockListActivitiesForEntity(...args),
  },
}));

import { ActivityService } from '../../modules/activities/services/activityService';

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActivityService();
  });

  it('merges recent activities, keeps primary duplicates, and scopes every feed query to the organization', async () => {
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

    const result = await service.getRecentActivities(10, 'org-1');

    expect(mockListRecentActivities).toHaveBeenCalledWith(10, 'org-1');
    expect(mockQuery).toHaveBeenCalledTimes(4);
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("COALESCE(c.account_id, con.account_id) = $1"),
      ['org-1', 5]
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('COALESCE(d.account_id, c.account_id) = $1'),
      ['org-1', 4]
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('AND c.account_id = $1'),
      ['org-1', 3]
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('COALESCE(e.organization_id, c.account_id) = $1'),
      ['org-1', 3]
    );
    expect(result.map((activity) => activity.id)).toEqual([
      'case-1',
      'donation-2',
      'volunteer-3',
      'event-reg-4',
    ]);
    expect(result.find((activity) => activity.id === 'case-1')?.title).toBe('Recorded case event');
  });

  it('guards contact activity fan-out behind a contact ownership check and scopes the note fallback query', async () => {
    mockListActivitiesForEntity.mockResolvedValueOnce([
      {
        id: 'recorded-1',
        type: 'contact_note_added',
        title: 'Recorded activity',
        description: 'From activity events',
        timestamp: '2026-03-14T12:00:00.000Z',
        user_id: 'user-1',
        user_name: 'Recorder',
        entity_type: 'contact',
        entity_id: 'contact-1',
        metadata: {},
      },
    ]);

    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'contact-1' }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            note_type: 'general',
            subject: 'Introduced services',
            content: 'Shared a quick orientation note.',
            created_at: '2026-03-15T12:00:00.000Z',
            user_name: 'Case Worker',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.getActivitiesForEntity('contact', 'contact-1', 'org-1');

    expect(mockListActivitiesForEntity).toHaveBeenCalledWith('contact', 'contact-1', 'org-1');
    expect(mockQuery).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('FROM contacts'),
      ['contact-1', 'org-1']
    );
    expect(mockQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('AND c.account_id = $2'),
      ['contact-1', 'org-1']
    );
    expect(result.map((activity) => activity.id)).toEqual(['note-1', 'recorded-1']);
  });

  it('returns only recorded activities when the contact is outside the active organization', async () => {
    const recordedActivities = [
      {
        id: 'recorded-2',
        type: 'contact_note_added',
        title: 'Recorded activity',
        description: 'Already scoped in activity events',
        timestamp: '2026-03-14T12:00:00.000Z',
        user_id: 'user-1',
        user_name: 'Recorder',
        entity_type: 'contact',
        entity_id: 'contact-2',
        metadata: {},
      },
    ];

    mockListActivitiesForEntity.mockResolvedValueOnce(recordedActivities);
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await service.getActivitiesForEntity('contact', 'contact-2', 'org-1');

    expect(mockListActivitiesForEntity).toHaveBeenCalledWith('contact', 'contact-2', 'org-1');
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(result).toEqual(recordedActivities);
  });
});
