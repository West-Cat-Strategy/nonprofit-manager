import { fireEvent, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import IntakeNew from '../IntakeNewPage';
import { renderWithProviders } from '../../../../test/testUtils';

const navigateMock = vi.fn();
const getContactMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../../features/contacts/components/contactForm', () => ({
  ContactForm: ({ onCreated }: { onCreated: (contact: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onCreated({
          contact_id: 'contact-123',
          first_name: 'Casey',
          last_name: 'Client',
          email: 'casey@example.com',
        })
      }
    >
      Mock Create Contact
    </button>
  ),
}));

vi.mock('../../../../components/CaseForm', () => ({
  default: ({
    disableContactSelection,
    initialData,
    onCreated,
  }: {
    disableContactSelection?: boolean;
    initialData?: { contact_id?: string };
    onCreated?: (createdCase: { id: string; contact_id?: string }) => void;
  }) => (
    <div data-testid="case-form">
      <div>{initialData?.contact_id || 'no-contact'}</div>
      <div>
        {disableContactSelection ? 'contact-selection-disabled' : 'contact-selection-enabled'}
      </div>
      <button
        type="button"
        onClick={() =>
          onCreated?.({
            id: 'case-123',
            contact_id: initialData?.contact_id,
          })
        }
      >
        Mock Save Case
      </button>
    </div>
  ),
}));

vi.mock('../../../contacts/api/contactsApiClient', () => ({
  contactsApiClient: {
    getContact: (...args: unknown[]) => getContactMock(...args),
  },
}));

describe('IntakeNew workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    getContactMock.mockResolvedValue({
      contact_id: 'contact-123',
      first_name: 'Casey',
      last_name: 'Client',
      email: 'casey@example.com',
    });
  });

  it('moves from contact step to case step and allows going back', () => {
    renderWithProviders(<IntakeNew />, { route: '/intake/new' });

    expect(screen.getByRole('button', { name: /mock create contact/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mock create contact/i }));
    expect(screen.getByTestId('case-form')).toHaveTextContent('contact-123');
    expect(screen.getByTestId('case-form')).toHaveTextContent('contact-selection-disabled');

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByRole('button', { name: /mock create contact/i })).toBeInTheDocument();
  });

  it('restores draft step and contact summary from session storage', async () => {
    const { unmount } = renderWithProviders(<IntakeNew />, { route: '/intake/new' });

    fireEvent.click(screen.getByRole('button', { name: /mock create contact/i }));

    const rawSnapshot = sessionStorage.getItem('workflow:intake:new');
    expect(rawSnapshot).not.toBeNull();
    expect(rawSnapshot).toContain('"step":"case"');

    unmount();

    renderWithProviders(<IntakeNew />, { route: '/intake/new' });

    expect(await screen.findByRole('status')).toHaveTextContent(/checking restored contact/i);
    await waitFor(() => {
      expect(getContactMock).toHaveBeenCalledWith('contact-123');
      expect(screen.getByTestId('case-form')).toHaveTextContent('contact-123');
    });
    expect(screen.getByText(/casey client/i)).toBeInTheDocument();
    expect(screen.getByText(/casey@example.com/i)).toBeInTheDocument();
  });

  it('clears a restored contact that no longer validates', async () => {
    getContactMock.mockRejectedValueOnce(new Error('Contact not found'));
    sessionStorage.setItem(
      'workflow:intake:new',
      JSON.stringify({
        step: 'case',
        createdContact: {
          contact_id: 'stale-contact',
          first_name: 'Stale',
          last_name: 'Contact',
          email: 'stale@example.com',
        },
      })
    );

    renderWithProviders(<IntakeNew />, { route: '/intake/new' });

    await waitFor(() => {
      expect(getContactMock).toHaveBeenCalledWith('stale-contact');
      expect(screen.getByRole('button', { name: /mock create contact/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/restored contact is no longer available/i)).toBeInTheDocument();
    expect(screen.queryByTestId('case-form')).not.toBeInTheDocument();
  });

  it('navigates to the saved case after the intake case save completes', () => {
    renderWithProviders(<IntakeNew />, { route: '/intake/new' });

    fireEvent.click(screen.getByRole('button', { name: /mock create contact/i }));
    fireEvent.click(screen.getByRole('button', { name: /mock save case/i }));

    expect(navigateMock).toHaveBeenCalledWith('/cases/case-123');
    expect(sessionStorage.getItem('workflow:intake:new')).toBeNull();
  });
});
