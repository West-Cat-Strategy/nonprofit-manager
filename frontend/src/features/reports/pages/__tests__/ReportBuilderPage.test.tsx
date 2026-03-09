import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type * as ReportsSliceModule from '../../state';
import type * as SavedReportsSliceModule from '../../../savedReports/state';
import type { ReportExportJob } from '../../../../types/report';
import { vi } from 'vitest';
import ReportBuilder from '../ReportBuilderPage';
import { renderWithProviders } from '../../../../test/testUtils';

const {
  dispatchMock,
  instantiateTemplateMock,
  downloadExportJobMock,
  triggerFileDownloadMock,
} = vi.hoisted(() => ({
  dispatchMock: vi.fn(() => Promise.resolve({ type: 'ok' })),
  instantiateTemplateMock: vi.fn(),
  downloadExportJobMock: vi.fn(),
  triggerFileDownloadMock: vi.fn(),
}));

const makeExportJob = (overrides: Partial<ReportExportJob> = {}): ReportExportJob => ({
  id: 'job-1',
  organizationId: 'org-1',
  savedReportId: null,
  scheduledReportId: null,
  requestedBy: 'user-1',
  source: 'manual',
  name: 'Contacts export',
  entity: 'contacts',
  format: 'csv',
  status: 'completed',
  definition: {
    name: 'Contacts export',
    entity: 'contacts',
    fields: ['email'],
  },
  filterHash: 'hash-1',
  idempotencyKey: 'key-1',
  rowsCount: 1,
  runtimeMs: 45,
  failureMessage: null,
  artifactPath: '/uploads/report-exports/job-1/contacts.csv',
  artifactContentType: 'text/csv',
  artifactFileName: 'contacts.csv',
  artifactSizeBytes: 128,
  artifactExpiresAt: null,
  retentionUntil: null,
  metadata: {},
  startedAt: '2026-03-07T12:00:00.000Z',
  completedAt: '2026-03-07T12:00:01.000Z',
  createdAt: '2026-03-07T12:00:00.000Z',
  updatedAt: '2026-03-07T12:00:01.000Z',
  ...overrides,
});

const mockState = {
  reports: {
    currentReport: null as null | {
      definition: {
        name: string;
        entity: 'contacts' | 'accounts';
        fields?: string[];
      };
      data: Record<string, unknown>[];
      total_count: number;
      generated_at: string;
    },
    availableFields: {
      accounts: [{ field: 'name', label: 'Name', type: 'string' }],
      contacts: [{ field: 'email', label: 'Email', type: 'string' }],
      donations: [],
      events: [],
      volunteers: [],
      tasks: [],
      cases: [],
      opportunities: [],
      expenses: [],
      grants: [],
      programs: [],
    },
    exportJobs: [] as ReportExportJob[],
    exportJobsLoading: false,
    activeExportJobId: null as string | null,
    loading: false,
    fieldsLoading: false,
    error: null as string | null,
    exportJobError: null as string | null,
  },
  savedReports: { currentSavedReport: null as null | {
    id: string;
    name: string;
    description?: string;
    entity: 'contacts' | 'accounts';
    report_definition: {
      name: string;
      entity: 'contacts' | 'accounts';
      fields?: string[];
      filters?: [];
      sort?: [];
      groupBy?: string[];
      aggregations?: [];
      limit?: number;
    };
  } },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../api/reportsApiClient', () => ({
  reportsApiClient: {
    instantiateTemplate: (templateId: string) => instantiateTemplateMock(templateId),
    downloadExportJob: (jobId: string, fallbackFilename: string) =>
      downloadExportJobMock(jobId, fallbackFilename),
  },
}));

