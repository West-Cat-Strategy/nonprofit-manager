import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ContactCommunicationsPanel from '../ContactCommunicationsPanel';
import { renderWithProviders } from '../../../../test/testUtils';

const listCommunicationsMock = vi.fn();
const sendAppointmentReminderMock = vi.fn();
const showErrorMock = vi.fn();
const showSuccessMock = vi.fn();

vi.mock('../../api/contactsApiClient', () => ({
  contactsApiClient: {
    listCommunications: (...args: unknown[]) => listCommunicationsMock(...args),
  },
}));

vi.mock('../../../cases/api/casesApiClient', () => ({
  casesApiClient: {
    sendCaseAppointmentReminder: (...args: unknown[]) => sendAppointmentReminderMock(...args),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showError: showErrorMock,
    showSuccess: showSuccessMock,
  }),
}));

const communicationsPayload = {
  items: [
    {
      id: 'comm-1',
      channel: 'email',
      source_type: 'appointment_reminder',
      delivery_status: 'sent',
      recipient: 'client@example.com',
      error_message: null,
      message_preview: 'Reminder for your upcoming appointment',
      trigger_type: 'manual',
      sent_at: '2026-03-15T12:00:00.000Z',
      appointment_id: 'appointment-1',
      case_id: 'case-1',
      event_id: null,
      registration_id: null,
      source_label: 'Housing intake appointment',
      source_subtitle: 'Mar 18, 2026 at Main Office',
      action: {
        type: 'send_appointment_reminder',
        label: 'Send email reminder again',
        appointment_id: 'appointment-1',
        case_id: 'case-1',
      },
    },
    {
      id: 'comm-2',
      channel: 'sms',
      source_type: 'event_reminder',
      delivery_status: 'failed',
      recipient: '+15555550100',
      error_message: 'Phone number missing opt-in',
      message_preview: 'See you at the fundraiser tonight',
      trigger_type: 'automated',
      sent_at: '2026-03-14T16:00:00.000Z',
      appointment_id: null,
      case_id: null,
      event_id: 'event-1',
      registration_id: 'registration-1',
      source_label: 'Spring Fundraiser',
      source_subtitle: 'Mar 20, 2026',
      action: {
        type: 'open_event',
        label: 'Open event',
        event_id: 'event-1',
      },
    },
  ],
  total: 2,
  filters: {},
};

describe('ContactCommunicationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCommunicationsMock.mockResolvedValue(communicationsPayload);
  });

  it('renders communications and supports resend actions', async () => {
    renderWithProviders(<ContactCommunicationsPanel contactId="contact-1" />);

    expect(await screen.findByText(/housing intake appointment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send email reminder again/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open event/i })).toHaveAttribute('href', '/events/event-1');

    sendAppointmentReminderMock.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole('button', { name: /send email reminder again/i }));

    await waitFor(() => {
      expect(sendAppointmentReminderMock).toHaveBeenCalledWith('appointment-1', {
        sendEmail: true,
        sendSms: false,
      });
    });

    expect(showSuccessMock).toHaveBeenCalledWith('Reminder sent');
  });

  it('updates filters before refetching communications', async () => {
    renderWithProviders(<ContactCommunicationsPanel contactId="contact-1" />);

    await screen.findByText(/spring fundraiser/i);

    fireEvent.change(screen.getByLabelText(/source/i), {
      target: { value: 'event_reminder' },
    });

    await waitFor(() => {
      expect(listCommunicationsMock).toHaveBeenLastCalledWith('contact-1', {
        channel: undefined,
        source_type: 'event_reminder',
        delivery_status: undefined,
        limit: 100,
      });
    });
  });

  it('clears filters and refetches the communications log', async () => {
    renderWithProviders(<ContactCommunicationsPanel contactId="contact-1" />);

    await screen.findByText(/spring fundraiser/i);

    fireEvent.change(screen.getByLabelText(/source/i), {
      target: { value: 'event_reminder' },
    });

    await waitFor(() => {
      expect(listCommunicationsMock).toHaveBeenLastCalledWith('contact-1', {
        channel: undefined,
        source_type: 'event_reminder',
        delivery_status: undefined,
        limit: 100,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    await waitFor(() => {
      expect(listCommunicationsMock).toHaveBeenLastCalledWith('contact-1', {
        channel: undefined,
        source_type: undefined,
        delivery_status: undefined,
        limit: 100,
      });
    });
  });
});
