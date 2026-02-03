import { AnalyticsService } from '../../services/analyticsService';
import { Pool } from 'pg';

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Helper to create query matcher for complex tests with parallel queries
type QueryResult = { rows: Record<string, unknown>[] };
type QueryMatcher = (query: string, params?: unknown[]) => QueryResult | null;

function createQueryMatcher(matchers: Record<string, QueryResult>): QueryMatcher {
  return (query: string) => {
    for (const [pattern, result] of Object.entries(matchers)) {
      if (query.toLowerCase().includes(pattern.toLowerCase())) {
        return result;
      }
    }
    return { rows: [] };
  };
}

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    } as unknown as jest.Mocked<Pool>;
    analyticsService = new AnalyticsService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDonationMetrics', () => {
    it('should return donation metrics for an account', async () => {
      // Mock stats query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_amount: '5000',
            total_count: '10',
            average_amount: '500',
            first_donation_date: '2024-01-15',
            last_donation_date: '2024-06-15',
            largest_donation: '2000',
            recurring_donations: '2',
            recurring_amount: '1000',
          },
        ],
      });

      // Mock payment method query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { payment_method: 'credit_card', count: '5', amount: '2500' },
          { payment_method: 'check', count: '5', amount: '2500' },
        ],
      });

      // Mock year query
      mockQuery.mockResolvedValueOnce({
        rows: [{ year: '2024', count: '10', amount: '5000' }],
      });

      const result = await analyticsService.getDonationMetrics('account', 'account-123');

      expect(result.total_amount).toBe(5000);
      expect(result.total_count).toBe(10);
      expect(result.average_amount).toBe(500);
      expect(result.recurring_donations).toBe(2);
      expect(result.by_payment_method).toHaveProperty('credit_card');
      expect(result.by_year).toHaveProperty('2024');
    });

    it('should handle empty donation data', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_amount: '0',
            total_count: '0',
            average_amount: '0',
            first_donation_date: null,
            last_donation_date: null,
            largest_donation: '0',
            recurring_donations: '0',
            recurring_amount: '0',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await analyticsService.getDonationMetrics('contact', 'contact-123');

      expect(result.total_amount).toBe(0);
      expect(result.total_count).toBe(0);
      expect(result.by_payment_method).toEqual({});
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(analyticsService.getDonationMetrics('account', 'account-123')).rejects.toThrow(
        'Failed to retrieve donation metrics'
      );
    });
  });

  describe('getEventMetrics', () => {
    it('should return event metrics for a contact', async () => {
      // Mock stats query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_registrations: '5',
            events_attended: '4',
            no_shows: '1',
          },
        ],
      });

      // Mock event type query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { event_type: 'fundraiser', count: '3' },
          { event_type: 'volunteer', count: '2' },
        ],
      });

      // Mock recent events query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            event_id: 'event-1',
            event_name: 'Annual Gala',
            event_date: '2024-06-01',
            status: 'confirmed',
          },
        ],
      });

      const result = await analyticsService.getEventMetrics('contact', 'contact-123');

      expect(result.total_registrations).toBe(5);
      expect(result.events_attended).toBe(4);
      expect(result.no_shows).toBe(1);
      expect(result.attendance_rate).toBe(0.8);
      expect(result.by_event_type).toHaveProperty('fundraiser');
      expect(result.recent_events).toHaveLength(1);
    });

    it('should calculate attendance rate correctly', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_registrations: '10',
            events_attended: '7',
            no_shows: '3',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await analyticsService.getEventMetrics('account', 'account-123');

      expect(result.attendance_rate).toBe(0.7);
    });

    it('should handle zero registrations', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_registrations: '0',
            events_attended: '0',
            no_shows: '0',
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await analyticsService.getEventMetrics('contact', 'contact-123');

      expect(result.total_registrations).toBe(0);
      expect(result.attendance_rate).toBe(0);
    });
  });

  describe('getVolunteerMetrics', () => {
    it('should return volunteer metrics for a contact', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            volunteer_id: 'vol-123',
            skills: ['Teaching', 'Organizing'],
            availability_status: 'available',
            volunteer_since: '2023-01-01',
            total_hours: '50',
            total_assignments: '10',
            completed_assignments: '8',
            active_assignments: '2',
          },
        ],
      });

      // Mock hours by month query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { month: '2024-06', hours: '10' },
          { month: '2024-05', hours: '8' },
        ],
      });

      // Mock recent assignments query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            assignment_id: 'assign-1',
            event_name: 'Charity Run',
            task_subject: null,
            hours_logged: '4',
            status: 'completed',
          },
        ],
      });

      const result = await analyticsService.getVolunteerMetrics('contact-123');

      expect(result).not.toBeNull();
      expect(result!.total_hours).toBe(50);
      expect(result!.total_assignments).toBe(10);
      expect(result!.completed_assignments).toBe(8);
      expect(result!.skills).toContain('Teaching');
      expect(result!.hours_by_month).toHaveProperty('2024-06');
    });

    it('should return null if contact is not a volunteer', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await analyticsService.getVolunteerMetrics('contact-123');

      expect(result).toBeNull();
    });
  });

  describe('getTaskMetrics', () => {
    it('should return task metrics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_tasks: '20',
            completed_tasks: '15',
            pending_tasks: '3',
            overdue_tasks: '2',
            priority_low: '5',
            priority_normal: '10',
            priority_high: '4',
            priority_urgent: '1',
            status_not_started: '2',
            status_in_progress: '1',
            status_waiting: '0',
            status_completed: '15',
            status_deferred: '1',
            status_cancelled: '1',
          },
        ],
      });

      const result = await analyticsService.getTaskMetrics('contact', 'contact-123');

      expect(result.total_tasks).toBe(20);
      expect(result.completed_tasks).toBe(15);
      expect(result.overdue_tasks).toBe(2);
      expect(result.by_priority.high).toBe(4);
      expect(result.by_status.completed).toBe(15);
    });
  });

  describe('getAccountAnalytics', () => {
    it('should return full analytics for an account', async () => {
      // Use pattern-based mock for parallel queries
      const matcher = createQueryMatcher({
        'FROM accounts a': {
          rows: [
            {
              account_id: 'account-123',
              account_name: 'Test Org',
              account_type: 'organization',
              category: 'donor',
              created_at: '2023-01-01',
              contact_count: '5',
            },
          ],
        },
        "cr.name = 'Primary Contact'": {
          rows: [{ contact_id: 'contact-1', name: 'John Doe', email: 'john@test.com' }],
        },
        'SUM(amount)': {
          rows: [
            {
              total_amount: '5000',
              total_count: '10',
              average_amount: '500',
              first_donation_date: '2024-01-15',
              last_donation_date: '2024-06-15',
              largest_donation: '2000',
              recurring_donations: '2',
              recurring_amount: '1000',
            },
          ],
        },
        'GROUP BY payment_method': { rows: [] },
        'EXTRACT(YEAR FROM donation_date)': { rows: [] },
        'total_registrations': {
          rows: [{ total_registrations: '5', events_attended: '4', no_shows: '1' }],
        },
        'GROUP BY e.event_type': { rows: [] },
        'ORDER BY e.start_date': { rows: [] },
        'related_to_type': {
          rows: [
            {
              total_tasks: '10',
              completed_tasks: '8',
              pending_tasks: '2',
              overdue_tasks: '0',
              priority_low: '2',
              priority_normal: '5',
              priority_high: '3',
              priority_urgent: '0',
              status_not_started: '1',
              status_in_progress: '1',
              status_waiting: '0',
              status_completed: '8',
              status_deferred: '0',
              status_cancelled: '0',
            },
          ],
        },
      });

      mockQuery.mockImplementation((query: string) => {
        const result = matcher(query);
        return Promise.resolve(result);
      });

      const result = await analyticsService.getAccountAnalytics('account-123');

      expect(result.account_id).toBe('account-123');
      expect(result.account_name).toBe('Test Org');
      expect(result.contact_count).toBe(5);
      expect(result.donation_metrics.total_amount).toBe(5000);
      expect(result.engagement_score).toBeGreaterThan(0);
      expect(['high', 'medium', 'low', 'inactive']).toContain(result.engagement_level);
    });

    it('should throw error for non-existent account', async () => {
      mockQuery.mockImplementation((query: string) => {
        if (query.includes('FROM accounts a')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(analyticsService.getAccountAnalytics('nonexistent')).rejects.toThrow(
        'Account not found'
      );
    });
  });

  describe('getContactAnalytics', () => {
    it('should return full analytics for a contact', async () => {
      // Use pattern-based mock for parallel queries
      const matcher = createQueryMatcher({
        'FROM contacts c': {
          rows: [
            {
              contact_id: 'contact-123',
              contact_name: 'Jane Doe',
              email: 'jane@test.com',
              account_id: 'account-1',
              account_name: 'Test Org',
              contact_roles: ['Primary Contact'],
              created_at: '2023-01-01',
            },
          ],
        },
        'SUM(amount)': {
          rows: [
            {
              total_amount: '1000',
              total_count: '5',
              average_amount: '200',
              first_donation_date: '2024-01-15',
              last_donation_date: '2024-06-15',
              largest_donation: '500',
              recurring_donations: '1',
              recurring_amount: '200',
            },
          ],
        },
        'GROUP BY payment_method': { rows: [] },
        'EXTRACT(YEAR FROM donation_date)': { rows: [] },
        'total_registrations': {
          rows: [{ total_registrations: '3', events_attended: '3', no_shows: '0' }],
        },
        'GROUP BY e.event_type': { rows: [] },
        'ORDER BY e.start_date': { rows: [] },
        'FROM volunteers v': { rows: [] }, // Contact is not a volunteer
        'related_to_type': {
          rows: [
            {
              total_tasks: '5',
              completed_tasks: '4',
              pending_tasks: '1',
              overdue_tasks: '0',
              priority_low: '1',
              priority_normal: '3',
              priority_high: '1',
              priority_urgent: '0',
              status_not_started: '1',
              status_in_progress: '0',
              status_waiting: '0',
              status_completed: '4',
              status_deferred: '0',
              status_cancelled: '0',
            },
          ],
        },
      });

      mockQuery.mockImplementation((query: string) => {
        const result = matcher(query);
        return Promise.resolve(result);
      });

      const result = await analyticsService.getContactAnalytics('contact-123');

      expect(result.contact_id).toBe('contact-123');
      expect(result.contact_name).toBe('Jane Doe');
      expect(result.account_name).toBe('Test Org');
      expect(result.donation_metrics.total_amount).toBe(1000);
      expect(result.volunteer_metrics).toBeNull();
      expect(result.engagement_score).toBeGreaterThan(0);
    });

    it('should throw error for non-existent contact', async () => {
      mockQuery.mockImplementation((query: string) => {
        if (query.includes('FROM contacts c')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(analyticsService.getContactAnalytics('nonexistent')).rejects.toThrow(
        'Contact not found'
      );
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should return organization-wide analytics summary', async () => {
      // Mock account query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_accounts: '100', active_accounts: '90' }],
      });

      // Mock contact query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_contacts: '500', active_contacts: '450' }],
      });

      // Mock donation query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_donations: '50000', donation_count: '200', average_donation: '250' }],
      });

      // Mock event query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_events: '25' }],
      });

      // Mock volunteer query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_volunteers: '50', total_hours: '1000' }],
      });

      // Mock engagement distribution query
      mockQuery.mockResolvedValueOnce({
        rows: [
          { engagement_level: 'high', count: '100' },
          { engagement_level: 'medium', count: '200' },
          { engagement_level: 'low', count: '100' },
          { engagement_level: 'inactive', count: '50' },
        ],
      });

      const result = await analyticsService.getAnalyticsSummary();

      expect(result.total_accounts).toBe(100);
      expect(result.active_accounts).toBe(90);
      expect(result.total_contacts).toBe(500);
      expect(result.total_donations_ytd).toBe(50000);
      expect(result.total_volunteers).toBe(50);
      expect(result.engagement_distribution.high).toBe(100);
    });

    it('should accept date range filters', async () => {
      mockQuery.mockResolvedValue({ rows: [{}] });

      await analyticsService.getAnalyticsSummary({
        start_date: '2024-01-01',
        end_date: '2024-06-30',
      });

      // Verify filters were passed to the queries
      expect(mockQuery).toHaveBeenCalled();
    });
  });

  describe('engagement score calculation', () => {
    it('should calculate high engagement for active donors and volunteers', async () => {
      // Use pattern-based mock for parallel queries - high engagement
      const matcher = createQueryMatcher({
        'FROM accounts a': {
          rows: [
            {
              account_id: 'account-123',
              account_name: 'Engaged Org',
              account_type: 'organization',
              category: 'donor',
              created_at: '2023-01-01',
              contact_count: '10',
            },
          ],
        },
        "cr.name = 'Primary Contact'": { rows: [] },
        'SUM(amount)': {
          rows: [
            {
              total_amount: '50000',
              total_count: '20',
              average_amount: '2500',
              first_donation_date: '2024-01-15',
              last_donation_date: '2024-06-15',
              largest_donation: '10000',
              recurring_donations: '5',
              recurring_amount: '5000',
            },
          ],
        },
        'GROUP BY payment_method': { rows: [] },
        'EXTRACT(YEAR FROM donation_date)': { rows: [] },
        'total_registrations': {
          rows: [{ total_registrations: '20', events_attended: '18', no_shows: '2' }],
        },
        'GROUP BY e.event_type': { rows: [] },
        'ORDER BY e.start_date': { rows: [] },
        'related_to_type': {
          rows: [
            {
              total_tasks: '30',
              completed_tasks: '25',
              pending_tasks: '5',
              overdue_tasks: '0',
              priority_low: '5',
              priority_normal: '15',
              priority_high: '8',
              priority_urgent: '2',
              status_not_started: '3',
              status_in_progress: '2',
              status_waiting: '0',
              status_completed: '25',
              status_deferred: '0',
              status_cancelled: '0',
            },
          ],
        },
      });

      mockQuery.mockImplementation((query: string) => {
        const result = matcher(query);
        return Promise.resolve(result);
      });

      const result = await analyticsService.getAccountAnalytics('account-123');

      expect(result.engagement_level).toBe('high');
      expect(result.engagement_score).toBeGreaterThanOrEqual(60);
    });

    it('should calculate inactive for no engagement', async () => {
      // Use pattern-based mock for parallel queries - no engagement
      const matcher = createQueryMatcher({
        'FROM accounts a': {
          rows: [
            {
              account_id: 'account-456',
              account_name: 'Inactive Org',
              account_type: 'organization',
              category: 'other',
              created_at: '2023-01-01',
              contact_count: '1',
            },
          ],
        },
        "cr.name = 'Primary Contact'": { rows: [] },
        'SUM(amount)': {
          rows: [
            {
              total_amount: '0',
              total_count: '0',
              average_amount: '0',
              first_donation_date: null,
              last_donation_date: null,
              largest_donation: '0',
              recurring_donations: '0',
              recurring_amount: '0',
            },
          ],
        },
        'GROUP BY payment_method': { rows: [] },
        'EXTRACT(YEAR FROM donation_date)': { rows: [] },
        'total_registrations': {
          rows: [{ total_registrations: '0', events_attended: '0', no_shows: '0' }],
        },
        'GROUP BY e.event_type': { rows: [] },
        'ORDER BY e.start_date': { rows: [] },
        'related_to_type': {
          rows: [
            {
              total_tasks: '0',
              completed_tasks: '0',
              pending_tasks: '0',
              overdue_tasks: '0',
              priority_low: '0',
              priority_normal: '0',
              priority_high: '0',
              priority_urgent: '0',
              status_not_started: '0',
              status_in_progress: '0',
              status_waiting: '0',
              status_completed: '0',
              status_deferred: '0',
              status_cancelled: '0',
            },
          ],
        },
      });

      mockQuery.mockImplementation((query: string) => {
        const result = matcher(query);
        return Promise.resolve(result);
      });

      const result = await analyticsService.getAccountAnalytics('account-456');

      expect(result.engagement_level).toBe('inactive');
      expect(result.engagement_score).toBe(0);
    });
  });
});
