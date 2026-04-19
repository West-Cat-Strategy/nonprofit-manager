import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { SavedReportListItem } from '../../../../types/savedReport';
import type { ScheduledReport, ScheduledReportRun } from '../../../../types/scheduledReport';
import { vi } from 'vitest';
import ScheduledReportsPage from '../ScheduledReportsPage';
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
  clearFormMock,
  closeEditDialogMock,
  controllerStateRef,
  handleCreateMock,
  handleDeleteMock,
  handleDownloadRunArtifactMock,
  handleOpenHistoryMock,
  handleRunNowMock,
  handleSaveEditMock,
  handleToggleScheduledReportMock,
  loadAllScheduledDataMock,
  openEditDialogMock,
  setFormMock,
  setSearchQueryMock,
  setShowCreateMock,
  setStatusFilterMock,
} = vi.hoisted(() => ({
  clearFormMock: vi.fn(),
  closeEditDialogMock: vi.fn(),
  controllerStateRef: { current: null } as ScheduledReportsControllerStateRef,
  handleCreateMock: vi.fn(),
  handleDeleteMock: vi.fn(),
  handleDownloadRunArtifactMock: vi.fn(),
  handleOpenHistoryMock: vi.fn(),
  handleRunNowMock: vi.fn(),
  handleSaveEditMock: vi.fn(),
  handleToggleScheduledReportMock: vi.fn(),
  loadAllScheduledDataMock: vi.fn(),
  openEditDialogMock: vi.fn(),
  setFormMock: vi.fn(),
  setSearchQueryMock: vi.fn(),
  setShowCreateMock: vi.fn(),
  setStatusFilterMock: vi.fn(),
}));

const savedReports: SavedReportListItem[] = [
  {
    id: 'saved-report-1',
    name: 'Donor Growth',
    description: 'Monthly donor growth',
    entity: 'donations',
    report_definition: {
      name: 'Donor Growth',
      entity: 'donations',
      fields: ['amount'],
      filters: [],
    },
    created_at: '2026-03-01T10:00:00.000Z',
    updated_at: '2026-03-01T10:00:00.000Z',
    is_public: false,
    shared_with_users: [],
    shared_with_roles: [],
    share_settings: null,
    public_token: null,
  },
];

