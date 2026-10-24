import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedReport } from '../../../../types/savedReport';
import useReportBuilderController from '../useReportBuilderController';

const {
  fetchAvailableFieldsMock,
  fetchSavedReportByIdMock,
  generateReportMock,
  listExportJobsMock,
} = vi.hoisted(() => ({
  fetchAvailableFieldsMock: vi.fn(),
  fetchSavedReportByIdMock: vi.fn(),
  generateReportMock: vi.fn(),
  listExportJobsMock: vi.fn(),
}));

vi.mock('../../api/reportsApiClient', () => ({
  reportsApiClient: {
    fetchAvailableFields: fetchAvailableFieldsMock,
    listExportJobs: listExportJobsMock,
    createExportJob: vi.fn(),
    downloadExportJob: vi.fn(),
    fetchWorkflowCoverageReport: vi.fn(),
    generateReport: generateReportMock,
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

  it('manages progressive execution stages and supports cancellation during report generation', async () => {
    let resolveQuery: (value: unknown) => void = () => {};
    const queryPromise = new Promise((resolve) => {
      resolveQuery = resolve;
    });
    generateReportMock.mockReturnValue(queryPromise);

    const { result } = renderHook(() => useReportBuilderController(), { wrapper });

    await waitFor(() => expect(result.current.currentSavedReport?.id).toBe('report-1'));

    // Trigger report generation
    let generatePromise: Promise<void> | undefined;
    act(() => {
      generatePromise = result.current.handleGenerateReport();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.generationStage).toBe('compiling');

    // Cancel the ongoing report generation
    act(() => {
      result.current.handleCancelGenerateReport();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.generationStage).toBe('idle');

    // Resolve the promise in background, verify currentReport is not set
    await act(async () => {
      resolveQuery({
        definition: { name: 'Contacts', entity: 'contacts' },
        data: [{ email: 'cancelled@example.org' }],
        total_count: 1,
        generated_at: '2026-03-15T12:00:00.000Z',
      });
      await generatePromise;
    });

    expect(result.current.currentReport).toBeNull();
  });
});
