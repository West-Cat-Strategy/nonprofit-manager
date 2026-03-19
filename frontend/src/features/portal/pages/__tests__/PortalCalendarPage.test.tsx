import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { renderWithProviders } from '../../../../test/testUtils';
import PortalCalendarPage from '../PortalCalendarPage';

const portalGetMock = vi.fn();
const listEventsAllMock = vi.fn();
const listAppointmentsAllMock = vi.fn();
const listAppointmentSlotsMock = vi.fn();
const registerEventMock = vi.fn();
const cancelEventRegistrationMock = vi.fn();
const requestAppointmentMock = vi.fn();
const bookAppointmentSlotMock = vi.fn();
const cancelAppointmentMock = vi.fn();
const setSelectedCaseIdMock = vi.fn();

vi.mock('../../../../services/portalApi', () => ({
  default: {
    get: (...args: unknown[]) => portalGetMock(...args),
  },
}));

vi.mock('../../api/portalApiClient', () => ({
  portalV2ApiClient: {
    listEventsAll: (...args: unknown[]) => listEventsAllMock(...args),
    listAppointmentsAll: (...args: unknown[]) => listAppointmentsAllMock(...args),
    listAppointmentSlots: (...args: unknown[]) => listAppointmentSlotsMock(...args),
    registerEvent: (...args: unknown[]) => registerEventMock(...args),
    cancelEventRegistration: (...args: unknown[]) => cancelEventRegistrationMock(...args),
    requestAppointment: (...args: unknown[]) => requestAppointmentMock(...args),
    bookAppointmentSlot: (...args: unknown[]) => bookAppointmentSlotMock(...args),
    cancelAppointment: (...args: unknown[]) => cancelAppointmentMock(...args),
  },
}));

vi.mock('../../../../hooks/usePersistentPortalCaseContext', () => ({
  usePersistentPortalCaseContext: () => ({
    selectedCaseId: 'case-1',
    setSelectedCaseId: setSelectedCaseIdMock,
    clearSelectedCaseId: vi.fn(),
  }),
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

describe('PortalCalendarPage', () => {
  beforeEach(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);

    portalGetMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          default_case_id: 'case-1',
          selected_case_id: 'case-1',
          cases: [
            {
              case_id: 'case-1',
              case_number: 'CASE-001',
              case_title: 'Housing Support',
              assigned_to: 'staff-1',
              pointperson_first_name: 'Alex',
              pointperson_last_name: 'Rivera',
              is_messageable: true,
              is_default: true,
            },
          ],
        },
      },
    });

    listEventsAllMock.mockResolvedValue([
      {
        id: 'event-1',
        name: 'Community Visit',
        description: 'Meet the outreach team',
        event_type: 'community',
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        location_name: 'Main Hall',
        registration_id: null,
        registration_status: null,
        check_in_token: null,
        checked_in: null,
        check_in_time: null,
      },
    ]);

    listAppointmentsAllMock.mockResolvedValue([
      {
        id: 'appointment-1',
        title: 'Case check-in',
        description: 'Review next steps',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        status: 'confirmed',
        location: 'Main office',
        case_number: 'CASE-001',
        case_title: 'Housing Support',
        request_type: 'manual_request',
      },
    ]);

    listAppointmentSlotsMock.mockResolvedValue({
      selected_case_id: 'case-1',
      selected_pointperson_user_id: 'staff-1',
      slots: [
        {
          id: 'slot-1',
          title: 'Morning slot',
          details: 'Bring your documents',
          location: 'Main office',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          available_count: 1,
          status: 'open',
          case_number: 'CASE-001',
          pointperson_first_name: 'Alex',
          pointperson_last_name: 'Rivera',
        },
      ],
    });

    registerEventMock.mockResolvedValue(undefined);
    cancelEventRegistrationMock.mockResolvedValue(undefined);
    requestAppointmentMock.mockResolvedValue(undefined);
    bookAppointmentSlotMock.mockResolvedValue(undefined);
    cancelAppointmentMock.mockResolvedValue(undefined);
  });

  it('renders a unified calendar and books a slot from the detail panel', async () => {
    renderWithProviders(<PortalCalendarPage />);

    expect(await screen.findByText('Community Visit')).toBeInTheDocument();
    expect(screen.getByText('Case check-in')).toBeInTheDocument();
    expect(screen.getByText('Morning slot')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Morning slot'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Book slot' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Book slot' }));

    await waitFor(() => {
      expect(bookAppointmentSlotMock).toHaveBeenCalledWith('slot-1', { case_id: 'case-1' });
    });
  });
});
