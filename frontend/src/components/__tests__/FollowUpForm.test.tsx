import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FollowUpForm from '../FollowUpForm';
import { renderWithProviders } from '../../test/testUtils';

const dispatchMock = vi.fn();
const showErrorMock = vi.fn();
const showSuccessMock = vi.fn();

vi.mock('../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: { followUps: { loading: boolean } }) => unknown) =>
    selector({ followUps: { loading: false } }),
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
  createFollowUp: (payload: unknown) => ({ type: 'followups/create', payload }),
  updateFollowUp: (payload: unknown) => ({ type: 'followups/update', payload }),
}));

vi.mock('../../contexts/useToast', () => ({
  useToast: () => ({
    showError: showErrorMock,
    showSuccess: showSuccessMock,
  }),
}));

describe('FollowUpForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('surfaces backend validation messages when scheduling fails', async () => {
    dispatchMock.mockImplementation((action: { type?: string }) => {
      if (action.type === 'followups/create') {
        return {
          unwrap: () => Promise.reject('scheduled_date: Scheduled date is required'),
        };
      }

      return action;
    });

    renderWithProviders(<FollowUpForm entityType="contact" entityId="contact-1" />);

    expect(screen.getByTestId('contact-followup-form')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Call back client' },
    });
    fireEvent.click(screen.getByRole('button', { name: /schedule follow-up/i }));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith('scheduled_date: Scheduled date is required');
    });
    expect(showSuccessMock).not.toHaveBeenCalled();
  });
});
