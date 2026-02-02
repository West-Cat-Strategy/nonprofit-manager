import { AnalyticsService } from '../../../services/analyticsService';
import type { Pool } from 'pg';
import type {
  DonationMetrics,
  EventMetrics,
  VolunteerMetrics,
  TaskMetrics,
} from '../../../types/analytics';

// Mock dependencies
jest.mock('../../../config/logger');
jest.mock('../../../config/redis', () => ({
  getCached: jest.fn().mockResolvedValue(null),
  setCached: jest.fn().mockResolvedValue(true),
}));

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    // Create a mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    analyticsService = new AnalyticsService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateEngagementScore', () => {
    it('should calculate correct score for high engagement donor', () => {
      const donationMetrics: DonationMetrics = {
        total_amount: 5000,
        total_count: 10,
        average_amount: 500,
        recurring_donations: 2,
        recurring_amount: 2000,
        largest_donation: 1000,
        first_donation_date: new Date('2020-01-01'),
        last_donation_date: new Date('2024-01-01'),
        by_payment_method: {},
        by_year: {},
      };

      const eventMetrics: EventMetrics = {
        total_registrations: 5,
        events_attended: 4,
        no_shows: 1,
        attendance_rate: 0.8,
        by_event_type: {},
        recent_events: [],
      };

      const volunteerMetrics = null;

      const taskMetrics: TaskMetrics = {
        total_tasks: 10,
        completed_tasks: 8,
        pending_tasks: 2,
        overdue_tasks: 0,
        by_priority: { low: 2, normal: 5, high: 2, urgent: 1 },
        by_status: { not_started: 1, in_progress: 1, waiting: 0, completed: 8, deferred: 0, cancelled: 0 },
      };

      const score = (analyticsService as any).calculateEngagementScore(
        donationMetrics,
        eventMetrics,
        volunteerMetrics,
        taskMetrics
      );

      // Donation: 15 (count) + 15 (recurring) + 5 (amount) = 35
      // Event: 12 (attendance) + 12 (rate) = 24
      // Task: 8 (completion rate) = 8
      // Total: 67
      expect(score).toBeGreaterThanOrEqual(60);
      expect(score).toBeLessThanOrEqual(70);
    });

    it('should calculate score of 0 for inactive constituent', () => {
      const donationMetrics: DonationMetrics = {
        total_amount: 0,
        total_count: 0,
        average_amount: 0,
        recurring_donations: 0,
        recurring_amount: 0,
        largest_donation: 0,
        first_donation_date: null,
        last_donation_date: null,
        by_payment_method: {},
        by_year: {},
      };

      const eventMetrics: EventMetrics = {
        total_registrations: 0,
        events_attended: 0,
        no_shows: 0,
        attendance_rate: 0,
        by_event_type: {},
        recent_events: [],
      };

      const volunteerMetrics = null;

      const taskMetrics: TaskMetrics = {
        total_tasks: 0,
        completed_tasks: 0,
        pending_tasks: 0,
        overdue_tasks: 0,
        by_priority: { low: 0, normal: 0, high: 0, urgent: 0 },
        by_status: { not_started: 0, in_progress: 0, waiting: 0, completed: 0, deferred: 0, cancelled: 0 },
      };

      const score = (analyticsService as any).calculateEngagementScore(
        donationMetrics,
        eventMetrics,
        volunteerMetrics,
        taskMetrics
      );

      expect(score).toBe(0);
    });

    it('should include volunteer metrics in score calculation', () => {
      const donationMetrics: DonationMetrics = {
        total_amount: 0,
        total_count: 0,
        average_amount: 0,
        recurring_donations: 0,
        recurring_amount: 0,
        largest_donation: 0,
        first_donation_date: null,
        last_donation_date: null,
        by_payment_method: {},
        by_year: {},
      };

      const eventMetrics: EventMetrics = {
        total_registrations: 0,
        events_attended: 0,
        no_shows: 0,
        attendance_rate: 0,
        by_event_type: {},
        recent_events: [],
      };

      const volunteerMetrics: VolunteerMetrics = {
        total_hours: 100,
        total_assignments: 10,
        completed_assignments: 10,
        active_assignments: 0,
        skills: ['fundraising', 'events'],
        availability_status: 'available',
        volunteer_since: new Date('2020-01-01'),
        hours_by_month: {},
        recent_assignments: [],
      };

      const taskMetrics: TaskMetrics = {
        total_tasks: 0,
        completed_tasks: 0,
        pending_tasks: 0,
        overdue_tasks: 0,
        by_priority: { low: 0, normal: 0, high: 0, urgent: 0 },
        by_status: { not_started: 0, in_progress: 0, waiting: 0, completed: 0, deferred: 0, cancelled: 0 },
      };

      const score = (analyticsService as any).calculateEngagementScore(
        donationMetrics,
        eventMetrics,
        volunteerMetrics,
        taskMetrics
      );

      // Volunteer: 10 (hours) + 10 (assignments, capped at 5) = 20
      expect(score).toBeGreaterThanOrEqual(15);
      expect(score).toBeLessThanOrEqual(25);
    });

    it('should cap score at 100', () => {
      const donationMetrics: DonationMetrics = {
        total_amount: 100000, // Very large amount
        total_count: 50,
        average_amount: 2000,
        recurring_donations: 10,
        recurring_amount: 50000,
        largest_donation: 10000,
        first_donation_date: new Date('2020-01-01'),
        last_donation_date: new Date('2024-01-01'),
        by_payment_method: {},
        by_year: {},
      };

      const eventMetrics: EventMetrics = {
        total_registrations: 50,
        events_attended: 50,
        no_shows: 0,
        attendance_rate: 1.0,
        by_event_type: {},
        recent_events: [],
      };

      const volunteerMetrics: VolunteerMetrics = {
        total_hours: 1000,
        total_assignments: 50,
        completed_assignments: 50,
        active_assignments: 0,
        skills: [],
        availability_status: 'available',
        volunteer_since: new Date('2020-01-01'),
        hours_by_month: {},
        recent_assignments: [],
      };

      const taskMetrics: TaskMetrics = {
        total_tasks: 100,
        completed_tasks: 100,
        pending_tasks: 0,
        overdue_tasks: 0,
        by_priority: { low: 0, normal: 0, high: 0, urgent: 0 },
        by_status: { not_started: 0, in_progress: 0, waiting: 0, completed: 100, deferred: 0, cancelled: 0 },
      };

      const score = (analyticsService as any).calculateEngagementScore(
        donationMetrics,
        eventMetrics,
        volunteerMetrics,
        taskMetrics
      );

      expect(score).toBe(100);
    });
  });

  describe('getEngagementLevel', () => {
    it('should return "high" for score >= 60', () => {
      expect((analyticsService as any).getEngagementLevel(60)).toBe('high');
      expect((analyticsService as any).getEngagementLevel(80)).toBe('high');
      expect((analyticsService as any).getEngagementLevel(100)).toBe('high');
    });

    it('should return "medium" for score >= 30 and < 60', () => {
      expect((analyticsService as any).getEngagementLevel(30)).toBe('medium');
      expect((analyticsService as any).getEngagementLevel(45)).toBe('medium');
      expect((analyticsService as any).getEngagementLevel(59)).toBe('medium');
    });

    it('should return "low" for score > 0 and < 30', () => {
      expect((analyticsService as any).getEngagementLevel(1)).toBe('low');
      expect((analyticsService as any).getEngagementLevel(15)).toBe('low');
      expect((analyticsService as any).getEngagementLevel(29)).toBe('low');
    });

    it('should return "inactive" for score = 0', () => {
      expect((analyticsService as any).getEngagementLevel(0)).toBe('inactive');
    });
  });

  describe('getDonationMetrics', () => {
    it('should fetch and aggregate donation metrics for an account', async () => {
      const mockAccountId = 'account-123';

      // Mock the query responses
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            total_amount: '5000.00',
            total_count: '10',
            average_amount: '500.00',
            first_donation_date: new Date('2020-01-01'),
            last_donation_date: new Date('2024-01-01'),
            largest_donation: '1000.00',
            recurring_donations: '2',
            recurring_amount: '2000.00',
          }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { payment_method: 'credit_card', count: '8', amount: '4000.00' },
            { payment_method: 'check', count: '2', amount: '1000.00' },
          ],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { year: 2024, count: '5', amount: '2500.00' },
            { year: 2023, count: '5', amount: '2500.00' },
          ],
        } as any);

      const result = await analyticsService.getDonationMetrics('account', mockAccountId);

      expect(result).toEqual({
        total_amount: 5000.00,
        total_count: 10,
        average_amount: 500.00,
        first_donation_date: expect.any(Date),
        last_donation_date: expect.any(Date),
        recurring_donations: 2,
        recurring_amount: 2000.00,
        largest_donation: 1000.00,
        by_payment_method: {
          credit_card: { count: 8, amount: 4000.00 },
          check: { count: 2, amount: 1000.00 },
        },
        by_year: {
          2024: { count: 5, amount: 2500.00 },
          2023: { count: 5, amount: 2500.00 },
        },
      });

      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should fetch donation metrics for a contact', async () => {
      const mockContactId = 'contact-456';

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            total_amount: '1000.00',
            total_count: '2',
            average_amount: '500.00',
            first_donation_date: new Date('2023-01-01'),
            last_donation_date: new Date('2024-01-01'),
            largest_donation: '600.00',
            recurring_donations: '0',
            recurring_amount: '0.00',
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await analyticsService.getDonationMetrics('contact', mockContactId);

      expect(result.total_amount).toBe(1000.00);
      expect(result.total_count).toBe(2);
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should handle errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        analyticsService.getDonationMetrics('account', 'account-123')
      ).rejects.toThrow('Failed to retrieve donation metrics');
    });
  });

  describe('getEventMetrics', () => {
    it('should fetch and aggregate event metrics for a contact', async () => {
      const mockContactId = 'contact-456';

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            total_registrations: '10',
            events_attended: '8',
            no_shows: '2',
          }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { event_type: 'fundraiser', count: '5' },
            { event_type: 'volunteer', count: '5' },
          ],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              event_id: 'event-1',
              event_name: 'Annual Gala',
              event_date: new Date('2024-06-01'),
              status: 'confirmed',
            },
          ],
        } as any);

      const result = await analyticsService.getEventMetrics('contact', mockContactId);

      expect(result).toEqual({
        total_registrations: 10,
        events_attended: 8,
        no_shows: 2,
        attendance_rate: 0.8,
        by_event_type: {
          fundraiser: 5,
          volunteer: 5,
        },
        recent_events: [
          {
            event_id: 'event-1',
            event_name: 'Annual Gala',
            event_date: expect.any(Date),
            status: 'confirmed',
          },
        ],
      });

      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });

    it('should handle zero attendance rate correctly', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            total_registrations: '0',
            events_attended: '0',
            no_shows: '0',
          }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await analyticsService.getEventMetrics('contact', 'contact-123');

      expect(result.attendance_rate).toBe(0);
      expect(result.total_registrations).toBe(0);
    });
  });

  describe('getVolunteerMetrics', () => {
    it('should return null if contact is not a volunteer', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      const result = await analyticsService.getVolunteerMetrics('contact-123');

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should fetch volunteer metrics for an active volunteer', async () => {
      const mockContactId = 'contact-456';

      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            volunteer_id: 'volunteer-1',
            skills: ['fundraising', 'events'],
            availability_status: 'available',
            volunteer_since: new Date('2020-01-01'),
            total_hours: '100.5',
            total_assignments: '10',
            completed_assignments: '8',
            active_assignments: '2',
          }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { month: '2024-01', hours: '25.5' },
            { month: '2023-12', hours: '30.0' },
          ],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              assignment_id: 'assign-1',
              event_name: 'Food Drive',
              task_subject: null,
              hours_logged: '8.0',
              status: 'completed',
            },
          ],
        } as any);

      const result = await analyticsService.getVolunteerMetrics(mockContactId);

      expect(result).toEqual({
        total_hours: 100.5,
        total_assignments: 10,
        completed_assignments: 8,
        active_assignments: 2,
        skills: ['fundraising', 'events'],
        availability_status: 'available',
        volunteer_since: expect.any(Date),
        hours_by_month: {
          '2024-01': 25.5,
          '2023-12': 30.0,
        },
        recent_assignments: [
          {
            assignment_id: 'assign-1',
            event_name: 'Food Drive',
            task_subject: undefined,
            hours_logged: 8.0,
            status: 'completed',
          },
        ],
      });

      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
  });

  describe('getTaskMetrics', () => {
    it('should fetch and aggregate task metrics', async () => {
      const mockAccountId = 'account-123';

      mockPool.query.mockResolvedValueOnce({
        rows: [{
          total_tasks: '50',
          completed_tasks: '30',
          pending_tasks: '15',
          overdue_tasks: '5',
          priority_low: '10',
          priority_normal: '25',
          priority_high: '10',
          priority_urgent: '5',
          status_not_started: '10',
          status_in_progress: '5',
          status_waiting: '0',
          status_completed: '30',
          status_deferred: '3',
          status_cancelled: '2',
        }],
      } as any);

      const result = await analyticsService.getTaskMetrics('account', mockAccountId);

      expect(result).toEqual({
        total_tasks: 50,
        completed_tasks: 30,
        pending_tasks: 15,
        overdue_tasks: 5,
        by_priority: {
          low: 10,
          normal: 25,
          high: 10,
          urgent: 5,
        },
        by_status: {
          not_started: 10,
          in_progress: 5,
          waiting: 0,
          completed: 30,
          deferred: 3,
          cancelled: 2,
        },
      });

      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAccountAnalytics', () => {
    it('should fetch complete analytics for an account', async () => {
      const mockAccountId = 'account-123';

      // Mock account query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          account_id: mockAccountId,
          account_name: 'Test Organization',
          account_type: 'organization',
          category: 'corporate',
          created_at: new Date('2020-01-01'),
          contact_count: '5',
        }],
      } as any);

      // Mock primary contact query
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          contact_id: 'contact-1',
          name: 'John Doe',
          email: 'john@example.com',
        }],
      } as any);

      // Mock donation metrics (3 queries)
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_amount: '1000', total_count: '2', average_amount: '500', first_donation_date: null, last_donation_date: null, largest_donation: '600', recurring_donations: '0', recurring_amount: '0' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      // Mock event metrics (3 queries)
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_registrations: '5', events_attended: '4', no_shows: '1' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      // Mock task metrics (1 query)
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_tasks: '10', completed_tasks: '8', pending_tasks: '2', overdue_tasks: '0', priority_low: '2', priority_normal: '5', priority_high: '2', priority_urgent: '1', status_not_started: '1', status_in_progress: '1', status_waiting: '0', status_completed: '8', status_deferred: '0', status_cancelled: '0' }],
      } as any);

      const result = await analyticsService.getAccountAnalytics(mockAccountId);

      expect(result).toMatchObject({
        account_id: mockAccountId,
        account_name: 'Test Organization',
        account_type: 'organization',
        category: 'corporate',
        contact_count: 5,
        primary_contact: {
          contact_id: 'contact-1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        engagement_score: expect.any(Number),
        engagement_level: expect.stringMatching(/high|medium|low|inactive/),
      });

      expect(result.donation_metrics).toBeDefined();
      expect(result.event_metrics).toBeDefined();
      expect(result.task_metrics).toBeDefined();
    });

    it('should throw error if account not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        analyticsService.getAccountAnalytics('nonexistent-account')
      ).rejects.toThrow('Account not found');
    });
  });
});
