import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as AlertsStateModule from '../../state';
import { vi } from 'vitest';
import AlertConfigModal from '../AlertConfigModal';

const dispatchMock = vi.fn();

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof AlertsStateModule>('../../state');
  return {
    ...actual,
    createAlertConfig: (payload: unknown) => ({ type: 'alerts/createConfig', payload }),
    updateAlertConfig: (payload: unknown) => ({ type: 'alerts/updateConfig', payload }),
    testAlertConfig: (payload: unknown) => ({ type: 'alerts/testConfig', payload }),
  };
});

describe('AlertConfigModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatchMock.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ would_trigger: false, current_value: 9, message: 'OK' }),
    });
  });

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();

    render(
      <AlertConfigModal
        config={null}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /create alert/i }));

    expect(screen.getByText('Alert name is required')).toBeInTheDocument();
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  it('creates an alert and reports success through the callback', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <AlertConfigModal
        config={null}
        onClose={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    await user.type(screen.getByLabelText(/alert name/i), 'Important alert');
    await user.clear(screen.getByLabelText(/threshold/i));
    await user.type(screen.getByLabelText(/threshold/i), '10');
    await user.click(screen.getByRole('button', { name: /create alert/i }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'alerts/createConfig',
          payload: expect.objectContaining({
            name: 'Important alert',
            metric_type: 'donations',
            condition: 'exceeds',
            threshold: 10,
          }),
        })
      );
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it('runs test-alert flow and renders the returned result', async () => {
    const user = userEvent.setup();
    dispatchMock.mockReturnValueOnce({
      unwrap: vi.fn().mockResolvedValue({
        would_trigger: true,
        current_value: 15,
        threshold_value: 10,
        message: 'Current value 15 exceeds threshold 10',
      }),
    });

    render(
      <AlertConfigModal
        config={null}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText(/alert name/i), 'Threshold alert');
    await user.clear(screen.getByLabelText(/threshold/i));
    await user.type(screen.getByLabelText(/threshold/i), '10');
    await user.click(screen.getByRole('button', { name: /test alert/i }));

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'alerts/testConfig',
          payload: expect.objectContaining({
            name: 'Threshold alert',
            threshold: 10,
          }),
        })
      );
    });
    expect(screen.getByText('Alert would trigger')).toBeInTheDocument();
  });
});
