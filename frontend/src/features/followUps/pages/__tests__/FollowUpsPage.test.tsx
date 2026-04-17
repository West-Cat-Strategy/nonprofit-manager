import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import FollowUpsPage from '../FollowUpsPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn(() => Promise.resolve({}));
const confirmMock = vi.fn(() => Promise.resolve(true));

const rescheduleFollowUpMock = vi.fn((payload: unknown) => ({ type: 'followups/reschedule', payload }));
const fetchFollowUpsMock = vi.fn((payload: unknown) => ({ type: 'followups/fetch', payload }));
const fetchFollowUpSummaryMock = vi.fn((payload: unknown) => ({ type: 'followups/fetchSummary', payload }));
const deleteFollowUpMock = vi.fn((id: string) => ({ type: 'followups/delete', payload: id }));
const completeFollowUpMock = vi.fn((payload: unknown) => ({ type: 'followups/complete', payload }));
const cancelFollowUpMock = vi.fn((id: string) => ({ type: 'followups/cancel', payload: id }));

const mockState = {
  followUps: {
    followUps: [
      {
        id: 'fu-1',
        entity_type: 'case',
        entity_id: 'case-1',
        title: 'Initial follow-up',
        description: 'Call client back',
        scheduled_date: '2026-03-05',
        scheduled_time: '10:00',
        status: 'scheduled',
        assigned_to_name: 'Alex Rivera',
        case_title: 'Housing Support',
        case_number: 'CASE-001',
        task_subject: null,
      },
    ],
    summary: {
      total: 1,
      scheduled: 1,
      completed: 0,
      cancelled: 0,
      overdue: 0,
      due_today: 0,
      due_this_week: 1,
    },
    loading: false,
    pagination: {
      page: 1,
      pages: 1,
      total: 1,
      limit: 20,
    },
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../../../features/followUps/state', () => ({
  default: (
    state = {
      followUps: [],
      summary: null,
      loading: false,
      pagination: { page: 1, pages: 1, total: 0, limit: 20 },
      error: null,
    }
  ) => state,
  fetchFollowUps: (payload: unknown) => fetchFollowUpsMock(payload),
  fetchFollowUpSummary: (payload: unknown) => fetchFollowUpSummaryMock(payload),
  completeFollowUp: (payload: unknown) => completeFollowUpMock(payload),
  cancelFollowUp: (payload: unknown) => cancelFollowUpMock(payload as string),
  deleteFollowUp: (payload: unknown) => deleteFollowUpMock(payload as string),
  rescheduleFollowUp: (payload: unknown) => rescheduleFollowUpMock(payload),
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../../../components/FollowUpForm', () => ({
  default: ({ entityType, entityId }: { entityType: string; entityId: string }) => (
    <div>{`FollowUpForm:${entityType}:${entityId}`}</div>
  ),
}));

vi.mock('../../../../features/followUps/components/FollowUpEntityPicker', () => ({
  default: ({
    onEntityTypeChange,
    onSelect,
  }: {
    onEntityTypeChange: (value: 'case' | 'task') => void;
    onSelect: (value: { entityType: 'case' | 'task'; entityId: string; label: string }) => void;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          onEntityTypeChange('case');
          onSelect({ entityType: 'case', entityId: 'case-42', label: 'Case 42' });
        }}
      >
        Pick Case
      </button>
      <button
        type="button"
        onClick={() => {
          onEntityTypeChange('task');
          onSelect({ entityType: 'task', entityId: 'task-99', label: 'Task 99' });
        }}
      >
        Pick Task
      </button>
    </div>
  ),
}));

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: {
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      variant: 'info',
    },
    confirm: confirmMock,
    handleCancel: vi.fn(),
    handleConfirm: vi.fn(),
  }),
  confirmPresets: {
    delete: () => ({
      title: 'Delete Follow-up',
      message: 'Delete?',
      confirmLabel: 'Delete',
      variant: 'danger',
    }),
  },
}));

vi.mock('../../../../components/ConfirmDialog', () => ({
  default: () => <div data-testid="confirm-dialog" />,
}));

