import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type * as ReactRouterDom from 'react-router-dom';
import type * as SavedReportsSliceModule from '../../../store/slices/savedReportsSlice';
import type * as ScheduledReportsSliceModule from '../../../store/slices/scheduledReportsSlice';
import type { SavedReport } from '../../../types/savedReport';
import { vi } from 'vitest';
import SavedReports from '../../analytics/SavedReports';
import { renderWithProviders } from '../../../test/testUtils';

const {
  dispatchMock,
  navigateMock,
  confirmMock,
  clipboardWriteTextMock,
  shareClientMock,
} = vi.hoisted(() => ({
  dispatchMock: vi.fn(() => Promise.resolve()),
  navigateMock: vi.fn(),
  confirmMock: vi.fn(() => Promise.resolve(true)),
  clipboardWriteTextMock: vi.fn(() => Promise.resolve()),
  shareClientMock: {
    fetchSharePrincipals: vi.fn(),
    shareSavedReport: vi.fn(),
    removeSavedReportShare: vi.fn(),
    generatePublicLink: vi.fn(),
    revokePublicLink: vi.fn(),
  },
}));

const makeReport = (overrides: Partial<SavedReport> = {}): SavedReport => ({
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
  ...overrides,
});

const mockState = {
  savedReports: {
    reports: [makeReport()],
    loading: false,
    error: null as string | null,
  },
};

vi.mock('../../../components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../hooks/useConfirmDialog', () => ({
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

vi.mock('../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../../store/slices/scheduledReportsSlice', async () => {
  const actual = await vi.importActual<typeof ScheduledReportsSliceModule>(
    '../../../store/slices/scheduledReportsSlice'
  );
  return {
    ...actual,
    createScheduledReport: (payload: unknown) => ({ type: 'scheduledReports/create', payload }),
  };
});

vi.mock('../../../store/slices/savedReportsSlice', async () => {
  const actual = await vi.importActual<typeof SavedReportsSliceModule>(
    '../../../store/slices/savedReportsSlice'
  );
  return {
    ...actual,
    fetchSavedReports: (entity?: string) => ({ type: 'savedReports/fetch', payload: entity }),
    deleteSavedReport: (id: string) => ({ type: 'savedReports/delete', payload: id }),
  };
});

vi.mock('../../../features/savedReports/api/savedReportsApiClient', () => ({
  savedReportsApiClient: shareClientMock,
}));

describe('SavedReports page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: clipboardWriteTextMock,
      },
    });

    mockState.savedReports.reports = [
      makeReport({ id: 'saved-report-1', name: 'Donor Growth', entity: 'donations' }),
      makeReport({ id: 'saved-report-2', name: 'Accounts Snapshot', entity: 'accounts' }),
    ];
    mockState.savedReports.loading = false;
    mockState.savedReports.error = null;

    shareClientMock.fetchSharePrincipals.mockResolvedValue({
      users: [
        {
          id: 'user-1',
          email: 'alex@example.org',
          first_name: 'Alex',
          last_name: 'Rivera',
          full_name: 'Alex Rivera',
        },
      ],
      roles: [{ name: 'manager', label: 'Manager' }],
    });
    shareClientMock.shareSavedReport.mockResolvedValue(makeReport());
    shareClientMock.removeSavedReportShare.mockResolvedValue(makeReport());
    shareClientMock.generatePublicLink.mockResolvedValue({
      token: 'public-token-1',
      url: '/public/reports/public-token-1',
    });
    shareClientMock.revokePublicLink.mockResolvedValue(undefined);
  });

  it('renders and filters report cards, then loads a report in builder', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SavedReports />);

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'savedReports/fetch' })
      );
    });

    expect(screen.getByText('Donor Growth')).toBeInTheDocument();
    expect(screen.getByText('Accounts Snapshot')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/filter by entity/i), 'accounts');

    expect(screen.getByText('Accounts Snapshot')).toBeInTheDocument();
    expect(screen.queryByText('Donor Growth')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /load & run/i }));
    expect(navigateMock).toHaveBeenCalledWith('/reports/builder?load=saved-report-2');
  });

  it('supports scheduling a report with monthly cadence', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SavedReports />);

    await user.click(screen.getAllByRole('button', { name: /schedule/i })[0]);

    await user.type(screen.getByLabelText(/recipients \(comma-separated\)/i), 'ops@example.org');
    await user.selectOptions(screen.getByLabelText(/^frequency$/i), 'monthly');
    await user.clear(screen.getByLabelText(/day of month/i));
    await user.type(screen.getByLabelText(/day of month/i), '15');

    await user.click(screen.getByRole('button', { name: /save schedule/i }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scheduledReports/create',
          payload: expect.objectContaining({
            saved_report_id: 'saved-report-1',
            frequency: 'monthly',
            day_of_month: 15,
            recipients: ['ops@example.org'],
          }),
        })
      );
    });

    expect(navigateMock).toHaveBeenCalledWith('/reports/scheduled');
  });

  it('supports sharing controls including save/remove/public-link lifecycle', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SavedReports />);

    await user.click(screen.getAllByRole('button', { name: /share/i })[0]);

    await waitFor(() => {
      expect(shareClientMock.fetchSharePrincipals).toHaveBeenCalled();
      expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /remove selected/i }));
    expect(screen.getByText(/select at least one user or role/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/alex rivera/i));
    await user.click(screen.getByLabelText(/manager/i));
    await user.click(screen.getByRole('button', { name: /^save sharing$/i }));

    await waitFor(() => {
      expect(shareClientMock.shareSavedReport).toHaveBeenCalledWith(
        'saved-report-1',
        expect.objectContaining({
          user_ids: ['user-1'],
          role_names: ['manager'],
          share_settings: expect.objectContaining({ can_edit: false }),
        })
      );
    });

    await user.click(screen.getByRole('button', { name: /generate link/i }));
    await waitFor(() => {
      expect(shareClientMock.generatePublicLink).toHaveBeenCalledWith('saved-report-1', undefined);
    });
    await waitFor(() => {
      expect(screen.getByText(/\/public\/reports\/public-token-1/i)).toBeInTheDocument();
    });

    const copyButton = screen.getByRole('button', { name: /copy link/i });
    expect(copyButton).not.toBeDisabled();
    await user.click(copyButton);

    await user.click(screen.getByRole('button', { name: /revoke link/i }));
    await waitFor(() => {
      expect(shareClientMock.revokePublicLink).toHaveBeenCalledWith('saved-report-1');
    });
  });

  it('renders loading, error, and empty states', () => {
    mockState.savedReports.loading = true;
    mockState.savedReports.error = 'Failed to load';
    mockState.savedReports.reports = [];

    const { rerender } = renderWithProviders(<SavedReports />);
    expect(screen.getByText(/loading saved reports/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();

    mockState.savedReports.loading = false;
    rerender(<SavedReports />);
    expect(screen.getByText(/no saved reports found/i)).toBeInTheDocument();
  });
});
