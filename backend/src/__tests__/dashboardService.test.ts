/**
 * Dashboard Service Tests
 * Unit tests for dashboard configuration service
 */

import { Pool } from 'pg';
import { DashboardService } from '../services/dashboardService';
import type { CreateDashboardDTO } from '../types/dashboard';

// Mock the pool
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

describe('DashboardService', () => {
  let dashboardService: DashboardService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    dashboardService = new DashboardService(mockPool);
    mockPool.query.mockReset();
    mockPool.connect.mockReset();
  });

  describe('getUserDashboards', () => {
    it('should return all dashboards for a user', async () => {
      const mockDashboards = [
        {
          id: '123',
          user_id: 'user-1',
          name: 'Default Dashboard',
          is_default: true,
          widgets: [],
          layout: [],
        },
        {
          id: '456',
          user_id: 'user-1',
          name: 'Custom Dashboard',
          is_default: false,
          widgets: [],
          layout: [],
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockDashboards } as any);

      const result = await dashboardService.getUserDashboards('user-1');

      expect(result).toEqual(mockDashboards);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['user-1']
      );
    });

    it('should return empty array if user has no dashboards', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await dashboardService.getUserDashboards('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getDashboard', () => {
    it('should return a specific dashboard', async () => {
      const mockDashboard = {
        id: '123',
        user_id: 'user-1',
        name: 'Test Dashboard',
        is_default: false,
        widgets: [],
        layout: [],
      };

      mockPool.query.mockResolvedValue({ rows: [mockDashboard] } as any);

      const result = await dashboardService.getDashboard('123', 'user-1');

      expect(result).toEqual(mockDashboard);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND user_id = $2'),
        ['123', 'user-1']
      );
    });

    it('should return null if dashboard not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await dashboardService.getDashboard('999', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('getDefaultDashboard', () => {
    it('should return the default dashboard for a user', async () => {
      const mockDashboard = {
        id: '123',
        user_id: 'user-1',
        name: 'Default Dashboard',
        is_default: true,
        widgets: [],
        layout: [],
      };

      mockPool.query.mockResolvedValue({ rows: [mockDashboard] } as any);

      const result = await dashboardService.getDefaultDashboard('user-1');

      expect(result).toEqual(mockDashboard);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_default = true'),
        ['user-1']
      );
    });

    it('should return null if no default dashboard exists', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await dashboardService.getDefaultDashboard('user-1');

      expect(result).toBeNull();
    });
  });

  describe('createDashboard', () => {
    it('should create a new dashboard', async () => {
      const createData: CreateDashboardDTO = {
        user_id: 'user-1',
        name: 'New Dashboard',
        is_default: false,
        widgets: [],
        layout: [],
      };

      const mockCreatedDashboard = {
        id: '789',
        ...createData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockCreatedDashboard] }) // INSERT
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      const result = await dashboardService.createDashboard(createData);

      expect(result).toEqual(mockCreatedDashboard);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should unset other defaults when creating default dashboard', async () => {
      const createData: CreateDashboardDTO = {
        user_id: 'user-1',
        name: 'New Default',
        is_default: true,
        widgets: [],
        layout: [],
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // UPDATE other defaults
          .mockResolvedValueOnce({ rows: [{ id: '123', ...createData }] }) // INSERT
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      await dashboardService.createDashboard(createData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE dashboard_configs SET is_default = false'),
        ['user-1']
      );
    });

    it('should rollback on error', async () => {
      const createData: CreateDashboardDTO = {
        user_id: 'user-1',
        name: 'Failed Dashboard',
        is_default: false,
        widgets: [],
        layout: [],
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockRejectedValueOnce(new Error('Database error')), // INSERT fails
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      await expect(dashboardService.createDashboard(createData)).rejects.toThrow('Database error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateDashboard', () => {
    it('should update dashboard name', async () => {
      const updateData = { name: 'Updated Name' };
      const mockUpdated = {
        id: '123',
        user_id: 'user-1',
        name: 'Updated Name',
        is_default: false,
        widgets: [],
        layout: [],
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [mockUpdated] }) // UPDATE
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      const result = await dashboardService.updateDashboard('123', 'user-1', updateData);

      expect(result).toEqual(mockUpdated);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('name = $1'),
        expect.arrayContaining(['Updated Name', '123', 'user-1'])
      );
    });

    it('should return null if dashboard not found', async () => {
      const updateData = { name: 'Updated Name' };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [] }) // BEGIN
          .mockResolvedValueOnce({ rows: [] }) // UPDATE returns nothing
          .mockResolvedValueOnce({ rows: [] }), // COMMIT
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      const result = await dashboardService.updateDashboard('999', 'user-1', updateData);

      expect(result).toBeNull();
    });
  });

  describe('deleteDashboard', () => {
    it('should delete a dashboard', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 } as any);

      const result = await dashboardService.deleteDashboard('123', 'user-1');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dashboard_configs'),
        ['123', 'user-1']
      );
    });

    it('should return false if dashboard not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 } as any);

      const result = await dashboardService.deleteDashboard('999', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('createDefaultDashboard', () => {
    it('should create a default dashboard with predefined widgets', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            user_id: 'user-1',
            name: 'Default Dashboard',
            is_default: true,
            widgets: [],
            layout: [],
            breakpoints: {},
            cols: {},
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      } as any);

      const result = await dashboardService.createDefaultDashboard('user-1');

      expect(result.name).toBe('Default Dashboard');
      expect(result.is_default).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining(['user-1', 'Default Dashboard'])
      );
    });
  });
});
