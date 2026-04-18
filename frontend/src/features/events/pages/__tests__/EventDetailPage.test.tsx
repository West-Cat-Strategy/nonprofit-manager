import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type * as ReactRouterDomModule from 'react-router-dom';
import type * as EventsStateModule from '../../state';
import { vi } from 'vitest';
import EventDetailPage from '../EventDetailPage';
import { renderWithProviders } from '../../../../test/testUtils';

const dispatchMock = vi.fn();
const navigateMock = vi.fn();

const mockState = {
  events: {
    detail: {
      loading: false,
      event: {
        event_id: 'event-123',
        event_name: 'Spring Gala',
        description: 'Fundraising night',
        event_type: 'fundraiser',
        status: 'planned',
        is_public: true,
        is_recurring: false,
        next_occurrence_id: undefined,
        start_date: '2026-06-01T18:00:00.000Z',
        end_date: '2026-06-01T20:00:00.000Z',
        registered_count: 3,
        occurrences: [
          {
            occurrence_id: 'occurrence-1',
            event_id: 'event-123',
            series_id: 'event-123',
            occurrence_index: 1,
            occurrence_name: 'Opening night',
            start_date: '2026-06-01T18:00:00.000Z',
            end_date: '2026-06-01T20:00:00.000Z',
            status: 'planned',
            capacity: 50,
            registered_count: 3,
            attended_count: 0,
            location_name: 'Grand Hall',
            address_line1: null,
            address_line2: null,
            city: 'Vancouver',
            state_province: 'BC',
            postal_code: null,
            country: 'Canada',
          },
          {
            occurrence_id: 'occurrence-2',
            event_id: 'event-123',
            series_id: 'event-123',
            occurrence_index: 2,
            occurrence_name: 'Closing night',
            start_date: '2026-06-08T18:00:00.000Z',
            end_date: '2026-06-08T20:00:00.000Z',
            status: 'planned',
            capacity: 50,
            registered_count: 2,
            attended_count: 0,
            location_name: 'Grand Hall',
            address_line1: null,
            address_line2: null,
            city: 'Vancouver',
            state_province: 'BC',
            postal_code: null,
            country: 'Canada',
          },
        ],
      },
    },
    registration: {
      registrations: [],
      loading: false,
      actionLoading: false,
      error: null,
    },
    reminders: {
      sending: false,
      lastSummary: null,
      error: null,
    },
    automation: {
      automations: [],
      loading: false,
      creating: false,
      cancelling: false,
      syncing: false,
      lastCancelledAutomationId: null,
      error: null,
    },
  },
};

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterDomModule>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'event-123' }),
  };
});

