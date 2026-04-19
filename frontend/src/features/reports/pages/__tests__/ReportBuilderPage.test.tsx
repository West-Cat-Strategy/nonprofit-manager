import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type * as ReactRouterDom from 'react-router-dom';
import type { ReportExportJob } from '../../../../types/report';
import { vi } from 'vitest';
import ReportBuilderPage from '../ReportBuilderPage';
import { renderWithProviders } from '../../../../test/testUtils';

const buildAuthState = (permissions: string[]) => ({
  auth: {
    user: {
      id: 'user-1',
      email: 'manager@example.com',
      firstName: 'Manager',
      lastName: 'User',
      role: 'manager',
      permissions,
    },
    isAuthenticated: true,
    authLoading: false,
    loading: false,
  },
});

const {
  handleDownloadExportJobMock,
  handleEntityChangeMock,
  handleGenerateReportMock,
  handleRetryExportJobMock,
  handleSaveReportMock,
  handleStartExportMock,
  navigateMock,
  resetSaveDialogMock,
  setSavedReportDescriptionMock,
  setSavedReportNameMock,
  setShowChartMock,
  setShowSaveDialogMock,
} = vi.hoisted(() => ({
  handleDownloadExportJobMock: vi.fn(),
  handleEntityChangeMock: vi.fn(),
  handleGenerateReportMock: vi.fn(),
  handleRetryExportJobMock: vi.fn(),
  handleSaveReportMock: vi.fn(),
  handleStartExportMock: vi.fn(),
  navigateMock: vi.fn(),
  resetSaveDialogMock: vi.fn(),
  setSavedReportDescriptionMock: vi.fn(),
  setSavedReportNameMock: vi.fn(),
  setShowChartMock: vi.fn(),
  setShowSaveDialogMock: vi.fn(),
}));

const exportJob: ReportExportJob = {
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
  runtimeMs: 20,
  failureMessage: null,
  artifactPath: '/tmp/contacts.csv',
  artifactContentType: 'text/csv',
  artifactFileName: 'contacts.csv',
  artifactSizeBytes: 100,
  artifactExpiresAt: null,
  retentionUntil: null,
  metadata: {},
  startedAt: '2026-03-15T12:00:00.000Z',
  completedAt: '2026-03-15T12:00:01.000Z',
  createdAt: '2026-03-15T12:00:00.000Z',
  updatedAt: '2026-03-15T12:00:01.000Z',
};

const controllerState = {
  aggregations: [],
  allOutputFields: ['email'],
  availableFields: [{ field: 'email', label: 'Email', type: 'string' as const }],
  chartType: 'bar' as const,
  currentReport: {
    definition: { name: 'Contacts', entity: 'contacts' as const, fields: ['email'] },
    data: [{ email: 'alex@example.org' }],
    total_count: 1,
    generated_at: '2026-03-15T12:00:00.000Z',
  },
  currentSavedReport: null,
  downloadingJobId: null,
  entity: 'contacts' as const,
  exportJobError: null,
  exportJobsLoading: false,
  fieldsLoading: false,
  filters: [],
  groupBy: [],
  loading: false,
  manualExportJobs: [exportJob],
  reportRows: [{ email: 'alex@example.org' }],
  rowLimit: '500',
  savedReportDescription: 'Monthly snapshot',
  savedReportName: 'Contacts export',
  selectedFields: ['email'],
  showChart: false,
  showSaveDialog: false,
  sorts: [],
  xAxisField: '',
  yAxisField: '',
  setAggregations: vi.fn(),
  setChartType: vi.fn(),
  setFilters: vi.fn(),
  setGroupBy: vi.fn(),
  setRowLimit: vi.fn(),
  setSavedReportDescription: setSavedReportDescriptionMock,
  setSavedReportName: setSavedReportNameMock,
  setSelectedFields: vi.fn(),
  setShowChart: setShowChartMock,
  setShowSaveDialog: setShowSaveDialogMock,
  setSorts: vi.fn(),
  setXAxisField: vi.fn(),
  setYAxisField: vi.fn(),
  handleDownloadExportJob: handleDownloadExportJobMock,
  handleEntityChange: handleEntityChangeMock,
  handleExportPDF: vi.fn(),
  handleGenerateReport: handleGenerateReportMock,
  handleRetryExportJob: handleRetryExportJobMock,
  handleSaveReport: handleSaveReportMock,
  handleStartExport: handleStartExportMock,
  resetSaveDialog: resetSaveDialogMock,
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../hooks/useReportBuilderController', () => ({
  default: () => controllerState,
}));

