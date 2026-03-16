import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type * as ReactRouterDom from 'react-router-dom';
import type { SavedReportListItem } from '../../../../types/savedReport';
import { vi } from 'vitest';
import SavedReportsPage from '../SavedReportsPage';
import { renderWithProviders } from '../../../../test/testUtils';

const {
  closeShareDialogMock,
  confirmMock,
  controllerStateRef,
  handleCopyPublicLinkMock,
  handleDeleteReportMock,
  handleGeneratePublicLinkMock,
  handleLoadReportMock,
  handleRemoveShareMock,
  handleRevokePublicLinkMock,
  handleSaveShareMock,
  handleScheduleMock,
  loadSavedReportsMock,
  loadSharePrincipalsMock,
  navigateMock,
  openShareDialogMock,
  resetScheduleDialogMock,
  setCurrentPageMock,
  setFilterEntityMock,
  setPublicLinkExpiryLocalMock,
  setScheduleDayOfMonthMock,
  setScheduleDayOfWeekMock,
  setScheduleFormatMock,
  setScheduleFrequencyMock,
  setScheduleHourMock,
  setScheduleMinuteMock,
  setScheduleRecipientsMock,
  setScheduleTargetMock,
  setScheduleTimezoneMock,
  setSelectedRoleNamesMock,
  setSelectedUserIdsMock,
  setShareCanEditMock,
  setShareSearchMock,
} = vi.hoisted(() => ({
  closeShareDialogMock: vi.fn(),
  confirmMock: vi.fn(() => Promise.resolve(true)),
  controllerStateRef: { current: null } as SavedReportsControllerStateRef,
  handleCopyPublicLinkMock: vi.fn(),
  handleDeleteReportMock: vi.fn(),
  handleGeneratePublicLinkMock: vi.fn(),
  handleLoadReportMock: vi.fn(),
  handleRemoveShareMock: vi.fn(),
  handleRevokePublicLinkMock: vi.fn(),
  handleSaveShareMock: vi.fn(),
  handleScheduleMock: vi.fn(),
  loadSavedReportsMock: vi.fn(),
  loadSharePrincipalsMock: vi.fn(),
  navigateMock: vi.fn(),
  openShareDialogMock: vi.fn(),
  resetScheduleDialogMock: vi.fn(),
  setCurrentPageMock: vi.fn(),
  setFilterEntityMock: vi.fn(),
  setPublicLinkExpiryLocalMock: vi.fn(),
  setScheduleDayOfMonthMock: vi.fn(),
  setScheduleDayOfWeekMock: vi.fn(),
  setScheduleFormatMock: vi.fn(),
  setScheduleFrequencyMock: vi.fn(),
  setScheduleHourMock: vi.fn(),
  setScheduleMinuteMock: vi.fn(),
  setScheduleRecipientsMock: vi.fn(),
  setScheduleTargetMock: vi.fn(),
  setScheduleTimezoneMock: vi.fn(),
  setSelectedRoleNamesMock: vi.fn(),
  setSelectedUserIdsMock: vi.fn(),
  setShareCanEditMock: vi.fn(),
  setShareSearchMock: vi.fn(),
}));

const makeReport = (overrides: Partial<SavedReportListItem> = {}): SavedReportListItem => ({
  id: 'saved-report-1',
  name: 'Donor Growth',
  description: 'Monthly donor growth',
  entity: 'donations',
  report_definition: {
    name: 'Donor Growth',
    entity: 'donations',
    fields: ['amount', 'created_at'],
    filters: [],
  },
  created_at: '2026-02-01T12:00:00.000Z',
  updated_at: '2026-02-02T12:00:00.000Z',
  is_public: false,
  shared_with_users: [],
  shared_with_roles: [],
  share_settings: null,
  public_token: null,
  ...overrides,
});

const reports = [
  makeReport({ id: 'saved-report-1', name: 'Donor Growth', entity: 'donations' }),
  makeReport({ id: 'saved-report-2', name: 'Accounts Snapshot', entity: 'accounts' }),
];