describe('FollowUpsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchMock.mockClear();
    mockState.followUps.followUps = [
      {
        id: 'fu-1',
        entity_type: 'case',
        entity_id: 'case-1',
        title: 'Initial follow-up',
        description: 'Call client back',
        scheduled_date: '2026-03-05',
        scheduled_time: '10:00',
        status: 'scheduled',
        assigned_to_name: 'Alex Rivera',
        case_title: 'Housing Support',
        case_number: 'CASE-001',
        task_subject: null,
      },
    ];
    mockState.followUps.loading = false;
    mockState.followUps.error = null;
  });

  it('lets users pick a case/task entity without entering raw UUIDs', async () => {
    renderWithProviders(<FollowUpsPage />);

    fireEvent.click(screen.getByRole('button', { name: /create follow-up/i }));
    fireEvent.click(screen.getByRole('button', { name: /pick task/i }));

    expect(screen.getByText('FollowUpForm:task:task-99')).toBeInTheDocument();
  });

  it('validates reschedule date and dispatches reschedule action', async () => {
    renderWithProviders(<FollowUpsPage />);

    fireEvent.click(screen.getAllByRole('button', { name: /reschedule/i })[0]);

    const dateInput = screen.getByLabelText(/date/i);
    fireEvent.change(dateInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/scheduled date is required/i)).toBeInTheDocument();

    fireEvent.change(dateInput, { target: { value: '2030-01-01' } });
    fireEvent.change(screen.getByLabelText(/time/i), { target: { value: '09:30' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(rescheduleFollowUpMock).toHaveBeenCalledWith({
        followUpId: 'fu-1',
        newDate: '2030-01-01',
        newTime: '09:30',
      });
    });
  });

  it('uses confirm dialog flow for deletes instead of window.confirm', async () => {
    const windowConfirmSpy = vi.spyOn(window, 'confirm');
    renderWithProviders(<FollowUpsPage />);

    fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[0]);

    await waitFor(() => {
      expect(confirmMock).toHaveBeenCalledTimes(1);
    });
    expect(windowConfirmSpy).not.toHaveBeenCalled();

    windowConfirmSpy.mockRestore();
  });

  it('hydrates and sanitizes URL-backed list state before fetching', async () => {
    renderWithProviders(<FollowUpsPage />, {
      route: '/follow-ups?search=client&entity_type=invalid&status=broken&page=0',
    });

    await waitFor(() => {
      expect(fetchFollowUpsMock).toHaveBeenCalledWith({
        filters: {
          entity_type: undefined,
          status: undefined,
        },
        page: 1,
        limit: 20,
      });
    });

    expect(screen.getByLabelText('Search follow-ups')).toHaveValue('client');
    expect(screen.getByLabelText('Filter follow-ups by entity type')).toHaveValue('');
    expect(screen.getByLabelText('Filter follow-ups by status')).toHaveValue('');
  });

  it('resets pagination when a URL-backed filter changes', async () => {
    renderWithProviders(<FollowUpsPage />, { route: '/follow-ups?page=3' });

    fireEvent.change(screen.getByLabelText('Filter follow-ups by status'), {
      target: { value: 'completed' },
    });

    await waitFor(() => {
      expect(fetchFollowUpsMock).toHaveBeenLastCalledWith({
        filters: {
          entity_type: undefined,
          status: 'completed',
        },
        page: 1,
        limit: 20,
      });
    });
  });

  it('renders loading, empty, and error states for the follow-up list', () => {
    mockState.followUps.loading = true;
    mockState.followUps.followUps = [];

    const loadingView = renderWithProviders(<FollowUpsPage />);
    expect(screen.getAllByText('Loading follow-ups...').length).toBeGreaterThan(0);
    loadingView.unmount();

    mockState.followUps.loading = false;
    const emptyView = renderWithProviders(<FollowUpsPage />);
    expect(screen.getAllByText('No follow-ups found.').length).toBeGreaterThan(0);
    emptyView.unmount();

    mockState.followUps.error = 'Unable to load follow-ups';
    renderWithProviders(<FollowUpsPage />);
    expect(screen.getByText('Unable to load follow-ups')).toBeInTheDocument();
  });
});
