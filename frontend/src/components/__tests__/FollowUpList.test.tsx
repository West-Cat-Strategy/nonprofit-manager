import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FollowUpList from '../FollowUpList';
import { renderWithProviders } from '../../test/testUtils';
import { casesApiClient } from '../../features/cases/api/casesApiClient';

const dispatchMock = vi.fn();
const showErrorMock = vi.fn();
const showSuccessMock = vi.fn();

const baseFollowUp = {
  id: 'follow-up-1',
  entity_type: 'contact' as const,
  entity_id: 'contact-1',
  title: 'Check in with client',
  description: 'Confirm next steps',
  scheduled_date: '2030-01-01',
  scheduled_time: '10:00',
  frequency: 'once' as const,
  status: 'scheduled' as const,
  assigned_to_name: 'Alex Rivera',
  completed_notes: null,
  created_at: '2026-04-01T00:00:00.000Z',
  updated_at: '2026-04-01T00:00:00.000Z',
};

const createdFollowUp = {
  id: 'follow-up-2',
  entity_type: 'contact' as const,
  entity_id: 'contact-1',
  title: 'Call back new lead',
  description: null,
  scheduled_date: '2030-01-02',
  scheduled_time: null,
  frequency: 'once' as const,
  status: 'scheduled' as const,
  assigned_to_name: null,
  completed_notes: null,
  created_at: '2026-04-02T00:00:00.000Z',
  updated_at: '2026-04-02T00:00:00.000Z',
};

const mockState = {
  followUps: {
    entityFollowUps: [baseFollowUp],
    entityLoading: false,
    loading: false,
  },
};

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../features/followUps/state', () => ({
  default: (
    state = {
      followUps: [],
      entityFollowUps: [],
      selectedFollowUp: null,
      summary: null,
      upcoming: [],
      loading: false,
      entityLoading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
      filters: {},
    }
  ) => state,
  fetchEntityFollowUps: (payload: unknown) => ({ type: 'followups/fetchEntity', payload }),
  clearEntityFollowUps: () => ({ type: 'followups/clearEntity' }),
  completeFollowUp: (payload: unknown) => ({ type: 'followups/complete', payload }),
  cancelFollowUp: (payload: unknown) => ({ type: 'followups/cancel', payload }),
  deleteFollowUp: (payload: unknown) => ({ type: 'followups/delete', payload }),
  rescheduleFollowUp: (payload: unknown) => ({ type: 'followups/reschedule', payload }),
}));

vi.mock('../../contexts/useToast', () => ({
  useToast: () => ({
    showError: showErrorMock,
    showSuccess: showSuccessMock,
  }),
}));

vi.mock('../../features/cases/api/casesApiClient', () => ({
  casesApiClient: {
    listOutcomeDefinitions: vi.fn(),
  },
}));

vi.mock('../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: {
      isOpen: false,
      title: '',
      message: '',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      variant: 'info',
    },
    confirm: vi.fn(),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
  confirmPresets: {
    delete: () => ({
      title: 'Delete',
      message: 'Delete?',
      confirmLabel: 'Delete',
      variant: 'danger',
    }),
  },
}));

vi.mock('../ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('../FollowUpForm', () => ({
  default: ({
    entityType,
    onSuccess,
    onCancel,
  }: {
    entityType: string;
    onSuccess?: (followUp: unknown) => void;
    onCancel?: () => void;
  }) => (
    <div data-testid={entityType === 'contact' ? 'contact-followup-form' : undefined}>
      <button
        type="button"
        onClick={() =>
          onSuccess?.({
            id: 'follow-up-2',
            entity_type: 'contact',
            entity_id: 'contact-1',
            title: 'Call back new lead',
            description: null,
            scheduled_date: '2030-01-02',
            scheduled_time: null,
            frequency: 'once',
            status: 'scheduled',
            assigned_to_name: null,
            completed_notes: null,
            created_at: '2026-04-02T00:00:00.000Z',
            updated_at: '2026-04-02T00:00:00.000Z',
          })
        }
      >
        Save Follow-up
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  ),
}));

describe('FollowUpList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.followUps.entityFollowUps = [baseFollowUp];
    vi.mocked(casesApiClient.listOutcomeDefinitions).mockResolvedValue([
      {
        id: 'outcome-1',
        key: 'housing-secured',
        name: 'Housing secured',
        description: null,
        category: null,
        is_active: true,
        is_reportable: true,
        sort_order: 1,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
    ]);
  });

  it('keeps the contact follow-up toggle, form, and card hooks stable', async () => {
    renderWithProviders(<FollowUpList entityType="contact" entityId="contact-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('contact-followup-card')).toBeInTheDocument();
    });

    expect(screen.getByTestId('contact-followup-toggle')).toBeInTheDocument();
    expect(screen.queryByTestId('contact-followup-form')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contact-followup-toggle'));

    expect(screen.getByTestId('contact-followup-form')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contact-followup-toggle'));

    expect(screen.queryByTestId('contact-followup-form')).not.toBeInTheDocument();
  });

  it('closes the contact form after create success without dropping the saved follow-up', async () => {
    renderWithProviders(<FollowUpList entityType="contact" entityId="contact-1" />);

    fireEvent.click(screen.getByTestId('contact-followup-toggle'));
    mockState.followUps.entityFollowUps = [
      ...mockState.followUps.entityFollowUps,
      createdFollowUp,
    ];
    fireEvent.click(screen.getByRole('button', { name: /save follow-up/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('contact-followup-form')).not.toBeInTheDocument();
    });

    expect(screen.getByText(baseFollowUp.title)).toBeInTheDocument();
    expect(screen.getByText(createdFollowUp.title)).toBeInTheDocument();
  });

  it('surfaces backend validation messages when completing a case follow-up fails', async () => {
    dispatchMock.mockImplementation((action: { type?: string }) => {
      if (action.type === 'followups/complete') {
        return {
          unwrap: () => Promise.reject('completed_notes: Add a meaningful resolution note'),
        };
      }

      return action;
    });

    renderWithProviders(<FollowUpList entityType="case" entityId="case-1" />);

    await waitFor(() => {
      expect(casesApiClient.listOutcomeDefinitions).toHaveBeenCalledWith(false);
    });

    fireEvent.click(screen.getByRole('button', { name: /^✓ complete$/i }));
    fireEvent.change(screen.getByPlaceholderText(/add completion notes/i), {
      target: { value: 'Closed the loop' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /housing secured/i }));
    fireEvent.click(screen.getByRole('button', { name: /save complete/i }));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith(
        'completed_notes: Add a meaningful resolution note'
      );
    });
    expect(showSuccessMock).not.toHaveBeenCalled();
  });

  it('shows a save-cancel action and surfaces backend validation messages when cancellation fails', async () => {
    dispatchMock.mockImplementation((action: { type?: string }) => {
      if (action.type === 'followups/cancel') {
        return {
          unwrap: () => Promise.reject('completed_notes: Cancellation reason is required'),
        };
      }

      return action;
    });

    renderWithProviders(<FollowUpList entityType="case" entityId="case-1" />);

    await waitFor(() => {
      expect(casesApiClient.listOutcomeDefinitions).toHaveBeenCalledWith(false);
    });

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    fireEvent.change(screen.getByPlaceholderText(/add cancellation notes/i), {
      target: { value: 'Client no longer needs support' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /housing secured/i }));

    expect(screen.getByRole('button', { name: /save cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /discard draft/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save cancel/i }));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith(
        'completed_notes: Cancellation reason is required'
      );
    });
    expect(showSuccessMock).not.toHaveBeenCalled();
  });
});