vi.mock('../../../../services/fileDownload', () => ({
  triggerFileDownload: (file: unknown) => triggerFileDownloadMock(file),
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof ReportsSliceModule>(
    '../../state'
  );
  return {
    ...actual,
    default: (state = { currentReport: null, loading: false, availableFields: [] }) => state,
    generateReport: (payload: unknown) => ({ type: 'reports/generate', payload }),
    createReportExportJob: (payload: unknown) => ({ type: 'reports/createExportJob', payload }),
    fetchReportExportJob: (jobId: string) => ({ type: 'reports/fetchExportJob', payload: jobId }),
    fetchReportExportJobs: (payload: unknown) => ({ type: 'reports/fetchExportJobs', payload }),
  };
});

vi.mock('../../../savedReports/state', async () => {
  const actual = await vi.importActual<typeof SavedReportsSliceModule>(
    '../../../savedReports/state'
  );
  return {
    ...actual,
    default: (state = { currentSavedReport: null }) => state,
    createSavedReport: (payload: unknown) => ({ type: 'saved/create', payload }),
    fetchSavedReportById: (id: string) => ({ type: 'saved/fetchById', payload: id }),
  };
});

vi.mock('../../../../components/FieldSelector', () => ({ default: () => <div>Field Selector</div> }));
vi.mock('../../../../components/FilterBuilder', () => ({ default: () => <div>Filter Builder</div> }));
vi.mock('../../../../components/SortBuilder', () => ({ default: () => <div>Sort Builder</div> }));
vi.mock('../../../../components/ReportChart', () => ({ default: () => <div>Report Chart</div> }));
vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('ReportBuilder page', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    dispatchMock.mockReset();
    dispatchMock.mockImplementation(() => Promise.resolve({ type: 'ok' }));
    instantiateTemplateMock.mockReset();
    downloadExportJobMock.mockReset();
    triggerFileDownloadMock.mockReset();
    mockState.savedReports.currentSavedReport = null;
    mockState.reports.currentReport = null;
    mockState.reports.exportJobs = [];
    mockState.reports.exportJobsLoading = false;
    mockState.reports.activeExportJobId = null;
    mockState.reports.exportJobError = null;
  });

  it('renders report builder title', () => {
    renderWithProviders(<ReportBuilder />);
    expect(screen.getByRole('heading', { name: /report builder/i })).toBeInTheDocument();
  });

  it('shows opportunities entity and templates shortcut', () => {
    renderWithProviders(<ReportBuilder />);
    expect(screen.getByRole('button', { name: /opportunities/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kpi templates/i })).toBeInTheDocument();
  });

  it('requires fields before generating report', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />);
    await user.click(screen.getByRole('button', { name: /generate report/i }));
    expect(dispatchMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reports/generate' })
    );
  });

  it('dispatches saved report fetch when load query param is present', async () => {
    renderWithProviders(<ReportBuilder />, { route: '/reports/builder?load=saved-123' });
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'saved/fetchById', payload: 'saved-123' })
    );
  });

  it('loads template from query param and generates report from template fields', async () => {
    instantiateTemplateMock.mockResolvedValue({
      name: 'Accounts Template',
      entity: 'accounts',
      fields: ['name'],
      filters: [],
      sort: [],
      groupBy: ['name'],
      aggregations: [],
      limit: 150,
    });

    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />, { route: '/reports/builder?template=tpl-1' });

    expect(instantiateTemplateMock).toHaveBeenCalledWith('tpl-1');

    await user.click(screen.getByRole('button', { name: /generate report/i }));
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reports/generate',
        payload: expect.objectContaining({
          entity: 'accounts',
          fields: ['name'],
          groupBy: ['name'],
          limit: 150,
        }),
      })
    );
  });

  it('shows alert when template loading fails', async () => {
    instantiateTemplateMock.mockRejectedValue(new Error('fail'));
    renderWithProviders(<ReportBuilder />, { route: '/reports/builder?template=tpl-fail' });
    await Promise.resolve();
    expect(window.alert).toHaveBeenCalledWith('Failed to load template');
  });

  it('validates report name before saving and then saves successfully', async () => {
    mockState.savedReports.currentSavedReport = {
      id: 'saved-1',
      name: 'Existing Name',
      entity: 'contacts',
      report_definition: {
        name: 'Existing Name',
        entity: 'contacts',
        fields: ['email'],
      },
    };

    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />);

    await user.click(screen.getByRole('button', { name: /save definition/i }));
    const reportNameField = screen.getByLabelText(/report name/i);
    await user.clear(reportNameField);
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(window.alert).toHaveBeenCalledWith('Please enter a report name');

    await user.type(reportNameField, 'Monthly Contact Snapshot');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'saved/create',
        payload: expect.objectContaining({
          name: 'Monthly Contact Snapshot',
          entity: 'contacts',
        }),
      })
    );
  });

  it('starts an export job for csv output instead of downloading directly', async () => {
    mockState.reports.currentReport = {
      definition: {
        name: 'Contacts',
        entity: 'contacts',
        fields: ['email'],
      },
      data: [{ email: 'alice@example.com' }],
      total_count: 1,
      generated_at: new Date().toISOString(),
    };

    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />);

    await user.click(screen.getByRole('button', { name: /export csv/i }));

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reports/createExportJob',
        payload: expect.objectContaining({
          format: 'csv',
          definition: expect.objectContaining({
            entity: 'contacts',
          }),
        }),
      })
    );
  });

  it('polls the active export job while it is processing', async () => {
    vi.useFakeTimers();
    mockState.reports.exportJobs = [
      makeExportJob({
        id: 'job-processing',
        status: 'processing',
      }),
    ];
    mockState.reports.activeExportJobId = 'job-processing';

    renderWithProviders(<ReportBuilder />);

    await vi.advanceTimersByTimeAsync(2000);

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reports/fetchExportJob',
        payload: 'job-processing',
      })
    );
  });

  it('auto-downloads the active completed export job', async () => {
    mockState.reports.exportJobs = [
      makeExportJob({
        id: 'job-complete',
        status: 'completed',
      }),
    ];
    mockState.reports.activeExportJobId = 'job-complete';
    downloadExportJobMock.mockResolvedValue({
      blob: new Blob(['email\nalice@example.com'], { type: 'text/csv' }),
      filename: 'contacts.csv',
      contentType: 'text/csv',
    });

    renderWithProviders(<ReportBuilder />);

    await waitFor(() => {
      expect(downloadExportJobMock).toHaveBeenCalledWith('job-complete', 'contacts.csv');
    });
    expect(triggerFileDownloadMock).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'contacts.csv' })
    );
  });

  it('retries failed export jobs from the recent exports panel', async () => {
    mockState.reports.exportJobs = [
      makeExportJob({
        id: 'job-failed',
        status: 'failed',
        failureMessage: 'Export worker failed',
      }),
    ];

    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />);

    await user.click(screen.getByRole('button', { name: /retry export/i }));

    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'reports/createExportJob',
        payload: expect.objectContaining({
          definition: expect.objectContaining({ entity: 'contacts' }),
          format: 'csv',
        }),
      })
    );
  });
});
