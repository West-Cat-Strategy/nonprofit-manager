// Mock the database pool before importing the service
const mockQuery = jest.fn();
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
  },
}));

import { taskService } from '@services';
import { TaskStatus, TaskPriority, RelatedToType } from '../../types/task';

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should return paginated tasks with default pagination', async () => {
      const mockTasks = [
        { id: '1', subject: 'Task 1', status: 'not_started', priority: 'high' },
        { id: '2', subject: 'Task 2', status: 'in_progress', priority: 'medium' },
      ];

      // Count query
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '2' }] });
      // Tasks query
      mockQuery.mockResolvedValueOnce({ rows: mockTasks });
      // Summary query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          total: '10',
          not_started: '3',
          in_progress: '2',
          waiting: '1',
          completed: '3',
          deferred: '1',
          cancelled: '0',
          overdue: '2',
          due_today: '1',
          due_this_week: '3',
          high_priority: '2',
          medium_priority: '5',
          low_priority: '2',
          none_priority: '1',
        }],
      });

      const result = await taskService.getTasks({});

      expect(result.tasks).toEqual(mockTasks);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should apply search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: '1', subject: 'Important Task' }] })
        .mockResolvedValueOnce({
          rows: [{
            total: '1', not_started: '1', in_progress: '0', waiting: '0',
            completed: '0', deferred: '0', cancelled: '0', overdue: '0',
            due_today: '0', due_this_week: '1', high_priority: '1',
            medium_priority: '0', low_priority: '0', none_priority: '0',
          }],
        });

      await taskService.getTasks({ search: 'Important' });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('%Important%');
    });

    it('should apply status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ id: '1', status: 'completed' }] })
        .mockResolvedValueOnce({
          rows: [{
            total: '1', not_started: '0', in_progress: '0', waiting: '0',
            completed: '1', deferred: '0', cancelled: '0', overdue: '0',
            due_today: '0', due_this_week: '0', high_priority: '0',
            medium_priority: '1', low_priority: '0', none_priority: '0',
          }],
        });

      await taskService.getTasks({ status: TaskStatus.COMPLETED });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('completed');
    });

    it('should apply priority filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [{ id: '1', priority: 'high' }] })
        .mockResolvedValueOnce({
          rows: [{
            total: '2', not_started: '1', in_progress: '1', waiting: '0',
            completed: '0', deferred: '0', cancelled: '0', overdue: '0',
            due_today: '1', due_this_week: '2', high_priority: '2',
            medium_priority: '0', low_priority: '0', none_priority: '0',
          }],
        });

      await taskService.getTasks({ priority: TaskPriority.HIGH });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[1]).toContain('high');
    });

    it('should apply overdue filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ id: '1', due_date: '2024-01-01' }] })
        .mockResolvedValueOnce({
          rows: [{
            total: '3', not_started: '2', in_progress: '1', waiting: '0',
            completed: '0', deferred: '0', cancelled: '0', overdue: '3',
            due_today: '0', due_this_week: '0', high_priority: '3',
            medium_priority: '0', low_priority: '0', none_priority: '0',
          }],
        });

      await taskService.getTasks({ overdue: true });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[0]).toContain('due_date < CURRENT_TIMESTAMP');
    });
  });

  describe('getTaskById', () => {
    it('should return task when found', async () => {
      const mockTask = {
        id: '123',
        subject: 'Test Task',
        status: 'in_progress',
        priority: 'high',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockTask] });

      const result = await taskService.getTaskById('123');

      expect(result).toEqual(mockTask);
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['123']);
    });

    it('should return null when task not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await taskService.getTaskById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createTask', () => {
    it('should create task with required fields', async () => {
      const mockCreatedTask = {
        id: 'new-uuid',
        subject: 'New Task',
        status: 'not_started',
        priority: 'medium',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedTask] });

      const result = await taskService.createTask(
        { subject: 'New Task' },
        'user-123'
      );

      expect(result).toEqual(mockCreatedTask);
    });

    it('should create task with all fields', async () => {
      const taskData = {
        subject: 'Full Task',
        description: 'Task description',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        due_date: '2024-06-15',
        assigned_to: 'user-456',
        related_to_type: RelatedToType.CONTACT,
        related_to_id: 'contact-123',
      };

      const mockCreatedTask = {
        id: 'new-uuid',
        ...taskData,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCreatedTask] });

      const result = await taskService.createTask(taskData, 'user-123');

      expect(result.subject).toBe('Full Task');
      expect(result.priority).toBe('high');
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const mockUpdatedTask = {
        id: '123',
        subject: 'Updated Task',
        status: 'in_progress',
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedTask] });

      const result = await taskService.updateTask(
        '123',
        { subject: 'Updated Task', status: TaskStatus.IN_PROGRESS },
        'user-123'
      );

      expect(result).toEqual(mockUpdatedTask);
    });

    it('should return null when task not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await taskService.updateTask('nonexistent', { subject: 'Test' }, 'user-123');

      expect(result).toBeNull();
    });

    it('should return task when no fields to update', async () => {
      const mockTask = { id: '123', subject: 'Test Task' };
      mockQuery.mockResolvedValueOnce({ rows: [mockTask] });

      const result = await taskService.updateTask('123', {}, 'user-123');

      expect(result).toEqual(mockTask);
    });
  });

  describe('completeTask', () => {
    it('should mark task as completed', async () => {
      const mockCompletedTask = {
        id: '123',
        status: 'completed',
        completed_date: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockCompletedTask] });

      const result = await taskService.completeTask('123', 'user-123');

      expect(result!.status).toBe('completed');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tasks'),
        expect.arrayContaining(['completed', 'user-123', '123'])
      );
    });

    it('should return null when task not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await taskService.completeTask('nonexistent', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await taskService.deleteTask('123');

      expect(result).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['123']);
    });

    it('should return false when task not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await taskService.deleteTask('nonexistent');

      expect(result).toBe(false);
    });
  });
});
