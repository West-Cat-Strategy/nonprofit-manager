import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactForm } from '../contactForm';
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderContactForm = async (component: React.ReactElement) => {
  const store = createTestStore();
  const view = renderWithProviders(component, { store });
  // ContactForm fetches role/options on mount; wait for the effect to settle to avoid act warnings.
  await waitFor(() => expect(mockApi.get).toHaveBeenCalled());
  return view;
};

describe('ContactForm', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockApi.get.mockResolvedValue({ data: { roles: [] } });
  });

  describe('Create Mode', () => {
    it('renders all required form fields', async () => {
      await renderContactForm(<ContactForm mode="create" />);

      expect(screen.getByLabelText(/first name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^mobile$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^home phone$/i)).toBeInTheDocument();
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
      await renderContactForm(<ContactForm mode="create" />);

      const firstNameInput = screen.getByLabelText(/first name \*/i) as HTMLInputElement;
      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      expect(firstNameInput.value).toBe('John');

      const lastNameInput = screen.getByLabelText(/last name \*/i) as HTMLInputElement;
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
      expect(lastNameInput.value).toBe('Doe');

      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'john.doe@example.com' } });
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

      expect(mockNavigate).toHaveBeenCalledWith('/contacts');
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
      email: 'jane.smith@example.com',
      phone: '555-0200',
      mobile_phone: '555-0201',
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
  });
});