const buildControllerState = () => ({
  closeShareDialog: closeShareDialogMock,
  currentPage: 1,
  error: null as string | null,
  filterEntity: '' as const | '',
  filteredReports: reports,
  handleCopyPublicLink: handleCopyPublicLinkMock,
  handleDeleteReport: handleDeleteReportMock,
  handleGeneratePublicLink: handleGeneratePublicLinkMock,
  handleLoadReport: handleLoadReportMock,
  handleRemoveShare: handleRemoveShareMock,
  handleRevokePublicLink: handleRevokePublicLinkMock,
  handleSaveShare: handleSaveShareMock,
  handleSchedule: handleScheduleMock,
  loadSavedReports: loadSavedReportsMock,
  loadSharePrincipals: loadSharePrincipalsMock,
  loading: false,
  openShareDialog: openShareDialogMock,
  pagination: { page: 1, limit: 20, total: 2, total_pages: 1 },
  publicLinkDisplay: null as string | null,
  publicLinkExpiryLocal: '',
  resetScheduleDialog: resetScheduleDialogMock,
  scheduleDayOfMonth: '1',
  scheduleDayOfWeek: '1',
  scheduleFormat: 'csv' as const,
  scheduleFrequency: 'weekly' as const,
  scheduleHour: '9',
  scheduleMinute: '0',
  scheduleRecipients: '',
  scheduleTarget: null as SavedReportListItem | null,
  scheduleTimezone: 'UTC',
  selectedRoleNames: [] as string[],
  selectedUserIds: [] as string[],
  setCurrentPage: setCurrentPageMock,
  setFilterEntity: setFilterEntityMock,
  setPublicLinkExpiryLocal: setPublicLinkExpiryLocalMock,
  setScheduleDayOfMonth: setScheduleDayOfMonthMock,
  setScheduleDayOfWeek: setScheduleDayOfWeekMock,
  setScheduleFormat: setScheduleFormatMock,
  setScheduleFrequency: setScheduleFrequencyMock,
  setScheduleHour: setScheduleHourMock,
  setScheduleMinute: setScheduleMinuteMock,
  setScheduleRecipients: setScheduleRecipientsMock,
  setScheduleTarget: setScheduleTargetMock,
  setScheduleTimezone: setScheduleTimezoneMock,
  setSelectedRoleNames: setSelectedRoleNamesMock,
  setSelectedUserIds: setSelectedUserIdsMock,
  setShareCanEdit: setShareCanEditMock,
  setShareSearch: setShareSearchMock,
  shareBusy: false,
  shareCanEdit: false,
  shareError: null as string | null,
  shareRoles: [{ name: 'manager', label: 'Manager' }],
  shareSearch: '',
  shareTarget: null as SavedReportListItem | null,
  shareUsers: [
    {
      id: 'user-1',
      email: 'alex@example.org',
      first_name: 'Alex',
      last_name: 'Rivera',
      full_name: 'Alex Rivera',
    },
  ],
  toggleSelection: (current: string[], value: string) =>
    current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value],
});

type SavedReportsControllerState = ReturnType<typeof buildControllerState>;

type SavedReportsControllerStateRef = {
  current: SavedReportsControllerState | null;
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../hooks/useSavedReportsController', () => ({
  default: () => controllerStateRef.current,
}));

vi.mock('../../../../components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: {},
    confirm: confirmMock,
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
  confirmPresets: {
    delete: (label: string) => ({ title: `Delete ${label}` }),
  },
}));

