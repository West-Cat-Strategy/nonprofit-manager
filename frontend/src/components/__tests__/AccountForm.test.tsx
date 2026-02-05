import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { AccountForm } from '../AccountForm';
import { renderWithProviders, createTestStore } from '../../test/testUtils';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderAccountForm = (component: React.ReactElement) => {
  const store = createTestStore();
  return renderWithProviders(component, { store });
};

describe('AccountForm', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Create Mode', () => {
    it('renders all form fields', () => {
      renderAccountForm(<AccountForm mode="create" />);

      expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/account type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
    });

    it('shows Create Account title', () => {
      renderAccountForm(<AccountForm mode="create" />);
      expect(screen.getByText(/create account/i)).toBeInTheDocument();
    });

    it('has empty form fields initially', () => {
      renderAccountForm(<AccountForm mode="create" />);

      const accountNameInput = screen.getByLabelText(/account name/i) as HTMLInputElement;
      expect(accountNameInput.value).toBe('');
    });

    it('validates required fields on submit', async () => {
      renderAccountForm(<AccountForm mode="create" />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Form should not navigate if required fields are empty
      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('allows user to fill out the form', () => {
      renderAccountForm(<AccountForm mode="create" />);

      const accountNameInput = screen.getByLabelText(/account name/i) as HTMLInputElement;
      fireEvent.change(accountNameInput, { target: { value: 'Test Organization' } });
      expect(accountNameInput.value).toBe('Test Organization');

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      expect(emailInput.value).toBe('test@example.com');
    });

    it('validates email format', async () => {
      renderAccountForm(<AccountForm mode="create" />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        const emailInputElement = emailInput as HTMLInputElement;
        expect(emailInputElement.validity.valid).toBe(false);
      });
    });

    it('validates URL format for website', async () => {
      renderAccountForm(<AccountForm mode="create" />);

      // Fill required fields first
      const accountNameInput = screen.getByLabelText(/account name/i);
      fireEvent.change(accountNameInput, { target: { value: 'Test Account' } });

      // Enter invalid URL
      const websiteInput = screen.getByLabelText(/website/i);
      fireEvent.change(websiteInput, { target: { value: 'not-a-url' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      // Check for validation error message
      await waitFor(() => {
        expect(screen.getByText(/website must start with http/i)).toBeInTheDocument();
      });
    });

    it('has cancel button that navigates back', () => {
      renderAccountForm(<AccountForm mode="create" />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/accounts');
    });
  });

  describe('Edit Mode', () => {
    const mockAccount = {
      account_id: '123',
      account_number: 'ACC-001',
      account_name: 'Existing Organization',
      account_type: 'organization' as const,
      category: 'donor' as const,
      email: 'existing@example.com',
      phone: '555-0100',
      website: 'https://example.com',
      address_line1: '123 Main St',
      address_line2: 'Suite 100',
      city: 'Portland',
      state_province: 'OR',
      postal_code: '97201',
      country: 'USA',
      tax_id: '12-3456789',
      description: 'Test organization',
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('shows Update Account button in edit mode', () => {
      renderAccountForm(<AccountForm mode="edit" account={mockAccount} />);
      expect(screen.getByRole('button', { name: /update account/i })).toBeInTheDocument();
    });

    it('populates form fields with account data', () => {
      renderAccountForm(<AccountForm mode="edit" account={mockAccount} />);

      const accountNameInput = screen.getByLabelText(/account name/i) as HTMLInputElement;
      expect(accountNameInput.value).toBe('Existing Organization');

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(emailInput.value).toBe('existing@example.com');

      const phoneInput = screen.getByLabelText(/phone/i) as HTMLInputElement;
      expect(phoneInput.value).toBe('555-0100');
    });

    it('allows user to modify form fields', () => {
      renderAccountForm(<AccountForm mode="edit" account={mockAccount} />);

      const accountNameInput = screen.getByLabelText(/account name/i) as HTMLInputElement;
      fireEvent.change(accountNameInput, { target: { value: 'Updated Organization' } });
      expect(accountNameInput.value).toBe('Updated Organization');
    });

    it('shows Update Account button', () => {
      renderAccountForm(<AccountForm mode="edit" account={mockAccount} />);
      expect(screen.getByRole('button', { name: /update account/i })).toBeInTheDocument();
    });
  });

  describe('Account Type Selection', () => {
    it('allows selecting individual account type', () => {
      renderAccountForm(<AccountForm mode="create" />);

      const accountTypeSelect = screen.getByLabelText(/account type/i) as HTMLSelectElement;
      fireEvent.change(accountTypeSelect, { target: { value: 'individual' } });
      expect(accountTypeSelect.value).toBe('individual');
    });

    it('allows selecting organization account type', () => {
      renderAccountForm(<AccountForm mode="create" />);

      const accountTypeSelect = screen.getByLabelText(/account type/i) as HTMLSelectElement;
      fireEvent.change(accountTypeSelect, { target: { value: 'organization' } });
      expect(accountTypeSelect.value).toBe('organization');
    });
  });

  describe('Category Selection', () => {
    it('allows selecting donor category', () => {
      renderAccountForm(<AccountForm mode="create" />);

      const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement;
      fireEvent.change(categorySelect, { target: { value: 'donor' } });
      expect(categorySelect.value).toBe('donor');
    });

    it('allows selecting partner category', () => {
      renderAccountForm(<AccountForm mode="create" />);

      const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement;
      fireEvent.change(categorySelect, { target: { value: 'partner' } });
      expect(categorySelect.value).toBe('partner');
    });

    it('allows selecting volunteer category', () => {
      renderAccountForm(<AccountForm mode="create" />);

      const categorySelect = screen.getByLabelText(/category/i) as HTMLSelectElement;
      fireEvent.change(categorySelect, { target: { value: 'volunteer' } });
      expect(categorySelect.value).toBe('volunteer');
    });
  });

  describe('Address Fields', () => {
    it('renders address section', () => {
      renderAccountForm(<AccountForm mode="create" />);

      expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument();
    });

    it('allows filling in complete address', () => {
      renderAccountForm(<AccountForm mode="create" />);

      const addressInput = screen.getByLabelText(/address line 1/i) as HTMLInputElement;
      fireEvent.change(addressInput, { target: { value: '456 Oak Ave' } });
      expect(addressInput.value).toBe('456 Oak Ave');

      const cityInput = screen.getByLabelText(/city/i) as HTMLInputElement;
      fireEvent.change(cityInput, { target: { value: 'Seattle' } });
      expect(cityInput.value).toBe('Seattle');
    });
  });
});
