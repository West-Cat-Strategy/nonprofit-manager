import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import IntakeNew from '../../../features/workflows/pages/IntakeNewPage';
import { renderWithProviders } from '../../../test/testUtils';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../../features/contacts/components/contactForm', () => ({
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

vi.mock('../../../components/CaseForm', () => ({
  default: ({ initialData }: { initialData?: { contact_id?: string } }) => (
    <div data-testid="case-form">{initialData?.contact_id || 'no-contact'}</div>
  ),
}));

describe('IntakeNew workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('moves from contact step to case step and allows going back', () => {
    renderWithProviders(<IntakeNew />, { route: '/intake/new' });

    expect(screen.getByRole('button', { name: /mock create contact/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mock create contact/i }));
    expect(screen.getByTestId('case-form')).toHaveTextContent('contact-123');

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    expect(screen.getByRole('button', { name: /mock create contact/i })).toBeInTheDocument();
  });

  it('restores draft step and contact summary from session storage', () => {
    const { unmount } = renderWithProviders(<IntakeNew />, { route: '/intake/new' });

    fireEvent.click(screen.getByRole('button', { name: /mock create contact/i }));

    const rawSnapshot = sessionStorage.getItem('workflow:intake:new');
    expect(rawSnapshot).not.toBeNull();
    expect(rawSnapshot).toContain('"step":"case"');

    unmount();

    renderWithProviders(<IntakeNew />, { route: '/intake/new' });

    expect(screen.getByTestId('case-form')).toHaveTextContent('contact-123');
    expect(screen.getByText(/casey client/i)).toBeInTheDocument();
    expect(screen.getByText(/casey@example.com/i)).toBeInTheDocument();
  });
});
