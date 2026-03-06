import { screen, waitFor } from '@testing-library/react';
import type * as AlertsStateModule from '../../state';
import { vi } from 'vitest';
import AlertsConfigPage from '../AlertsConfigPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn(() => Promise.resolve());

const mockState = {
  alerts: {
    configs: [
      {
        id: 'alert-1',
        name: 'Donation threshold',
        metric_type: 'donation_amount',
        condition: 'drops_below',
        threshold: 100,
        frequency: 'daily',
        channels: ['email'],
        severity: 'high',
        enabled: true,
        last_triggered: '2026-03-05T18:00:00.000Z',
      },
    ],
    currentConfig: null,
    instances: [],
    stats: {
      total_alerts: 1,
      active_alerts: 1,
      triggered_today: 0,
      triggered_this_week: 2,
      triggered_this_month: 3,
      by_severity: {
        low: 0,
        medium: 0,
        high: 1,
        critical: 0,
      },
      by_metric: {
        donation_amount: 1,
      },
    },
    loading: false,
    saving: false,
    error: null,
  },
};

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../state', async () => {
  const actual = await vi.importActual<typeof AlertsStateModule>('../../state');
  return {
    ...actual,
    fetchAlertConfigs: () => ({ type: 'alerts/fetchConfigs' }),
    fetchAlertStats: () => ({ type: 'alerts/fetchStats' }),
    deleteAlertConfig: (id: string) => ({ type: 'alerts/deleteConfig', payload: id }),
    toggleAlertConfig: (id: string) => ({ type: 'alerts/toggleConfig', payload: id }),
    setCurrentConfig: (payload: unknown) => ({ type: 'alerts/setCurrentConfig', payload }),
  };
});

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: {},
    confirm: vi.fn().mockResolvedValue(true),
    handleConfirm: vi.fn(),
    handleCancel: vi.fn(),
  }),
  confirmPresets: {
    delete: (label: string) => ({ label }),
  },
}));

vi.mock('../../../../components/ConfirmDialog', () => ({
  default: () => null,
}));

describe('AlertsConfigPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads alert configs and stats on mount and renders the canonical config list', async () => {
    renderWithProviders(<AlertsConfigPage />, { route: '/alerts' });

    await waitFor(() => {
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'alerts/fetchConfigs' })
      );
      expect(dispatchMock).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'alerts/fetchStats' })
      );
    });

    expect(screen.getByText('Donation threshold')).toBeInTheDocument();
    expect(screen.getByText('Donation Amount')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /review history/i })).toHaveAttribute(
      'href',
      '/alerts/history'
    );
    expect(screen.getByRole('link', { name: /view triggered alerts/i })).toHaveAttribute(
      'href',
      '/alerts/instances'
    );
  });
});
