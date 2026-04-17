import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalCasesPage from '../PortalCasesPage';
import PortalDocumentsPage from '../PortalDocumentsPage';
import PortalEventsPage from '../PortalEventsPage';
import PortalNotesPage from '../PortalNotesPage';
import PortalRemindersPage from '../PortalRemindersPage';

const listCasesMock = vi.fn();
let latestDocumentArgs: unknown;
let latestEventArgs: unknown;
let latestNoteArgs: unknown;
let latestReminderArgs: unknown;

const emptyPagedResult = {
  items: [],
  total: 0,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
  refresh: vi.fn(),
  loadMore: vi.fn(),
};

vi.mock('../../api/portalApiClient', () => ({
  portalV2ApiClient: {
    listCases: (...args: unknown[]) => listCasesMock(...args),
  },
}));

vi.mock('../../client/usePortalDocumentsList', () => ({
  default: (args: unknown) => {
    latestDocumentArgs = args;
    return emptyPagedResult;
  },
}));

vi.mock('../../client/usePortalEventsList', () => ({
  default: (args: unknown) => {
    latestEventArgs = args;
    return emptyPagedResult;
  },
}));

vi.mock('../../client/usePortalNotesList', () => ({
  default: (args: unknown) => {
    latestNoteArgs = args;
    return emptyPagedResult;
  },
}));

vi.mock('../../client/usePortalRemindersList', () => ({
  default: (args: unknown) => {
    latestReminderArgs = args;
    return emptyPagedResult;
  },
}));

vi.mock('../../../../hooks/usePersistentPortalCaseContext', () => ({
  usePersistentPortalCaseContext: () => ({
    setSelectedCaseId: vi.fn(),
  }),
}));

describe('Portal list state hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestDocumentArgs = null;
    latestEventArgs = null;
    latestNoteArgs = null;
    latestReminderArgs = null;
    listCasesMock.mockResolvedValue([
      {
        id: 'case-1',
        case_number: 'CASE-001',
        title: 'Housing Support',
        status_name: 'Open',
        case_type_name: 'Housing',
        priority: 'high',
        updated_at: '2026-03-15T18:00:00.000Z',
      },
      {
        id: 'case-2',
        case_number: 'CASE-002',
        title: 'Employment Support',
        status_name: 'Pending',
        case_type_name: 'Employment',
        priority: 'medium',
        updated_at: '2026-03-14T18:00:00.000Z',
      },
    ]);
  });

  it('hydrates portal cases from URL search state', async () => {
    renderWithProviders(<PortalCasesPage />, {
      route: '/portal/cases?search=employment&sort=title&order=asc',
    });

    expect(await screen.findByText('Employment Support')).toBeInTheDocument();
    expect(screen.queryByText('Housing Support')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toHaveValue('employment');
    expect(screen.getByLabelText('Sort')).toHaveValue('title');
    expect(screen.getByLabelText('Order')).toHaveValue('asc');
  });

  it('hydrates portal documents from URL search state', async () => {
    renderWithProviders(<PortalDocumentsPage />, {
      route: '/portal/documents?search=packet&sort=title&order=asc',
    });

    await waitFor(() => {
      expect(latestDocumentArgs).toEqual({
        search: 'packet',
        sort: 'title',
        order: 'asc',
      });
    });
    expect(screen.getByLabelText('Search')).toHaveValue('packet');
    expect(screen.getByLabelText('Sort')).toHaveValue('title');
    expect(screen.getByLabelText('Order')).toHaveValue('asc');
  });

  it('hydrates portal events from URL search state', async () => {
    renderWithProviders(<PortalEventsPage />, {
      route: '/portal/events?search=workshop&sort=name&order=desc',
    });

    await waitFor(() => {
      expect(latestEventArgs).toEqual({
        search: 'workshop',
        sort: 'name',
        order: 'desc',
      });
    });
    expect(screen.getByLabelText('Search')).toHaveValue('workshop');
    expect(screen.getByLabelText('Sort')).toHaveValue('name');
    expect(screen.getByLabelText('Order')).toHaveValue('desc');
  });

  it('hydrates portal notes from URL search state', async () => {
    renderWithProviders(<PortalNotesPage />, {
      route: '/portal/notes?search=intake&sort=note_type&order=asc',
    });

    await waitFor(() => {
      expect(latestNoteArgs).toEqual({
        search: 'intake',
        sort: 'note_type',
        order: 'asc',
      });
    });
    expect(screen.getByLabelText('Search')).toHaveValue('intake');
    expect(screen.getByLabelText('Sort')).toHaveValue('note_type');
    expect(screen.getByLabelText('Order')).toHaveValue('asc');
  });

  it('hydrates portal reminders from URL search state', async () => {
    renderWithProviders(<PortalRemindersPage />, {
      route: '/portal/reminders?search=appointment&sort=title&order=desc',
    });

    await waitFor(() => {
      expect(latestReminderArgs).toEqual({
        search: 'appointment',
        sort: 'title',
        order: 'desc',
      });
    });
    expect(screen.getByLabelText('Search')).toHaveValue('appointment');
    expect(screen.getByLabelText('Sort')).toHaveValue('title');
    expect(screen.getByLabelText('Order')).toHaveValue('desc');
  });
});
