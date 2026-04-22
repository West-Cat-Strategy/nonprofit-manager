import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContactForm } from '../../features/contacts/components/contactForm';
import { renderWithProviders, createTestStore } from '../../test/testUtils';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

const mockApi = api as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> };
const showSuccessMock = vi.fn();
const showErrorMock = vi.fn();

vi.mock('../../contexts/useToast', () => ({
  useToast: () => ({
    showSuccess: showSuccessMock,
    showError: showErrorMock,
  }),
}));

const mockRoles = [
  { id: 'role-staff', name: 'Staff', description: 'Internal team member' },
  { id: 'role-board', name: 'Board Member', description: 'Board role' },
  { id: 'role-client', name: 'Client', description: 'Client role' },
];

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderContactForm = async (
  component: React.ReactElement,
  options: { route?: string } = {}
) => {
  const store = createTestStore();
  const view = renderWithProviders(component, { store, route: options.route });
  // ContactForm fetches role/options on mount; wait for the effect to settle to avoid act warnings.
  await waitFor(() => expect(mockApi.get).toHaveBeenCalled());
  return view;
};

describe('ContactForm', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    showSuccessMock.mockReset();
    showErrorMock.mockReset();
    mockApi.post.mockReset();
    mockApi.put.mockReset();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    mockApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          contact_id: 'contact-1',
          first_name: 'Created',
          last_name: 'Contact',
          phn: null,
          roles: [],
        },
      },
    });
    mockApi.put.mockResolvedValue({
      data: {
        success: true,
        data: {
          contact_id: 'contact-1',
          first_name: 'Updated',
          last_name: 'Contact',
          phn: null,
          roles: [],
        },
      },
    });
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/v2/contacts/roles') {
        return Promise.resolve({ data: { success: true, data: mockRoles } });
      }
      if (url === '/v2/contacts/tags') {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      if (url.startsWith('/v2/contacts/') && url.endsWith('/relationships')) {
        return Promise.resolve({ data: { success: true, data: [] } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  describe('Create Mode', () => {
    it('renders all required form fields', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      expect(screen.getByLabelText(/first name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^mobile phone$/i)).toBeInTheDocument();
    });

    it('shows Create Contact button', async () => {
      await renderContactForm(<ContactForm mode="create" />);
      expect(screen.getByRole('button', { name: /create contact/i })).toBeInTheDocument();
    });

    it('has empty form fields initially', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      const firstNameInput = screen.getByLabelText(/first name \*/i) as HTMLInputElement;
      expect(firstNameInput.value).toBe('');

      const lastNameInput = screen.getByLabelText(/last name \*/i) as HTMLInputElement;
      expect(lastNameInput.value).toBe('');
    });

    it('allows user to fill out basic contact info', async () => {
      const user = userEvent.setup();
      await renderContactForm(<ContactForm mode="create" />);

      const firstNameInput = screen.getByLabelText(/first name \*/i) as HTMLInputElement;
      await user.type(firstNameInput, 'John');
      expect(firstNameInput.value).toBe('John');

      const lastNameInput = screen.getByLabelText(/last name \*/i) as HTMLInputElement;
      await user.type(lastNameInput, 'Doe');
      expect(lastNameInput.value).toBe('Doe');

      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
      await user.type(emailInput, 'john.doe@example.com');
      expect(emailInput.value).toBe('john.doe@example.com');
    });

    it('validates email input type', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
      expect(emailInput.type).toBe('email');
    });

    it('has cancel button that navigates back', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/contacts', { replace: true });
    });

    it('loads roles from the v2 contacts roles endpoint', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      expect(mockApi.get).toHaveBeenCalledWith('/v2/contacts/roles');
      expect(screen.getByText('Staff')).toBeInTheDocument();
      expect(screen.getByText('Board Member')).toBeInTheDocument();
      expect(screen.getByText('Client')).toBeInTheDocument();
    });

    it('falls back to no roles when the roles payload is malformed', async () => {
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/v2/contacts/roles') {
          return Promise.resolve({ data: { success: true, data: {} } });
        }
        if (url === '/v2/contacts/tags') {
          return Promise.resolve({ data: { success: true, data: [] } });
        }
        if (url.startsWith('/v2/contacts/') && url.endsWith('/relationships')) {
          return Promise.resolve({ data: { success: true, data: [] } });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      await renderContactForm(<ContactForm mode="create" />);

      expect(screen.getByRole('button', { name: /create contact/i })).toBeInTheDocument();
      expect(screen.getByText(/no roles available\./i)).toBeInTheDocument();
    });

    it('loads roles from the v2 contacts roles endpoint', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      expect(mockApi.get).toHaveBeenCalledWith('/v2/contacts/roles');
      expect(screen.getByText('Staff')).toBeInTheDocument();
      expect(screen.getByText('Board Member')).toBeInTheDocument();
      expect(screen.getByText('Client')).toBeInTheDocument();
    });

    it('falls back to no roles when the roles payload is malformed', async () => {
      mockApi.get.mockImplementation((url: string) => {
        if (url === '/v2/contacts/roles') {
          return Promise.resolve({ data: { success: true, data: {} } });
        }
        if (url === '/v2/contacts/tags') {
          return Promise.resolve({ data: { success: true, data: [] } });
        }
        if (url.startsWith('/v2/contacts/') && url.endsWith('/relationships')) {
          return Promise.resolve({ data: { success: true, data: [] } });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      await renderContactForm(<ContactForm mode="create" />);

      expect(screen.getByRole('button', { name: /create contact/i })).toBeInTheDocument();
      expect(screen.getByText(/no roles available\./i)).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const mockContact = {
      contact_id: '456',
      account_id: '123',
      roles: ['Primary Contact'],
      first_name: 'Jane',
      preferred_name: 'Jay',
      last_name: 'Smith',
      phn: null,
      email: 'jane.smith@example.com',
      phone: '555-0200',
      mobile_phone: '555-0201',
      birth_date: '1985-04-06T00:00:00.000Z',
      preferred_contact_method: 'email',
      do_not_email: false,
      do_not_phone: false,
      tags: [],
      is_active: true,
    };

    it('shows Update Contact button in edit mode', async () => {
      await renderContactForm(<ContactForm mode="edit" contact={mockContact} />);
      expect(screen.getByRole('button', { name: /update contact/i })).toBeInTheDocument();
    });

    it('populates form fields with contact data', async () => {
      await renderContactForm(<ContactForm mode="edit" contact={mockContact} />);

      const firstNameInput = screen.getByLabelText(/first name \*/i) as HTMLInputElement;
      expect(firstNameInput.value).toBe('Jane');

      const lastNameInput = screen.getByLabelText(/last name \*/i) as HTMLInputElement;
      expect(lastNameInput.value).toBe('Smith');

      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
      expect(emailInput.value).toBe('jane.smith@example.com');
    });

    it('allows user to modify form fields', async () => {
      await renderContactForm(<ContactForm mode="edit" contact={mockContact} />);

      const firstNameInput = screen.getByLabelText(/first name \*/i) as HTMLInputElement;
      fireEvent.change(firstNameInput, { target: { value: 'Janet' } });
      expect(firstNameInput.value).toBe('Janet');
    });

    it('normalizes birth date values for the date input in edit mode', async () => {
      await renderContactForm(<ContactForm mode="edit" contact={mockContact} />);

      const birthDateInput = screen.getByLabelText(/date of birth/i) as HTMLInputElement;
      expect(birthDateInput.value).toBe('1985-04-06');
    });
  });

  describe('Contact Method Preferences', () => {
    it('allows selecting preferred contact method', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      const preferredMethodSelect = screen.getByLabelText(
        /preferred contact method/i
      ) as HTMLSelectElement;
      fireEvent.change(preferredMethodSelect, { target: { value: 'phone' } });
      expect(preferredMethodSelect.value).toBe('phone');
    });

    it('shows email as default preferred method', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      const preferredMethodSelect = screen.getByLabelText(
        /preferred contact method/i
      ) as HTMLSelectElement;
      expect(preferredMethodSelect.value).toBe('email');
    });
  });

  describe('Personal Information', () => {
    it('allows entering preferred name', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      const preferredNameInput = screen.getByLabelText(/preferred name/i) as HTMLInputElement;
      fireEvent.change(preferredNameInput, { target: { value: 'Johnny' } });
      expect(preferredNameInput.value).toBe('Johnny');
    });

    it('renders PHN field', async () => {
      await renderContactForm(<ContactForm mode="create" />);
      expect(screen.getByLabelText(/personal health number \(phn\)/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates required first name field', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('validates required last name field', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      const firstNameInput = screen.getByLabelText(/first name \*/i);
      fireEvent.change(firstNameInput, { target: { value: 'John' } });

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('shows validation message when PHN is not 10 digits', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      fireEvent.change(screen.getByLabelText(/first name \*/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name \*/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/personal health number \(phn\)/i), {
        target: { value: '12345' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

      expect(await screen.findByText(/phn must contain exactly 10 digits/i)).toBeInTheDocument();
    });

    it('submits normalized 10-digit PHN payload', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      fireEvent.change(screen.getByLabelText(/first name \*/i), { target: { value: 'John' } });
      fireEvent.change(screen.getByLabelText(/last name \*/i), { target: { value: 'Doe' } });
      fireEvent.change(screen.getByLabelText(/personal health number \(phn\)/i), {
        target: { value: '123-456-7890' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith(
          '/v2/contacts',
          expect.objectContaining({ phn: '1234567890' })
        );
      });
    });

    it('requires email when assigning staff roles and focuses the email field', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      fireEvent.change(screen.getByLabelText(/first name \*/i), { target: { value: 'Jamie' } });
      fireEvent.change(screen.getByLabelText(/last name \*/i), { target: { value: 'Staffer' } });
      fireEvent.click(screen.getByText('Staff'));
      fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

      expect(
        await screen.findByText(/email is required when assigning staff or executive director roles/i)
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByLabelText(/^email$/i)).toHaveFocus();
      });
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('requires phone and mobile phone to be different and focuses the phone field', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      fireEvent.change(screen.getByLabelText(/first name \*/i), { target: { value: 'Jamie' } });
      fireEvent.change(screen.getByLabelText(/last name \*/i), { target: { value: 'Phones' } });
      fireEvent.change(screen.getByLabelText(/^phone$/i), { target: { value: '555-123-4567' } });
      fireEvent.change(screen.getByLabelText(/^mobile phone$/i), { target: { value: '(555) 123-4567' } });
      fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

      const messages = await screen.findAllByText(/phone and mobile phone must be different/i);
      expect(messages).toHaveLength(2);
      await waitFor(() => {
        expect(screen.getByLabelText(/^phone$/i)).toHaveFocus();
      });
      expect(mockApi.post).not.toHaveBeenCalled();
    });

    it('omits malformed account ids while preserving hydrated names and return navigation', async () => {
      await renderContactForm(<ContactForm mode="create" />, {
        route: '/contacts/new?first_name=Ana&last_name=Bell&account_id=not-a-uuid&return_to=contact-123',
      });

      expect(screen.getByLabelText(/first name \*/i)).toHaveValue('Ana');
      expect(screen.getByLabelText(/last name \*/i)).toHaveValue('Bell');

      fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledTimes(1);
      });

      const [, payload] = mockApi.post.mock.calls[0];
      expect(payload).not.toHaveProperty('account_id');
      expect(mockNavigate).toHaveBeenCalledWith('/contacts/contact-123/edit');
    });

    it('shows backend save errors inline and via toast and focuses the submit banner', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          data: {
            error: {
              message: 'Validation failed',
              details: {
                issues: [{ path: 'email', message: 'already exists' }],
              },
            },
          },
        },
      });

      await renderContactForm(<ContactForm mode="create" />);

      fireEvent.change(screen.getByLabelText(/first name \*/i), { target: { value: 'Jamie' } });
      fireEvent.change(screen.getByLabelText(/last name \*/i), { target: { value: 'Server' } });
      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'jamie@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

      const banner = await screen.findByText('email: already exists');

      expect(showErrorMock).toHaveBeenCalledWith('email: already exists');
      await waitFor(() => {
        expect(banner).toHaveFocus();
      });
    });

    it('clears submit errors after the user edits the form again', async () => {
      mockApi.post.mockRejectedValueOnce({
        response: {
          data: {
            error: {
              code: 'validation_error',
              message: 'Account not found',
            },
          },
        },
      });

      await renderContactForm(<ContactForm mode="create" />);

      fireEvent.change(screen.getByLabelText(/first name \*/i), { target: { value: 'Jamie' } });
      fireEvent.change(screen.getByLabelText(/last name \*/i), { target: { value: 'Retry' } });
      fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'jamie@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /create contact/i }));

      expect(await screen.findByText(/account not found/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/first name \*/i), { target: { value: 'Jamie 2' } });

      await waitFor(() => {
        expect(screen.queryByText(/account not found/i)).not.toBeInTheDocument();
      });
    });
  });
});