vi.mock('../../../../components/FieldSelector', () => ({
  default: () => <div>Field Selector</div>,
}));

vi.mock('../../../../components/FilterBuilder', () => ({
  default: () => <div>Filter Builder</div>,
}));

vi.mock('../../../../components/SortBuilder', () => ({
  default: () => <div>Sort Builder</div>,
}));

vi.mock('../../../../components/ReportChart', () => ({
  default: () => <div>Report Chart</div>,
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('ReportBuilderPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controllerState.showSaveDialog = false;
    controllerState.showChart = false;
    controllerState.manualExportJobs = [exportJob];
    controllerState.reportRows = [{ email: 'alex@example.org' }];
    controllerState.currentReport = {
      definition: { name: 'Contacts', entity: 'contacts', fields: ['email'] },
      data: [{ email: 'alex@example.org' }],
      total_count: 1,
      generated_at: '2026-03-15T12:00:00.000Z',
    };
  });

  it('renders the report builder header and navigation actions', () => {
    renderWithProviders(<ReportBuilderPage />, {
      preloadedState: buildAuthState(['report:view', 'report:create', 'report:export']),
    });

    expect(screen.getByRole('heading', { name: /report builder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /kpi templates/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /outcomes report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /workflow coverage/i })).toBeInTheDocument();
  });

  it('navigates to related reporting routes from the page header', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportBuilderPage />, {
      preloadedState: buildAuthState(['report:view', 'report:create', 'report:export']),
    });

    await user.click(screen.getByRole('button', { name: /kpi templates/i }));
    await user.click(screen.getByRole('button', { name: /workflow coverage/i }));

    expect(navigateMock).toHaveBeenCalledWith('/reports/templates');
    expect(navigateMock).toHaveBeenCalledWith('/reports/workflow-coverage');
  });

  it('delegates entity changes and report generation to the controller', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportBuilderPage />, {
      preloadedState: buildAuthState(['report:view', 'report:create', 'report:export']),
    });

    await user.click(screen.getByRole('button', { name: /accounts/i }));
    await user.click(screen.getByRole('button', { name: /generate report/i }));

    expect(handleEntityChangeMock).toHaveBeenCalledWith('accounts');
    expect(handleGenerateReportMock).toHaveBeenCalled();
  });

  it('starts exports and retries recent export jobs through the controller', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportBuilderPage />, {
      preloadedState: buildAuthState(['report:view', 'report:create', 'report:export']),
    });

    await user.click(screen.getByRole('button', { name: /export csv/i }));
    await user.click(screen.getByRole('button', { name: /retry export/i }));
    await user.click(screen.getByRole('button', { name: /download/i }));

    expect(handleStartExportMock).toHaveBeenCalledWith('csv');
    expect(handleRetryExportJobMock).toHaveBeenCalledWith(exportJob);
    expect(handleDownloadExportJobMock).toHaveBeenCalledWith(exportJob);
  });

  it('opens and closes the save dialog through controller setters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportBuilderPage />, {
      preloadedState: buildAuthState(['report:view', 'report:create', 'report:export']),
    });

    await user.click(screen.getByRole('button', { name: /save definition/i }));
    expect(setShowSaveDialogMock).toHaveBeenCalledWith(true);

    controllerState.showSaveDialog = true;
    renderWithProviders(<ReportBuilderPage />, {
      preloadedState: buildAuthState(['report:view', 'report:create', 'report:export']),
    });

    await user.type(screen.getByLabelText(/report name/i), ' Updated');
    await user.type(screen.getByLabelText(/description/i), ' Notes');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(setSavedReportNameMock).toHaveBeenCalled();
    expect(setSavedReportDescriptionMock).toHaveBeenCalled();
    expect(handleSaveReportMock).toHaveBeenCalled();
    expect(resetSaveDialogMock).toHaveBeenCalled();
  });

  it('hides export affordances when the user lacks report export permission', () => {
    renderWithProviders(<ReportBuilderPage />, {
      preloadedState: buildAuthState(['report:view', 'report:create']),
    });

    expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save definition/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export csv/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export excel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /export pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry export/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download/i })).not.toBeInTheDocument();
  });
});
