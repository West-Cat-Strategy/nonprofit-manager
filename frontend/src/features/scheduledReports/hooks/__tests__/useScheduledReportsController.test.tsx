import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduledReport } from '../../../../types/scheduledReport';
import useScheduledReportsController from '../useScheduledReportsController';

const { fetchSavedReportsMock, fetchScheduledReportsMock } = vi.hoisted(() => ({
  fetchSavedReportsMock: vi.fn(),
  fetchScheduledReportsMock: vi.fn(),
}));

vi.mock('../../api/scheduledReportsApiClient', () => ({
  scheduledReportsApiClient: {
    createScheduledReport: vi.fn(),
    deleteScheduledReport: vi.fn(),
    fetchScheduledReportRuns: vi.fn(),
    fetchScheduledReports: fetchScheduledReportsMock,
    runScheduledReportNow: vi.fn(),
    toggleScheduledReport: vi.fn(),
    updateScheduledReport: vi.fn(),
  },
}));

vi.mock('../../../savedReports/api/savedReportsApiClient', () => ({
  savedReportsApiClient: {
    createSavedReport: vi.fn(),
    fetchSavedReportById: vi.fn(),
    fetchSavedReports: fetchSavedReportsMock,
  },
}));

const makeScheduledReport = (overrides: Partial<ScheduledReport> = {}): ScheduledReport => ({
  id: 'schedule-1',
  organization_id: 'org-1',
  saved_report_id: 'saved-report-1',
  name: 'Weekly Donor Summary',
  recipients: ['ops@example.org'],
  format: 'csv',
  frequency: 'weekly',
  timezone: 'UTC',
  hour: 9,
  minute: 0,
  day_of_week: 1,
  day_of_month: null,
  is_active: true,
  next_run_at: '2026-03-05T17:00:00.000Z',
  last_run_at: null,
  processing_started_at: null,
  last_error: null,
  created_at: '2026-03-01T17:00:00.000Z',
  updated_at: '2026-03-01T17:00:00.000Z',
  ...overrides,
});

describe('useScheduledReportsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchScheduledReportsMock.mockResolvedValue([]);
    fetchSavedReportsMock.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 100, total: 0, total_pages: 0 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads scheduled and saved reports once without render-driven refetches', async () => {
    const { result } = renderHook(() => useScheduledReportsController());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchScheduledReportsMock).toHaveBeenCalledTimes(1);
    expect(fetchSavedReportsMock).toHaveBeenCalledTimes(1);
  });

  it('filters scheduled reports that need attention from existing health fields', async () => {
    fetchScheduledReportsMock.mockResolvedValue([
      makeScheduledReport({
        id: 'healthy-schedule',
        name: 'Healthy Schedule',
        next_run_at: '2026-06-05T17:00:00.000Z',
      }),
      makeScheduledReport({
        id: 'error-schedule',
        name: 'Error Schedule',
        last_error: 'SMTP delivery failed',
      }),
    ]);

    const { result } = renderHook(() => useScheduledReportsController());

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setStatusFilter('attention');
    });

    expect(result.current.sortedReports).toHaveLength(1);
    expect(result.current.sortedReports[0].id).toBe('error-schedule');
  });
});
