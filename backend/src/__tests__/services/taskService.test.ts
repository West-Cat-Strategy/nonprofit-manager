// Mock the database pool before importing the service
const mockQuery = jest.fn();
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    query: mockQuery,
  },
}));

import { taskService } from '@services/taskService';
import { TaskStatus, TaskPriority, RelatedToType } from '../../types/task';

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    it('should return paginated tasks with default pagination', async () => {
      const mockTasks = [
        { id: '1', subject: 'Task 1', status: 'not_started', priority: 'high', total_count: 2 },
        { id: '2', subject: 'Task 2', status: 'in_progress', priority: 'normal', total_count: 2 },
      ];

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
          priority_low: '2',
          priority_normal: '5',
          priority_high: '2',
          priority_urgent: '1',
          overdue: '2',
          due_today: '1',
          due_this_week: '3',
        }],
      });

      const result = await taskService.getTasks({});

      expect(result.tasks).toEqual(
        mockTasks.map(({ total_count: _totalCount, ...task }) => task)
      );
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should apply search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: '1', subject: 'Important Task', total_count: 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            total: '1', not_started: '1', in_progress: '0', waiting: '0',
            completed: '0', deferred: '0', cancelled: '0', overdue: '0',
            due_today: '0', due_this_week: '1', priority_low: '0',
            priority_normal: '0', priority_high: '1', priority_urgent: '0',
          }],
        });

      await taskService.getTasks({ search: 'Important' });

      const dataCall = mockQuery.mock.calls[0];
      expect(dataCall[0]).toContain(
        "coalesce(nullif(t.subject, ''), '') || CASE WHEN nullif(t.description, '') IS NOT NULL THEN ' ' || t.description ELSE '' END"
      );
      expect(dataCall[1]).toContain('%Important%');
    });

    it('should apply status filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: '1', status: 'completed', total_count: 1 }] })
        .mockResolvedValueOnce({
          rows: [{
            total: '1', not_started: '0', in_progress: '0', waiting: '0',
            completed: '1', deferred: '0', cancelled: '0', overdue: '0',
            due_today: '0', due_this_week: '0', priority_low: '0',
            priority_normal: '1', priority_high: '0', priority_urgent: '0',
          }],
        });

      await taskService.getTasks({ status: TaskStatus.COMPLETED });

      const dataCall = mockQuery.mock.calls[0];
      expect(dataCall[1]).toContain('completed');
    });

    it('should apply priority filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: '1', priority: 'high', total_count: 2 }] })
        .mockResolvedValueOnce({
          rows: [{
            total: '2', not_started: '1', in_progress: '1', waiting: '0',
            completed: '0', deferred: '0', cancelled: '0', overdue: '0',
            due_today: '1', due_this_week: '2', priority_low: '0',
            priority_normal: '0', priority_high: '2', priority_urgent: '0',
          }],
        });

      await taskService.getTasks({ priority: TaskPriority.HIGH });

      const dataCall = mockQuery.mock.calls[0];
      expect(dataCall[1]).toContain('high');
    });

    it('should apply overdue filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: '1', due_date: '2024-01-01', total_count: 3 }] })
        .mockResolvedValueOnce({
          rows: [{
            total: '3', not_started: '2', in_progress: '1', waiting: '0',
            completed: '0', deferred: '0', cancelled: '0', overdue: '3',
            due_today: '0', due_this_week: '0', priority_low: '0',
            priority_normal: '0', priority_high: '3', priority_urgent: '0',
          }],
        });

      await taskService.getTasks({ overdue: true });

      const dataCall = mockQuery.mock.calls[0];
      expect(dataCall[0]).toContain('due_date < CURRENT_TIMESTAMP');
    });
  });

  describe('getTaskSummary', () => {
    it('should execute a single summary query without list/count queries', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total: '5',
            not_started: '1',
            in_progress: '2',
            waiting: '0',
            completed: '1',
            deferred: '1',
            cancelled: '0',
            priority_low: '1',
            priority_normal: '2',
            priority_high: '1',
            priority_urgent: '1',
            overdue: '2',
            due_today: '1',
            due_this_week: '3',
          },
        ],
      });

      const summary = await taskService.getTaskSummary({ assigned_to: 'user-123' });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM tasks t'),
        ['user-123']
      );
      expect(summary.total).toBe(5);
      expect(summary.by_status.not_started).toBe(1);
      expect(summary.by_priority.urgent).toBe(1);
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
