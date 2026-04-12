import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useWorkflowCoverageReportController from '../useWorkflowCoverageReportController';

const { fetchWorkflowCoverageReportMock } = vi.hoisted(() => ({
  fetchWorkflowCoverageReportMock: vi.fn(),
}));

vi.mock('../../api/reportsApiClient', () => ({
  reportsApiClient: {
    fetchAvailableFields: vi.fn(),
    fetchWorkflowCoverageReport: fetchWorkflowCoverageReportMock,
    generateReport: vi.fn(),
    getExportJob: vi.fn(),
    listExportJobs: vi.fn(),
    listTemplates: vi.fn(),
    createExportJob: vi.fn(),
    downloadExportJob: vi.fn(),
    instantiateTemplate: vi.fn(),
  },
}));

describe('useWorkflowCoverageReportController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchWorkflowCoverageReportMock.mockResolvedValue({
      items: [],
      summary: {
        casesWithGaps: 0,
        missingConversationResolutionCount: 0,
        missingAppointmentNoteCount: 0,
        missingAppointmentOutcomeCount: 0,
        missingFollowUpNoteCount: 0,
        missingFollowUpOutcomeCount: 0,
        missingReminderOfferCount: 0,
        missingAttendanceLinkageCount: 0,
        missingCaseStatusOutcomeCount: 0,
        totalGaps: 0,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads the workflow coverage report once without render-driven refetches', async () => {
    const { result } = renderHook(() => useWorkflowCoverageReportController());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchWorkflowCoverageReportMock).toHaveBeenCalledTimes(1);
  });
});
