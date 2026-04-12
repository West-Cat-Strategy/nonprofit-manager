import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReconciliationDashboardPage from '../ReconciliationDashboardPage';
import { renderWithProviders } from '../../../../test/testUtils';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

describe('ReconciliationDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/reconciliation/dashboard') {
        return Promise.resolve({
          data: {
            stats: null,
            latest_reconciliation: null,
          },
        });
      }

      if (url === '/reconciliation') {
        return Promise.resolve({
          data: {
            reconciliations: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 10,
              total_pages: 0,
            },
          },
        });
      }

      if (url === '/reconciliation/discrepancies/all') {
        return Promise.resolve({
          data: {
            discrepancies: [],
            pagination: {
              total: 0,
              page: 1,
              limit: 10,
              total_pages: 0,
            },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });
  });

  it('keeps the notes field stable while typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReconciliationDashboardPage />, {
      route: '/finance/reconciliation',
    });

    await screen.findByRole('button', { name: /new reconciliation/i });
    await user.click(screen.getByRole('button', { name: /new reconciliation/i }));

    const modalTitle = await screen.findByText('Create New Reconciliation');
    const modalRoot = modalTitle.closest('div.fixed') as HTMLElement;
    expect(modalRoot).toBeTruthy();

    const notesTextarea = modalRoot.querySelector('textarea') as HTMLTextAreaElement;
    await user.type(notesTextarea, 'Investigate provider mismatch');

    expect(notesTextarea.value).toBe('Investigate provider mismatch');
  });
});
