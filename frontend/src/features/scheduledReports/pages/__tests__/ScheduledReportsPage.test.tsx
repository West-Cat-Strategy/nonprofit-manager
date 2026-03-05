import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type * as SavedReportsSliceModule from '../../../savedReports/state';
import type * as ScheduledReportsSliceModule from '../../state';
import type { ScheduledReport } from '../../../../types/scheduledReport';
import { vi } from 'vitest';
import ScheduledReportsPage from '../ScheduledReportsPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn(() => Promise.resolve());

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

const mockState = {
  scheduledReports: {
    reports: [makeScheduledReport()],
    runsByReportId: {} as Record<string, unknown[]>,
    loading: false,
    error: null as string | null,
  },
  savedReports: {
    reports: [
      {
        id: 'saved-report-1',
        name: 'Donor Growth',
      },
    ],
  },
};

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof ScheduledReportsSliceModule>(
    '../../state'
  );
  return {
    ...actual,
    fetchScheduledReports: () => ({ type: 'scheduledReports/fetch' }),
    fetchScheduledReportRuns: (payload: unknown) => ({
      type: 'scheduledReports/fetchRuns',
      payload,
    }),
    createScheduledReport: (payload: unknown) => ({ type: 'scheduledReports/create', payload }),
    updateScheduledReport: (payload: unknown) => ({ type: 'scheduledReports/update', payload }),
    toggleScheduledReport: (payload: unknown) => ({ type: 'scheduledReports/toggle', payload }),
    runScheduledReportNow: (id: string) => ({ type: 'scheduledReports/runNow', payload: id }),
    deleteScheduledReport: (id: string) => ({ type: 'scheduledReports/delete', payload: id }),
  };
});

vi.mock('../../../savedReports/state', async () => {
  const actual = await vi.importActual<typeof SavedReportsSliceModule>(
    '../../../savedReports/state'
  );
  return {
    ...actual,
    fetchSavedReports: () => ({ type: 'savedReports/fetch' }),
  };
});

describe('ScheduledReports page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.scheduledReports.reports = [makeScheduledReport()];
    mockState.scheduledReports.runsByReportId = {};
    mockState.scheduledReports.loading = false;
    mockState.scheduledReports.error = null;
  });

  it('creates a monthly schedule from the creator form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ScheduledReportsPage />);

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'scheduledReports/fetch' })
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'savedReports/fetch' })
      );
    });

    await user.click(screen.getByRole('button', { name: /new schedule/i }));

    await user.selectOptions(screen.getByLabelText(/saved report/i), 'saved-report-1');
    await user.type(
      screen.getByLabelText(/recipients \(comma-separated emails\)/i),
      'ops@example.org, director@example.org'
    );
    await user.selectOptions(screen.getByLabelText(/^frequency$/i), 'monthly');
    await user.clear(screen.getByLabelText(/day of month/i));
    await user.type(screen.getByLabelText(/day of month/i), '12');
    await user.click(screen.getByRole('button', { name: /save schedule/i }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scheduledReports/create',
          payload: expect.objectContaining({
            saved_report_id: 'saved-report-1',
            frequency: 'monthly',
            day_of_month: 12,
            recipients: ['ops@example.org', 'director@example.org'],
          }),
        })
      );
    });
  }, 15000);

  it(
    'filters schedules and handles row actions including run history and edit',
    async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockState.scheduledReports.reports = [
      makeScheduledReport({
        id: 'schedule-1',
        name: 'Weekly Donor Summary',
        is_active: true,
        frequency: 'weekly',
      }),
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
    mockState.scheduledReports.runsByReportId = {
      'schedule-2': [
        {
          id: 'run-1',
          status: 'failed',
          started_at: '2026-03-01T12:00:00.000Z',
          completed_at: '2026-03-01T12:03:00.000Z',
          rows_count: 0,
          file_name: null,
          error_message: 'Mailbox unavailable',
        },
      ],
    };

    renderWithProviders(<ScheduledReportsPage />);

    await user.selectOptions(screen.getByLabelText(/status/i), 'paused');
    expect(screen.getByText('Paused Outcomes Digest')).toBeInTheDocument();
    expect(screen.queryByText('Weekly Donor Summary')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /view runs/i }));
    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scheduledReports/fetchRuns',
          payload: { scheduledReportId: 'schedule-2', limit: 20 },
        })
      );
    });

    await user.click(screen.getByRole('button', { name: /retry failed run/i }));
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'scheduledReports/runNow', payload: 'schedule-2' })
    );

    await user.click(screen.getByRole('button', { name: /resume/i }));
    await user.click(screen.getByRole('button', { name: /^run now$/i }));
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'scheduledReports/toggle',
        payload: { scheduledReportId: 'schedule-2' },
      })
    );
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'scheduledReports/runNow', payload: 'schedule-2' })
    );

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.clear(screen.getByLabelText(/schedule name/i));
    await user.type(screen.getByLabelText(/schedule name/i), 'Updated name');
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scheduledReports/update',
          payload: expect.objectContaining({
            scheduledReportId: 'schedule-2',
            data: expect.objectContaining({ name: 'Updated name' }),
          }),
        })
      );
    });

      await user.click(screen.getByRole('button', { name: /delete/i }));
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'scheduledReports/delete', payload: 'schedule-2' })
      );
    },
    15000
  );

  it('renders loading, error, and empty states', () => {
    mockState.scheduledReports.loading = true;
    mockState.scheduledReports.error = 'Failed to load schedules';
    mockState.scheduledReports.reports = [];

    const { rerender } = renderWithProviders(<ScheduledReportsPage />);
    expect(screen.getByText(/loading schedules/i)).toBeInTheDocument();
    expect(screen.getByText(/failed to load schedules/i)).toBeInTheDocument();

    mockState.scheduledReports.loading = false;
    rerender(<ScheduledReportsPage />);
    expect(screen.getByText(/no schedules created yet/i)).toBeInTheDocument();
  });
});
