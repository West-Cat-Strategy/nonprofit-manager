import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ContactSuppressionPanel from '../ContactSuppressionPanel';
import { renderWithProviders } from '../../../../test/testUtils';

const listSuppressionsMock = vi.fn();
const createSuppressionMock = vi.fn();
const showErrorMock = vi.fn();
const showSuccessMock = vi.fn();

vi.mock('../../api/contactsApiClient', () => ({
  contactsApiClient: {
    listSuppressions: (...args: unknown[]) => listSuppressionsMock(...args),
    createSuppression: (...args: unknown[]) => createSuppressionMock(...args),
  },
}));

vi.mock('../../../../contexts/useToast', () => ({
  useToast: () => ({
    showError: showErrorMock,
    showSuccess: showSuccessMock,
  }),
}));

describe('ContactSuppressionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSuppressionsMock.mockResolvedValue({
      items: [
        {
          id: 'suppression-1',
          contact_id: 'contact-1',
          channel: 'email',
          reason: 'mailchimp_unsubscribe',
          source: 'mailchimp_webhook',
          source_label: 'Mailchimp webhook',
          provider_event_type: 'unsubscribe',
          evidence: { type: 'unsubscribe' },
          is_active: true,
          created_at: '2026-05-01T12:00:00Z',
          updated_at: '2026-05-01T12:00:00Z',
        },
      ],
      total: 1,
      fatiguePolicy: null,
    });
  });

  it('renders provider suppression evidence and records a staff DNC entry', async () => {
    createSuppressionMock.mockResolvedValue({
      id: 'suppression-2',
      contact_id: 'contact-1',
      channel: 'email',
      reason: 'staff_dnc',
      source: 'staff',
      source_label: 'Staff do-not-contact',
      evidence: { note: 'Client requested no campaign emails' },
      is_active: true,
      created_at: '2026-05-01T13:00:00Z',
      updated_at: '2026-05-01T13:00:00Z',
    });

    renderWithProviders(<ContactSuppressionPanel contactId="contact-1" />);

    expect(await screen.findByText(/mailchimp unsubscribe/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/evidence/i), {
      target: { value: 'Client requested no campaign emails' },
    });
    fireEvent.click(screen.getByRole('button', { name: /record/i }));

    await waitFor(() => {
      expect(createSuppressionMock).toHaveBeenCalledWith('contact-1', {
        channel: 'email',
        reason: 'staff_dnc',
        source: 'staff',
        evidence: 'Client requested no campaign emails',
      });
    });
    expect(await screen.findByText(/client requested no campaign emails/i)).toBeInTheDocument();
    expect(showSuccessMock).toHaveBeenCalledWith('Suppression evidence recorded');
  });
});
