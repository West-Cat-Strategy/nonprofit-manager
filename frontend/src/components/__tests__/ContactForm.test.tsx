import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ContactForm } from '../ContactForm';
import contactsReducer from '../../store/slices/contactsSlice';
import accountsReducer from '../../store/slices/accountsSlice';
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

const createTestStore = () => {
  return configureStore({
    reducer: {
      contacts: contactsReducer,
      accounts: accountsReducer,
    },
  });
};

const renderWithProviders = async (component: React.ReactElement) => {
  const store = createTestStore();
  const view = render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>
  );
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
      await renderWithProviders(<ContactForm mode="create" />);

      expect(screen.getByLabelText(/first name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^phone$/i)).toBeInTheDocument();
    });

    it('shows Create Contact button', async () => {
      await renderWithProviders(<ContactForm mode="create" />);
      expect(screen.getByRole('button', { name: /create contact/i })).toBeInTheDocument();
    });

    it('has empty form fields initially', async () => {
      await renderWithProviders(<ContactForm mode="create" />);

      const firstNameInput = screen.getByLabelText(/first name \*/i) as HTMLInputElement;
      expect(firstNameInput.value).toBe('');

      const lastNameInput = screen.getByLabelText(/last name \*/i) as HTMLInputElement;
      expect(lastNameInput.value).toBe('');
    });

    it('allows user to fill out basic contact info', async () => {
      await renderWithProviders(<ContactForm mode="create" />);

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
      await renderWithProviders(<ContactForm mode="create" />);

      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
      expect(emailInput.type).toBe('email');
    });

    it('has cancel button that navigates back', async () => {
      await renderWithProviders(<ContactForm mode="create" />);

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
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-0200',
      mobile_phone: '555-0201',
      job_title: 'Director',
      department: 'Operations',
      preferred_contact_method: 'email',
      do_not_email: false,
      do_not_phone: false,
      is_active: true,
    };

    it('shows Update Contact button in edit mode', async () => {
      await renderWithProviders(<ContactForm mode="edit" contact={mockContact} />);
      expect(screen.getByRole('button', { name: /update contact/i })).toBeInTheDocument();
    });

    it('populates form fields with contact data', async () => {
      await renderWithProviders(<ContactForm mode="edit" contact={mockContact} />);

      const firstNameInput = screen.getByLabelText(/first name \*/i) as HTMLInputElement;
      expect(firstNameInput.value).toBe('Jane');

      const lastNameInput = screen.getByLabelText(/last name \*/i) as HTMLInputElement;
      expect(lastNameInput.value).toBe('Smith');

      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
      expect(emailInput.value).toBe('jane.smith@example.com');
    });

    it('allows user to modify form fields', async () => {
      await renderWithProviders(<ContactForm mode="edit" contact={mockContact} />);

      const firstNameInput = screen.getByLabelText(/first name \*/i) as HTMLInputElement;
      fireEvent.change(firstNameInput, { target: { value: 'Janet' } });
      expect(firstNameInput.value).toBe('Janet');
    });
  });

  describe('Contact Method Preferences', () => {
    it('allows selecting preferred contact method', async () => {
      await renderWithProviders(<ContactForm mode="create" />);

      const preferredMethodSelect = screen.getByLabelText(
        /preferred contact method/i
      ) as HTMLSelectElement;
      fireEvent.change(preferredMethodSelect, { target: { value: 'phone' } });
      expect(preferredMethodSelect.value).toBe('phone');
    });

    it('shows email as default preferred method', async () => {
      await renderWithProviders(<ContactForm mode="create" />);

      const preferredMethodSelect = screen.getByLabelText(
        /preferred contact method/i
      ) as HTMLSelectElement;
      expect(preferredMethodSelect.value).toBe('email');
    });
  });

  describe('Professional Information', () => {
    it('allows entering job title', async () => {
      await renderWithProviders(<ContactForm mode="create" />);

      const titleInput = screen.getByLabelText(/job title/i) as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'CEO' } });
      expect(titleInput.value).toBe('CEO');
    });

    it('allows entering department', async () => {
      await renderWithProviders(<ContactForm mode="create" />);

      const deptInput = screen.getByLabelText(/department/i) as HTMLInputElement;
      fireEvent.change(deptInput, { target: { value: 'Marketing' } });
      expect(deptInput.value).toBe('Marketing');
    });
  });

  describe('Form Validation', () => {
    it('validates required first name field', async () => {
      await renderWithProviders(<ContactForm mode="create" />);

      const submitButton = screen.getByRole('button', { name: /create contact/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('validates required last name field', async () => {
      await renderWithProviders(<ContactForm mode="create" />);

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