const makeScheduledReport = (
  overrides: Partial<ScheduledReport> = {}
): ScheduledReport => ({
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

const successfulRun: ScheduledReportRun = {
  id: 'run-success',
  scheduled_report_id: 'schedule-1',
  status: 'success',
  started_at: '2026-03-01T12:00:00.000Z',
  completed_at: '2026-03-01T12:03:00.000Z',
  rows_count: 25,
  file_format: 'csv',
  file_name: 'weekly-donor-summary.csv',
  reportExportJobId: 'job-99',
  recipients: ['ops@example.org'],
  error_message: null,
  metadata: null,
  created_at: '2026-03-01T12:00:00.000Z',
};

const failedRun: ScheduledReportRun = {
  id: 'run-failed',
  scheduled_report_id: 'schedule-2',
  status: 'failed',
  started_at: '2026-03-01T12:00:00.000Z',
  completed_at: '2026-03-01T12:03:00.000Z',
  rows_count: 0,
  file_format: 'csv',
  file_name: null,
  reportExportJobId: null,
  recipients: ['ops@example.org'],
  error_message: 'Mailbox unavailable',
  metadata: null,
  created_at: '2026-03-01T12:00:00.000Z',
};

const buildControllerState = () => ({
  clearForm: clearFormMock,
  closeEditDialog: closeEditDialogMock,
  downloadingExportJobId: null as string | null,
  editTarget: null as ScheduledReport | null,
  error: null as string | null,
  form: {
    saved_report_id: 'saved-report-1',
    name: 'Monthly donor digest',
    recipients: 'ops@example.org',
    format: 'csv' as const,
    frequency: 'monthly' as const,
    timezone: 'UTC',
    hour: '9',
    minute: '0',
    day_of_week: '1',
    day_of_month: '12',
  },
  handleCreate: handleCreateMock,
  handleDelete: handleDeleteMock,
  handleDownloadRunArtifact: handleDownloadRunArtifactMock,
  handleOpenHistory: handleOpenHistoryMock,
  handleRunNow: handleRunNowMock,
  handleSaveEdit: handleSaveEditMock,
  handleToggleScheduledReport: handleToggleScheduledReportMock,
  historyReportId: null as string | null,
  loadAllScheduledData: loadAllScheduledDataMock,
  loading: false,
  openEditDialog: openEditDialogMock,
  runsByReportId: {} as Record<string, ScheduledReportRun[]>,
  savedReports,
  searchQuery: '',
  setForm: setFormMock,
  setSearchQuery: setSearchQueryMock,
  setShowCreate: setShowCreateMock,
  setStatusFilter: setStatusFilterMock,
  showCreate: false,
  sortedReports: [makeScheduledReport()],
  statusFilter: 'all' as const,
});

type ScheduledReportsControllerState = ReturnType<typeof buildControllerState>;

type ScheduledReportsControllerStateRef = {
  current: ScheduledReportsControllerState | null;
};

vi.mock('../../hooks/useScheduledReportsController', () => ({
  default: () => controllerStateRef.current,
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('ScheduledReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controllerStateRef.current = buildControllerState();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('renders the creator form and delegates create submission', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.showCreate = true;

    renderWithProviders(<ScheduledReportsPage />, {
      preloadedState: buildAuthState([
        'report:view',
        'report:export',
        'scheduled_report:view',
        'scheduled_report:manage',
      ]),
    });

    expect(screen.getByRole('heading', { name: /scheduled reports/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/saved report/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Monthly donor digest')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save schedule/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(handleCreateMock).toHaveBeenCalled();
    expect(clearFormMock).toHaveBeenCalled();
    expect(setShowCreateMock).toHaveBeenCalled();
  });

  it('delegates filter and row actions to the controller', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.sortedReports = [
      makeScheduledReport({
        id: 'schedule-2',
        name: 'Paused Outcomes Digest',
        is_active: false,
        frequency: 'monthly',
        day_of_week: null,
        day_of_month: 10,
        last_error: 'SMTP delivery failed',
      }),
    ];

    renderWithProviders(<ScheduledReportsPage />, {
      preloadedState: buildAuthState([
        'report:view',
        'report:export',
        'scheduled_report:view',
        'scheduled_report:manage',
      ]),
    });

    await user.type(screen.getByLabelText(/search schedules/i), 'paused');
    await user.selectOptions(screen.getByLabelText(/status/i), 'paused');
    await user.click(screen.getAllByRole('button', { name: /resume/i })[0]);
    await user.click(screen.getAllByRole('button', { name: /^run now$/i })[0]);
    await user.click(screen.getAllByRole('button', { name: /edit/i })[0]);
    await user.click(screen.getAllByRole('button', { name: /view runs/i })[0]);
    await user.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    expect(setSearchQueryMock).toHaveBeenCalled();
    expect(setStatusFilterMock).toHaveBeenCalledWith('paused');
    expect(handleToggleScheduledReportMock).toHaveBeenCalledWith('schedule-2');
    expect(handleRunNowMock).toHaveBeenCalledWith('schedule-2');
    expect(openEditDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'schedule-2' })
    );
    expect(handleOpenHistoryMock).toHaveBeenCalledWith('schedule-2');
    expect(handleDeleteMock).toHaveBeenCalledWith('schedule-2');
  });

  it('renders edit and history states and delegates edit/run artifact actions', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.editTarget = makeScheduledReport({ id: 'schedule-1' });
    controllerStateRef.current.historyReportId = 'schedule-1';
    controllerStateRef.current.runsByReportId = {
      'schedule-1': [successfulRun, failedRun],
    };

    renderWithProviders(<ScheduledReportsPage />, {
      preloadedState: buildAuthState([
        'report:view',
        'report:export',
        'scheduled_report:view',
        'scheduled_report:manage',
      ]),
    });

    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByText(/recent runs/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await user.click(screen.getByRole('button', { name: /download artifact/i }));
    await user.click(screen.getByRole('button', { name: /retry failed run/i }));
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(handleSaveEditMock).toHaveBeenCalled();
    expect(handleDownloadRunArtifactMock).toHaveBeenCalledWith(successfulRun);
    expect(handleRunNowMock).toHaveBeenCalledWith('schedule-1');
    expect(closeEditDialogMock).toHaveBeenCalled();
  });

  it('renders loading, error, empty, and retry states', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.loading = true;
    controllerStateRef.current.error = 'Failed to fetch scheduled reports';

    const managerState = buildAuthState([
      'report:view',
      'report:export',
      'scheduled_report:view',
      'scheduled_report:manage',
    ]);

    const initialRender = renderWithProviders(<ScheduledReportsPage />, {
      preloadedState: managerState,
    });

    expect(screen.getByText(/loading schedules/i)).toBeInTheDocument();

    controllerStateRef.current.loading = false;
    initialRender.unmount();
    const errorRender = renderWithProviders(<ScheduledReportsPage />, {
      preloadedState: managerState,
    });
    expect(screen.getByText(/failed to fetch scheduled reports/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(loadAllScheduledDataMock).toHaveBeenCalled();

    controllerStateRef.current.error = null;
    controllerStateRef.current.sortedReports = [];
    errorRender.unmount();
    renderWithProviders(<ScheduledReportsPage />, {
      preloadedState: managerState,
    });

    expect(screen.getByText(/no schedules created yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /create first schedule/i }));
    expect(setShowCreateMock).toHaveBeenCalledWith(true);
  });

  it('keeps schedule history visible while hiding management actions for read-only viewers', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.historyReportId = 'schedule-1';
    controllerStateRef.current.runsByReportId = {
      'schedule-1': [successfulRun, failedRun],
    };

    renderWithProviders(<ScheduledReportsPage />, {
      preloadedState: buildAuthState(['report:view', 'scheduled_report:view']),
    });

    expect(screen.queryByRole('button', { name: /new schedule/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /run now/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view runs|hide runs/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /download artifact/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry failed run/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide runs/i }));
    expect(handleOpenHistoryMock).toHaveBeenCalledWith('schedule-1');
  });
});