describe('SavedReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controllerStateRef.current = buildControllerState();
  });

  it('renders saved report cards and delegates card actions to the controller', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SavedReportsPage />);

    expect(screen.getByText('Donor Growth')).toBeInTheDocument();
    expect(screen.getByText('Accounts Snapshot')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by entity/i), 'accounts');
    expect(setFilterEntityMock).toHaveBeenCalledWith('accounts');
    expect(setCurrentPageMock).toHaveBeenCalledWith(1);

    await user.click(screen.getAllByRole('button', { name: /load & run/i })[1]);
    await user.click(screen.getAllByRole('button', { name: /schedule/i })[0]);
    await user.click(screen.getAllByRole('button', { name: /share/i })[0]);

    expect(handleLoadReportMock).toHaveBeenCalledWith(reports[1]);
    expect(setScheduleTargetMock).toHaveBeenCalledWith(reports[0]);
    expect(openShareDialogMock).toHaveBeenCalledWith(reports[0]);
  });

  it('renders the schedule dialog and delegates schedule form changes', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.scheduleTarget = reports[0];
    controllerStateRef.current.scheduleFrequency = 'monthly';
    controllerStateRef.current.scheduleDayOfMonth = '15';

    renderWithProviders(<SavedReportsPage />);

    await user.type(screen.getByLabelText(/recipients \(comma-separated\)/i), 'ops@example.org');
    await user.clear(screen.getByLabelText(/day of month/i));
    await user.type(screen.getByLabelText(/day of month/i), '15');
    await user.click(screen.getByRole('button', { name: /save schedule/i }));
    await user.click(screen.getByRole('button', { name: /^close$/i }));

    expect(setScheduleRecipientsMock).toHaveBeenCalled();
    expect(setScheduleDayOfMonthMock).toHaveBeenCalled();
    expect(handleScheduleMock).toHaveBeenCalled();
    expect(resetScheduleDialogMock).toHaveBeenCalled();
  });

  it('renders the share dialog and delegates share/public-link actions', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.shareTarget = reports[0];
    controllerStateRef.current.publicLinkDisplay = '/public/reports/public-token-1';

    renderWithProviders(<SavedReportsPage />);

    await user.type(screen.getByLabelText(/search users/i), 'Alex');
    await user.click(screen.getByRole('button', { name: /^search$/i }));
    await user.click(screen.getByLabelText(/alex rivera/i));
    await user.click(screen.getByLabelText(/manager/i));
    await user.click(screen.getByLabelText(/allow edits for shared users\/roles/i));
    await user.type(screen.getByLabelText(/expiry/i), '2026-03-20T09:30');
    await user.click(screen.getByRole('button', { name: /^save sharing$/i }));
    await user.click(screen.getByRole('button', { name: /remove selected/i }));
    await user.click(screen.getByRole('button', { name: /generate link/i }));
    await user.click(screen.getByRole('button', { name: /copy link/i }));
    await user.click(screen.getByRole('button', { name: /revoke link/i }));
    await user.click(screen.getAllByRole('button', { name: /^close$/i })[0]);

    expect(setShareSearchMock).toHaveBeenCalled();
    expect(loadSharePrincipalsMock).toHaveBeenCalled();
    expect(setSelectedUserIdsMock).toHaveBeenCalled();
    expect(setSelectedUserIdsMock.mock.calls[0][0]([])).toEqual(['user-1']);
    expect(setSelectedRoleNamesMock).toHaveBeenCalled();
    expect(setSelectedRoleNamesMock.mock.calls[0][0]([])).toEqual(['manager']);
    expect(setShareCanEditMock).toHaveBeenCalledWith(true);
    expect(setPublicLinkExpiryLocalMock).toHaveBeenCalled();
    expect(handleSaveShareMock).toHaveBeenCalled();
    expect(handleRemoveShareMock).toHaveBeenCalled();
    expect(handleGeneratePublicLinkMock).toHaveBeenCalled();
    expect(handleCopyPublicLinkMock).toHaveBeenCalled();
    expect(handleRevokePublicLinkMock).toHaveBeenCalled();
    expect(closeShareDialogMock).toHaveBeenCalled();
    expect(screen.getByText('/public/reports/public-token-1')).toBeInTheDocument();
  });

  it('renders loading, error, empty, retry, and delete behaviors', async () => {
    const user = userEvent.setup();
    controllerStateRef.current.error = 'Failed to fetch saved reports';
    controllerStateRef.current.loading = true;

    const { rerender } = renderWithProviders(<SavedReportsPage />);

    expect(screen.getByText(/failed to fetch saved reports/i)).toBeInTheDocument();
    expect(screen.getByText(/loading saved reports/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(loadSavedReportsMock).toHaveBeenCalled();

    controllerStateRef.current.loading = false;
    controllerStateRef.current.error = null;
    controllerStateRef.current.filteredReports = [];
    rerender(<SavedReportsPage />);

    expect(screen.getByText(/no saved reports found/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /create your first report/i }));
    expect(navigateMock).toHaveBeenCalledWith('/reports/builder');

    controllerStateRef.current.filteredReports = reports;
    rerender(<SavedReportsPage />);
    await user.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    expect(confirmMock).toHaveBeenCalled();
    expect(handleDeleteReportMock).toHaveBeenCalledWith('saved-report-1');
  });
});
