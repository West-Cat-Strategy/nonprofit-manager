import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedReport } from '../../../../../types/savedReport';
import useReportBuilderController from '../useReportBuilderController';

const {
  fetchAvailableFieldsMock,
  fetchSavedReportByIdMock,
  listExportJobsMock,
} = vi.hoisted(() => ({
  fetchAvailableFieldsMock: vi.fn(),
  fetchSavedReportByIdMock: vi.fn(),
  listExportJobsMock: vi.fn(),
}));

vi.mock('../../api/reportsApiClient', () => ({
  reportsApiClient: {
    fetchAvailableFields: fetchAvailableFieldsMock,
    listExportJobs: listExportJobsMock,
    createExportJob: vi.fn(),
    downloadExportJob: vi.fn(),
    fetchWorkflowCoverageReport: vi.fn(),
    generateReport: vi.fn(),
    getExportJob: vi.fn(),
    instantiateTemplate: vi.fn(),
    listTemplates: vi.fn(),
  },
}));

vi.mock('../../../savedReports/api/savedReportsApiClient', () => ({
  savedReportsApiClient: {
    fetchSavedReportById: fetchSavedReportByIdMock,
    fetchSavedReports: vi.fn(),
    createSavedReport: vi.fn(),
  },
}));

const savedReport: SavedReport = {
  id: 'report-1',
  name: 'Saved Contacts',
  description: 'Contacts snapshot',
  entity: 'contacts',
  report_definition: {
    name: 'Saved Contacts',
    entity: 'contacts',
    fields: ['email'],
    filters: [],
    sort: [],
    groupBy: [],
    aggregations: [],
    limit: 25,
  },
  created_at: '2026-03-15T12:00:00.000Z',
  updated_at: '2026-03-15T12:00:00.000Z',
  is_public: false,
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter initialEntries={['/reports/builder?load=report-1']}>{children}</MemoryRouter>
);

describe('useReportBuilderController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAvailableFieldsMock.mockResolvedValue({
      entity: 'contacts',
      fields: [{ field: 'email', label: 'Email', type: 'string' }],
    });
    fetchSavedReportByIdMock.mockResolvedValue(savedReport);
    listExportJobsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads saved reports and export jobs once without render-driven refetches', async () => {
    const { result } = renderHook(() => useReportBuilderController(), { wrapper });

    await waitFor(() => expect(result.current.currentSavedReport?.id).toBe('report-1'));

    expect(fetchSavedReportByIdMock).toHaveBeenCalledTimes(1);
    expect(fetchAvailableFieldsMock).toHaveBeenCalledTimes(1);
    expect(listExportJobsMock).toHaveBeenCalledTimes(1);
  });
});
