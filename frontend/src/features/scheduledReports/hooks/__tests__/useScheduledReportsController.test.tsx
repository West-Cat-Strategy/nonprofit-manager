import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useScheduledReportsController from '../useScheduledReportsController';

const {
  fetchSavedReportsMock,
  fetchScheduledReportsMock,
} = vi.hoisted(() => ({
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
});
