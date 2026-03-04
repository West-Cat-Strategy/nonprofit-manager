import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PortalDocuments from '../../PortalDocuments';
import PortalReminders from '../../PortalReminders';
import { renderWithProviders } from '../../../test/testUtils';

const getMock = vi.fn();

vi.mock('../../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

const paged = <T,>(items: T[], hasMore = false, total = items.length, offset = 0) => ({
  data: {
    success: true,
    data: {
      items,
      page: {
        limit: 20,
        offset,
        has_more: hasMore,
        total,
      },
    },
  },
});

describe('Portal resource paged lists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests documents with server-side search/sort/order params', async () => {
    getMock.mockResolvedValue(
      paged([
        {
          id: 'doc-1',
          original_name: 'budget.pdf',
          document_type: 'report',
          title: 'Budget',
          description: 'Annual budget',
          file_size: 1024,
          mime_type: 'application/pdf',
          created_at: new Date().toISOString(),
        },
      ])
    );

    renderWithProviders(<PortalDocuments />);

    await waitFor(() => {
      expect(screen.getByText(/^Budget$/i)).toBeInTheDocument();
    });

    expect(getMock).toHaveBeenCalledWith('/v2/portal/documents', {
      params: {
        search: undefined,
        sort: 'created_at',
        order: 'desc',
        limit: 20,
        offset: 0,
      },
    });

    fireEvent.change(screen.getByLabelText(/search/i), {
      target: { value: 'annual' },
    });

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/v2/portal/documents', {
        params: {
          search: 'annual',
          sort: 'created_at',
          order: 'desc',
          limit: 20,
          offset: 0,
        },
      });
    });
  });

  it('loads next reminder page when has_more is true', async () => {
    getMock.mockImplementation((url: string, config?: { params?: { offset?: number } }) => {
      if (url !== '/v2/portal/reminders') {
        return Promise.resolve(paged([]));
      }

      if (config?.params?.offset === 1) {
        return Promise.resolve(
          paged(
            [{ id: 'r2', type: 'appointment', title: 'Case Meeting', date: new Date().toISOString() }],
            false,
            2,
            1
          )
        );
      }

      return Promise.resolve(
        paged(
          [{ id: 'r1', type: 'event', title: 'Town Hall', date: new Date().toISOString() }],
          true,
          2,
          0
        )
      );
    });

    renderWithProviders(<PortalReminders />);

    await waitFor(() => {
      expect(screen.getByText(/town hall/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /load more reminders/i }));

    await waitFor(() => {
      expect(getMock).toHaveBeenLastCalledWith('/v2/portal/reminders', {
        params: {
          search: undefined,
          sort: 'date',
          order: 'asc',
          limit: 20,
          offset: 1,
        },
      });
    });
  });
});
