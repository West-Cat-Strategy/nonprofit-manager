import type { ReactElement } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../test/testUtils';
import AccountList from '../people/accounts/AccountList';
import ContactList from '../people/contacts/ContactList';
import VolunteerList from '../people/volunteers/VolunteerList';
import EventList from '../engagement/events/EventList';
import TaskList from '../engagement/tasks/TaskList';
import DonationList from '../finance/donations/DonationList';
import api from '../../services/api';

vi.mock('../../services/api');

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
};

type SmokeCase = {
  name: string;
  route: string;
  page: ReactElement;
  heading: string;
  primaryActionPattern: RegExp;
};

const smokeCases: SmokeCase[] = [
  {
    name: 'accounts',
    route: '/accounts',
    page: <AccountList />,
    heading: 'Accounts',
    primaryActionPattern: /new account/i,
  },
  {
    name: 'contacts',
    route: '/contacts',
    page: <ContactList />,
    heading: 'People',
    primaryActionPattern: /new person/i,
  },
  {
    name: 'volunteers',
    route: '/volunteers',
    page: <VolunteerList />,
    heading: 'Volunteers',
    primaryActionPattern: /new volunteer/i,
  },
  {
    name: 'events',
    route: '/events',
    page: <EventList />,
    heading: 'Events',
    primaryActionPattern: /create event/i,
  },
  {
    name: 'tasks',
    route: '/tasks',
    page: <TaskList />,
    heading: 'Tasks',
    primaryActionPattern: /new task/i,
  },
  {
    name: 'donations',
    route: '/donations',
    page: <DonationList />,
    heading: 'Donations',
    primaryActionPattern: /record donation/i,
  },
];

describe('Route UX smoke', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockApi.get.mockImplementation((url: string) => {
      if (url.startsWith('/accounts')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url === '/contacts/tags') {
        return Promise.resolve({ data: { tags: [] } });
      }
      if (url.startsWith('/contacts')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/volunteers')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/events')) {
        return Promise.resolve({
          data: {
            data: [],
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }
      if (url.startsWith('/tasks')) {
        return Promise.resolve({
          data: {
            tasks: [],
            summary: null,
            pagination: { total: 0, page: 1, limit: 20, pages: 0 },
          },
        });
      }
      if (url.startsWith('/donations')) {
        return Promise.resolve({
          data: {
            data: [],
            summary: { total_amount: 0, average_amount: 0 },
            pagination: { total: 0, page: 1, limit: 20, total_pages: 0 },
          },
        });
      }

      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it.each(smokeCases)(
    'renders H1 and primary action without console errors for $name route',
    async ({ route, page, heading, primaryActionPattern }) => {
      renderWithProviders(page, { route });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
      });
      expect(
        screen.getAllByRole('button', {
          name: primaryActionPattern,
        }).length
      ).toBeGreaterThan(0);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    }
  );
});
