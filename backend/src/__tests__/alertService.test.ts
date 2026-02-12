/**
 * Alert Service Tests
 * Unit tests for alert configuration service
 */

import { Pool } from 'pg';
import { AlertService } from '@services';
import type { CreateAlertDTO } from '../types/alert';

jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

describe('AlertService', () => {
  let alertService: AlertService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = new Pool() as jest.Mocked<Pool>;
    alertService = new AlertService(mockPool);
    jest.clearAllMocks();
  });

  describe('getUserAlerts', () => {
    it('should return all alerts for a user', async () => {
      const mockAlerts = [
        {
          id: '123',
          user_id: 'user-1',
          name: 'Low Donations Alert',
          metric_type: 'donations',
          condition: 'drops_below',
          threshold: 10,
          enabled: true,
        },
        {
          id: '456',
          user_id: 'user-1',
          name: 'High Volunteer Hours',
          metric_type: 'volunteer_hours',
          condition: 'exceeds',
          threshold: 100,
          enabled: true,
        },
      ];

      mockPool.query.mockResolvedValue({ rows: mockAlerts } as any);

      const result = await alertService.getUserAlerts('user-1');

      expect(result).toEqual(mockAlerts);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM alert_configs'),
        ['user-1']
      );
    });
  });

  describe('createAlert', () => {
    it('should create a new alert configuration', async () => {
      const createData: CreateAlertDTO = {
        user_id: 'user-1',
        name: 'Test Alert',
        metric_type: 'donations',
        condition: 'exceeds',
        threshold: 50,
        frequency: 'daily',
        channels: ['email', 'in_app'],
        severity: 'medium',
        enabled: true,
      };

      const mockCreated = {
        id: '789',
        ...createData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockCreated] } as any);

      const result = await alertService.createAlert(createData);

      expect(result).toEqual(mockCreated);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO alert_configs'),
        expect.arrayContaining([
          'user-1',
          'Test Alert',
          expect.anything(), // description
          'donations',
          'exceeds',
          50,
        ])
      );
    });
  });

  describe('testAlert', () => {
    it('should test exceeds condition', async () => {
      const testData: CreateAlertDTO = {
        user_id: 'user-1',
        name: 'Test',
        metric_type: 'donations',
        condition: 'exceeds',
        threshold: 50,
        frequency: 'daily',
        channels: ['email'],
        severity: 'medium',
        enabled: true,
      };

      // Mock current value query
      mockPool.query.mockResolvedValue({ rows: [{ value: '75' }] } as any);

      const result = await alertService.testAlert(testData);

      expect(result.would_trigger).toBe(true);
      expect(result.current_value).toBe(75);
      expect(result.threshold_value).toBe(50);
      expect(result.message).toContain('exceeds threshold');
    });

    it('should test drops_below condition', async () => {
      const testData: CreateAlertDTO = {
        user_id: 'user-1',
        name: 'Test',
        metric_type: 'donations',
        condition: 'drops_below',
        threshold: 50,
        frequency: 'daily',
        channels: ['email'],
        severity: 'high',
        enabled: true,
      };

      // Mock current value query
      mockPool.query.mockResolvedValue({ rows: [{ value: '25' }] } as any);

      const result = await alertService.testAlert(testData);

      expect(result.would_trigger).toBe(true);
      expect(result.current_value).toBe(25);
      expect(result.message).toContain('dropped below');
    });

    it('should not trigger when condition not met', async () => {
      const testData: CreateAlertDTO = {
        user_id: 'user-1',
        name: 'Test',
        metric_type: 'donations',
        condition: 'exceeds',
        threshold: 100,
        frequency: 'daily',
        channels: ['email'],
        severity: 'medium',
        enabled: true,
      };

      // Mock current value query
      mockPool.query.mockResolvedValue({ rows: [{ value: '50' }] } as any);

      const result = await alertService.testAlert(testData);

      expect(result.would_trigger).toBe(false);
      expect(result.current_value).toBe(50);
    });
  });

  describe('toggleAlert', () => {
    it('should toggle alert enabled status', async () => {
      const mockToggled = {
        id: '123',
        user_id: 'user-1',
        name: 'Test Alert',
        enabled: false, // Was true, now false
      };

      mockPool.query.mockResolvedValue({ rows: [mockToggled] } as any);

      const result = await alertService.toggleAlert('123', 'user-1');

      expect(result).toEqual(mockToggled);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('enabled = NOT enabled'),
        ['123', 'user-1']
      );
    });
  });

  describe('getAlertStats', () => {
    it('should return comprehensive alert statistics', async () => {
      // Mock multiple queries for stats
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any) // total
        .mockResolvedValueOnce({ rows: [{ active: '3' }] } as any) // active
        .mockResolvedValueOnce({ rows: [{ triggered_today: '2' }] } as any) // today
        .mockResolvedValueOnce({ rows: [{ triggered_week: '8' }] } as any) // week
        .mockResolvedValueOnce({ rows: [{ triggered_month: '15' }] } as any) // month
        .mockResolvedValueOnce({
          rows: [
            { severity: 'low', count: '2' },
            { severity: 'medium', count: '8' },
            { severity: 'high', count: '4' },
            { severity: 'critical', count: '1' },
          ],
        } as any) // by severity
        .mockResolvedValueOnce({
          rows: [
            { metric_type: 'donations', count: '5' },
            { metric_type: 'volunteer_hours', count: '7' },
            { metric_type: 'event_attendance', count: '3' },
          ],
        } as any); // by metric

      const result = await alertService.getAlertStats('user-1');

      expect(result).toEqual({
        total_alerts: 5,
        active_alerts: 3,
        triggered_today: 2,
        triggered_this_week: 8,
        triggered_this_month: 15,
        by_severity: {
          low: 2,
          medium: 8,
          high: 4,
          critical: 1,
        },
        by_metric: {
          donations: 5,
          volunteer_hours: 7,
          event_attendance: 3,
        },
      });
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert instance', async () => {
      const mockAcknowledged = {
        id: '123',
        alert_config_id: '456',
        status: 'triggered',
        acknowledged_by: 'user-1',
        acknowledged_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockAcknowledged] } as any);

      const result = await alertService.acknowledgeAlert('123', 'user-1');

      expect(result).toEqual(mockAcknowledged);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('acknowledged_by = $1'),
        ['user-1', '123']
      );
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert instance', async () => {
      const mockResolved = {
        id: '123',
        status: 'resolved',
        resolved_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockResolved] } as any);

      const result = await alertService.resolveAlert('123');

      expect(result).toEqual(mockResolved);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'resolved'"),
        ['123']
      );
    });
  });

  describe('deleteAlert', () => {
    it('should delete an alert configuration', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 } as any);

      const result = await alertService.deleteAlert('123', 'user-1');

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM alert_configs'),
        ['123', 'user-1']
      );
    });

    it('should return false if alert not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 } as any);

      const result = await alertService.deleteAlert('999', 'user-1');

      expect(result).toBe(false);
    });
  });
});