vi.mock('../../../../store/hooks', () => ({
  useAppDispatch: () => dispatchMock,
  useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../state', async (importOriginal) => {
  const actual = await importOriginal<typeof EventsStateModule>();
  return {
    ...actual,
    fetchEventDetailV2: (eventId: string) => ({ type: 'eventDetailV2/fetch', payload: eventId }),
    fetchEventRegistrationsV2: (eventId: string) => ({
      type: 'eventRegistrationV2/fetch',
      payload: eventId,
    }),
    fetchEventAutomationsV2: (eventId: string) => ({
      type: 'eventAutomationV2/fetch',
      payload: eventId,
    }),
  };
});

vi.mock('../../../../services/userPreferencesService', () => ({
  getUserTimezoneCached: vi.fn().mockResolvedValue('America/Vancouver'),
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

vi.mock('../../../../hooks/useDocumentMeta', () => ({
  useDocumentMeta: vi.fn(),
}));

vi.mock('../../../../hooks/useConfirmDialog', () => ({
  default: () => ({
    dialogState: { isOpen: false },
    confirm: vi.fn().mockResolvedValue(false),
    handleCancel: vi.fn(),
    handleConfirm: vi.fn(),
  }),
}));

vi.mock('../../../../components/AddToCalendar', () => ({
  default: () => <div data-testid="add-to-calendar" />,
}));

vi.mock('../../../../components/SocialShare', () => ({
  default: () => <div data-testid="social-share" />,
}));

vi.mock('../../../../components/ConfirmDialog', () => ({
  default: () => <div data-testid="confirm-dialog" />,
}));

vi.mock('../../../../components/neo-brutalist/NeoBrutalistLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../components/EventInfoPanel', () => ({
  default: () => <div data-testid="event-info">Event info panel</div>,
}));

vi.mock('../../components/EventSchedulePanel', () => ({
  default: () => <div data-testid="event-schedule">Event schedule panel</div>,
}));

vi.mock('../../components/EventRegistrationsPanel', () => ({
  default: () => <div data-testid="event-registrations">Event registrations panel</div>,
}));

vi.mock('../../api/eventsApiClient', () => ({
  eventsApiClient: {
    getCheckInSettings: vi.fn().mockResolvedValue({
      event_id: 'event-123',
      public_checkin_enabled: false,
      public_checkin_pin_configured: false,
      public_checkin_pin_rotated_at: null,
    }),
    updateCheckInSettings: vi.fn(),
    rotateCheckInPin: vi.fn(),
    scanCheckIn: vi.fn(),
  },
}));

describe('EventDetailPage deferred registrations loading', () => {
  beforeEach(() => {
    dispatchMock.mockClear();
    navigateMock.mockClear();
    mockState.events.detail.event.is_recurring = false;
    mockState.events.detail.event.next_occurrence_id = undefined;
  });

  it('fetches only event detail on initial info-tab render', async () => {
    renderWithProviders(<EventDetailPage />);

    expect(await screen.findByRole('button', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument();

    await waitFor(() => {
      const actionTypes = dispatchMock.mock.calls.map(([action]) => action.type);
      expect(actionTypes).toContain('eventDetailV2/fetch');
      expect(actionTypes).not.toContain('eventRegistrationV2/fetch');
      expect(actionTypes).not.toContain('eventAutomationV2/fetch');
    });
  });

  it('fetches registrations and automations once when registrations tab opens', async () => {
    renderWithProviders(<EventDetailPage />);

    const tabButton = await screen.findByRole('button', { name: /Registrations \(3\)/i });
    fireEvent.click(tabButton);

    await waitFor(() => {
      const actionTypes = dispatchMock.mock.calls.map(([action]) => action.type);
      expect(actionTypes).toContain('eventRegistrationV2/fetch');
      expect(actionTypes).toContain('eventAutomationV2/fetch');
    });

    fireEvent.click(tabButton);

    const registrationDispatchCount = dispatchMock.mock.calls.filter(
      ([action]) => action.type === 'eventRegistrationV2/fetch'
    ).length;
    const automationsDispatchCount = dispatchMock.mock.calls.filter(
      ([action]) => action.type === 'eventAutomationV2/fetch'
    ).length;

    expect(registrationDispatchCount).toBe(1);
    expect(automationsDispatchCount).toBe(1);
  });

  it('renders the shared shell actions for navigation and editing', async () => {
    renderWithProviders(<EventDetailPage />);

    expect(await screen.findByRole('link', { name: /back to events/i })).toHaveAttribute(
      'href',
      '/events'
    );
    expect(screen.getByRole('link', { name: /back to calendar/i })).toHaveAttribute(
      'href',
      '/events/calendar'
    );
    expect(screen.getByRole('link', { name: /edit event/i }).getAttribute('href')).toMatch(
      /^\/events\/event-123\/edit(\?occurrence=occurrence-1)?$/
    );
  });

  it('preserves the calendar return target when opening edit from a calendar-selected occurrence', async () => {
    const calendarReturnTo = '/events?month=2026-05&date=2026-05-12&entry=event%3Aevent-123%3Aoccurrence-2';
    const currentDetailTarget = `/events/event-123?occurrence=occurrence-2&return_to=${encodeURIComponent(calendarReturnTo)}`;

    renderWithProviders(<EventDetailPage />, {
      route: currentDetailTarget,
    });

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /back to events/i })).toHaveAttribute(
        'href',
        calendarReturnTo
      );
    });

    expect(screen.getByRole('link', { name: /back to calendar/i })).toHaveAttribute(
      'href',
      calendarReturnTo
    );
    expect(screen.getByRole('link', { name: /edit event/i })).toHaveAttribute(
      'href',
      `/events/event-123/edit?occurrence=occurrence-2&return_to=${encodeURIComponent(currentDetailTarget)}`
    );
  });

  it('uses the selected occurrence registration count before the registrations tab loads', async () => {
    mockState.events.detail.event.is_recurring = true;
    mockState.events.detail.event.next_occurrence_id = 'occurrence-2';

    renderWithProviders(<EventDetailPage />);

    expect(
      await screen.findByRole('button', { name: /registrations \(2\)/i })
    ).toBeInTheDocument();
  });
});
