import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type * as ReactRouterDomModule from 'react-router-dom';
import { renderWithProviders } from '../../../../test/testUtils';
import PublicEventsPage from '../PublicEventsPage';

const listPublicEventsBySiteMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDomModule>();
  return {
    ...actual,
    useParams: () => ({ site: 'alpha-site' }),
  };
});

vi.mock('../../api/eventsApiClient', () => ({
  eventsApiClient: {
    listPublicEventsBySite: (...args: unknown[]) => listPublicEventsBySiteMock(...args),
  },
}));

describe('PublicEventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads public events and supports load-more pagination', async () => {
    listPublicEventsBySiteMock
      .mockResolvedValueOnce({
        items: [
          {
            event_id: 'event-1',
            event_name: 'Community Dinner',
            description: 'First event',
            event_type: 'community',
            status: 'planned',
            start_date: '2026-04-01T18:00:00.000Z',
            end_date: '2026-04-01T20:00:00.000Z',
            location_name: 'Main Hall',
            city: 'Vancouver',
            state_province: 'BC',
            country: 'Canada',
            capacity: null,
            registered_count: 0,
          },
        ],
        page: { limit: 12, offset: 0, total: 2, has_more: true },
        site: { id: 'site-1', name: 'Alpha Site', subdomain: 'alpha-site', customDomain: null },
      })
      .mockResolvedValueOnce({
        items: [
          {
            event_id: 'event-2',
            event_name: 'Volunteer Shift',
            description: 'Second event',
            event_type: 'volunteer',
            status: 'planned',
            start_date: '2026-04-03T18:00:00.000Z',
            end_date: '2026-04-03T20:00:00.000Z',
            location_name: 'Outreach Hub',
            city: 'Burnaby',
            state_province: 'BC',
            country: 'Canada',
            capacity: null,
            registered_count: 0,
          },
        ],
        page: { limit: 12, offset: 12, total: 2, has_more: false },
        site: { id: 'site-1', name: 'Alpha Site', subdomain: 'alpha-site', customDomain: null },
      });

    renderWithProviders(<PublicEventsPage />);

    await screen.findByText('Community Dinner');

    fireEvent.click(screen.getByRole('button', { name: 'Load more events' }));

    await waitFor(() => {
      expect(listPublicEventsBySiteMock).toHaveBeenCalledWith(
        'alpha-site',
        expect.objectContaining({
          offset: 12,
          limit: 12,
        })
      );
      expect(screen.getByText('Volunteer Shift')).toBeInTheDocument();
    });
  });

  it('refetches when filters change', async () => {
    listPublicEventsBySiteMock.mockResolvedValue({
      items: [],
      page: { limit: 12, offset: 0, total: 0, has_more: false },
      site: { id: 'site-1', name: 'Alpha Site', subdomain: 'alpha-site', customDomain: null },
    });

    renderWithProviders(<PublicEventsPage />);
    await waitFor(() => {
      expect(listPublicEventsBySiteMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.change(screen.getByLabelText('Event type'), {
      target: { value: 'fundraiser' },
    });
    fireEvent.click(screen.getByLabelText('Include past events'));
    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'gala' },
    });

    await waitFor(() => {
      expect(listPublicEventsBySiteMock).toHaveBeenLastCalledWith(
        'alpha-site',
        expect.objectContaining({
          search: 'gala',
          event_type: 'fundraiser',
          include_past: true,
          offset: 0,
          limit: 12,
        })
      );
    }, { timeout: 4000 });
  });
});
