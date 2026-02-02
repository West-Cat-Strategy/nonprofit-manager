import { VolunteerService } from '../../services/volunteerService';
import { Pool } from 'pg';
import { BackgroundCheckStatus, AvailabilityStatus } from '../../types/volunteer';

// Mock the logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('VolunteerService', () => {
  let volunteerService: VolunteerService;
  let mockPool: jest.Mocked<Pool>;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    } as unknown as jest.Mocked<Pool>;
    volunteerService = new VolunteerService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getVolunteers', () => {
    it('should return paginated volunteers with default pagination', async () => {
      const mockVolunteers = [
        { id: '1', first_name: 'John', last_name: 'Doe', skills: ['Teaching'] },
        { id: '2', first_name: 'Jane', last_name: 'Smith', skills: ['Fundraising'] },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockVolunteers });

      const result = await volunteerService.getVolunteers();

      expect(result.data).toEqual(mockVolunteers);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should apply search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: '1', first_name: 'John' }] });

      await volunteerService.getVolunteers({ search: 'John' });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('%John%');
    });

    it('should apply skills filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: '1', skills: ['Teaching', 'Mentoring'] }] });

      await volunteerService.getVolunteers({ skills: ['Teaching', 'Mentoring'] });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContainEqual(['Teaching', 'Mentoring']);
    });

    it('should apply background_check_status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: '1', background_check_status: 'approved' }] });

      await volunteerService.getVolunteers({ background_check_status: BackgroundCheckStatus.APPROVED });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('approved');
    });

    it('should handle custom pagination', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await volunteerService.getVolunteers({}, { page: 5, limit: 10 });

      expect(result.pagination.page).toBe(5);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total_pages).toBe(10);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(volunteerService.getVolunteers()).rejects.toThrow('Failed to retrieve volunteers');
    });
  });

  describe('getVolunteerById', () => {
    it('should return volunteer when found', async () => {
      const mockVolunteer = {
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
        skills: ['Teaching', 'Coaching'],
        volunteer_status: 'active',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockVolunteer] });

      const result = await volunteerService.getVolunteerById('123');

      expect(result).toEqual(mockVolunteer);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['123']);
    });

    it('should return null when volunteer not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await volunteerService.getVolunteerById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(volunteerService.getVolunteerById('123')).rejects.toThrow('Failed to retrieve volunteer');
    });
  });

  describe('createVolunteer', () => {
    it('should create volunteer when contact exists', async () => {
      const mockCreatedVolunteer = {
        id: 'new-uuid',
        contact_id: 'contact-123',
        skills: ['Teaching'],
        volunteer_status: 'active',
      };

      // Contact check
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'contact-123' }] });
      // INSERT
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedVolunteer] });

      const result = await volunteerService.createVolunteer(
        { contact_id: 'contact-123', skills: ['Teaching'] },
        'user-123'
      );

      expect(result).toEqual(mockCreatedVolunteer);
    });

    it('should throw error when contact not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        volunteerService.createVolunteer({ contact_id: 'nonexistent' }, 'user-123')
      ).rejects.toThrow('Failed to create volunteer');
    });

    it('should create volunteer with background check info', async () => {
      const mockCreatedVolunteer = {
        id: 'new-uuid',
        contact_id: 'contact-123',
        background_check_status: 'approved',
        background_check_date: '2024-01-15',
      };

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'contact-123' }] });
      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedVolunteer] });

      const result = await volunteerService.createVolunteer(
        {
          contact_id: 'contact-123',
          background_check_status: BackgroundCheckStatus.APPROVED,
          background_check_date: new Date('2024-01-15'),
        },
        'user-123'
      );

      expect(result.background_check_status).toBe('approved');
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'contact-123' }] });
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        volunteerService.createVolunteer({ contact_id: 'contact-123' }, 'user-123')
      ).rejects.toThrow('Failed to create volunteer');
    });
  });

  describe('updateVolunteer', () => {
    it('should update volunteer successfully', async () => {
      const mockUpdatedVolunteer = {
        id: '123',
        skills: ['Teaching', 'Mentoring'],
        availability_status: 'limited',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedVolunteer] });

      const result = await volunteerService.updateVolunteer(
        '123',
        { skills: ['Teaching', 'Mentoring'], availability_status: AvailabilityStatus.LIMITED },
        'user-123'
      );

      expect(result).toEqual(mockUpdatedVolunteer);
    });

    it('should return null when volunteer not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await volunteerService.updateVolunteer('nonexistent', { skills: ['Test'] }, 'user-123');

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      await expect(volunteerService.updateVolunteer('123', {}, 'user-123')).rejects.toThrow('Failed to update volunteer');
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        volunteerService.updateVolunteer('123', { skills: ['Test'] }, 'user-123')
      ).rejects.toThrow('Failed to update volunteer');
    });
  });

  describe('deleteVolunteer', () => {
    it('should soft delete volunteer successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: '123' }] });

      const result = await volunteerService.deleteVolunteer('123', 'user-123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("volunteer_status = 'inactive'"),
        ['user-123', '123']
      );
    });

    it('should return false when volunteer not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await volunteerService.deleteVolunteer('nonexistent', 'user-123');

      expect(result).toBe(false);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(volunteerService.deleteVolunteer('123', 'user-123')).rejects.toThrow('Failed to delete volunteer');
    });
  });

  describe('findVolunteersBySkills', () => {
    it('should find volunteers matching skills', async () => {
      const mockVolunteers = [
        { id: '1', skills: ['Teaching', 'Mentoring'], matching_skills_count: 2 },
        { id: '2', skills: ['Teaching'], matching_skills_count: 1 },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockVolunteers });

      const result = await volunteerService.findVolunteersBySkills(['Teaching', 'Mentoring']);

      expect(result).toEqual(mockVolunteers);
      expect((result[0] as unknown as { matching_skills_count: number }).matching_skills_count).toBe(2);
    });

    it('should return empty array when no matches', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await volunteerService.findVolunteersBySkills(['Rare Skill']);

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(volunteerService.findVolunteersBySkills(['Teaching'])).rejects.toThrow('Failed to find volunteers by skills');
    });
  });

  describe('getVolunteerAssignments', () => {
    it('should return assignments for a volunteer', async () => {
      const mockAssignments = [
        { assignment_id: '1', volunteer_id: '123', event_name: 'Summer Gala' },
        { assignment_id: '2', volunteer_id: '123', task_name: 'Setup' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockAssignments });

      const result = await volunteerService.getVolunteerAssignments({ volunteer_id: '123' });

      expect(result).toEqual(mockAssignments);
    });

    it('should filter by event_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ assignment_id: '1', event_id: 'event-123' }] });

      await volunteerService.getVolunteerAssignments({ event_id: 'event-123' });

      const call = mockQuery.mock.calls[0];
      expect(call[1]).toContain('event-123');
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ assignment_id: '1', status: 'completed' }] });

      await volunteerService.getVolunteerAssignments({ status: 'completed' });

      const call = mockQuery.mock.calls[0];
      expect(call[1]).toContain('completed');
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(volunteerService.getVolunteerAssignments({})).rejects.toThrow('Failed to retrieve volunteer assignments');
    });
  });

  describe('createAssignment', () => {
    it('should create assignment successfully', async () => {
      const mockCreatedAssignment = {
        assignment_id: 'new-uuid',
        volunteer_id: 'vol-123',
        event_id: 'event-123',
        assignment_type: 'event',
        start_time: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedAssignment] });

      const result = await volunteerService.createAssignment(
        {
          volunteer_id: 'vol-123',
          event_id: 'event-123',
          assignment_type: 'event',
          start_time: new Date(),
        },
        'user-123'
      );

      expect(result).toEqual(mockCreatedAssignment);
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        volunteerService.createAssignment(
          { volunteer_id: 'vol-123', assignment_type: 'event', start_time: new Date() },
          'user-123'
        )
      ).rejects.toThrow('Failed to create assignment');
    });
  });

  describe('updateAssignment', () => {
    it('should update assignment successfully', async () => {
      const mockUpdatedAssignment = {
        assignment_id: '123',
        status: 'completed',
        hours_logged: 4,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedAssignment] });

      const result = await volunteerService.updateAssignment(
        '123',
        { status: 'completed' },
        'user-123'
      );

      expect(result).toEqual(mockUpdatedAssignment);
    });

    it('should update volunteer hours when hours_logged is provided', async () => {
      const mockUpdatedAssignment = {
        assignment_id: '123',
        hours_logged: 4,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedAssignment] });
      mockQuery.mockResolvedValueOnce({ rows: [] }); // hours update

      await volunteerService.updateAssignment(
        '123',
        { hours_logged: 4 },
        'user-123'
      );

      expect(mockQuery).toHaveBeenCalledTimes(2);
      const hoursCall = mockQuery.mock.calls[1];
      expect(hoursCall[0]).toContain('hours_contributed');
    });

    it('should return null when assignment not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await volunteerService.updateAssignment('nonexistent', { status: 'completed' }, 'user-123');

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      await expect(volunteerService.updateAssignment('123', {}, 'user-123')).rejects.toThrow('Failed to update assignment');
    });
  });
});
