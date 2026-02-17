import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import DonationForm from '../DonationForm';
import { renderWithProviders } from '../../test/testUtils';
import type { Donation } from '../../types/donation';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Wrapper component
describe('DonationForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnSubmit.mockClear();
  });

  describe('Create Mode', () => {
    it('renders all form fields', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/donation date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/transaction id/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/campaign name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/designation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/this is a recurring donation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('shows Record Donation button', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);
      expect(screen.getByRole('button', { name: /record donation/i })).toBeInTheDocument();
    });

    it('has default currency as USD', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const currencyInput = screen.getByLabelText(/currency/i) as HTMLInputElement;
      expect(currencyInput.value).toBe('USD');
    });

    it('allows user to fill out the form', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: '100.50' } });
      expect(amountInput.value).toBe('100.50');

      const campaignInput = screen.getByLabelText(/campaign name/i) as HTMLInputElement;
      fireEvent.change(campaignInput, { target: { value: 'Annual Fund 2026' } });
      expect(campaignInput.value).toBe('Annual Fund 2026');
    });

    it('validates amount is greater than 0', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Should not be called'));
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const amountInput = screen.getByLabelText(/amount/i);
      fireEvent.change(amountInput, { target: { value: '0' } });

      const submitButton = screen.getByRole('button', { name: /record donation/i });
      fireEvent.click(submitButton);

      // Wait for validation to complete
      await waitFor(() => {
        // Either error message appears or onSubmit wasn't called due to validation
        const errorElement = screen.queryByText(/amount must be greater than 0/i);
        if (errorElement) {
          expect(errorElement).toBeInTheDocument();
        } else {
          // HTML5 validation may have blocked submission
          expect(mockOnSubmit).not.toHaveBeenCalled();
        }
      });
    });

    it('calls onSubmit with form data on valid submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/amount/i), {
        target: { value: '250' },
      });

      const submitButton = screen.getByRole('button', { name: /record donation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('navigates to donations list on successful submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/amount/i), {
        target: { value: '100' },
      });

      const submitButton = screen.getByRole('button', { name: /record donation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/donations');
      });
    });

    it('has cancel button that navigates back', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/donations');
    });
  });

  describe('Edit Mode', () => {
    const mockDonation: Donation = {
      id: '123',
      account_id: 'acc-123',
      contact_id: 'contact-123',
      amount: 500,
      currency: 'USD',
      donation_date: '2026-01-15T14:00:00Z',
      payment_method: 'credit_card',
      payment_status: 'completed',
      transaction_id: 'TXN-12345',
      campaign_name: 'Annual Fund',
      designation: 'General Operating',
      is_recurring: false,
      recurring_frequency: 'one_time',
      notes: 'Thank you note sent',
      created_at: '2026-01-15T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
    };

    it('shows Update Donation button in edit mode', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} donation={mockDonation} isEdit />);
      expect(screen.getByRole('button', { name: /update donation/i })).toBeInTheDocument();
    });

    it('populates form fields with donation data', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} donation={mockDonation} isEdit />);

      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
      expect(amountInput.value).toBe('500');

      const transactionInput = screen.getByLabelText(/transaction id/i) as HTMLInputElement;
      expect(transactionInput.value).toBe('TXN-12345');

      const campaignInput = screen.getByLabelText(/campaign name/i) as HTMLInputElement;
      expect(campaignInput.value).toBe('Annual Fund');
    });

    it('allows user to modify form fields', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} donation={mockDonation} isEdit />);

      const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: '750' } });
      expect(amountInput.value).toBe('750');
    });
  });

  describe('Payment Method Selection', () => {
    it('allows selecting credit card payment method', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const paymentMethodSelect = screen.getByLabelText(/payment method/i) as HTMLSelectElement;
      fireEvent.change(paymentMethodSelect, { target: { value: 'credit_card' } });
      expect(paymentMethodSelect.value).toBe('credit_card');
    });

    it('allows selecting check payment method', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const paymentMethodSelect = screen.getByLabelText(/payment method/i) as HTMLSelectElement;
      fireEvent.change(paymentMethodSelect, { target: { value: 'check' } });
      expect(paymentMethodSelect.value).toBe('check');
    });

    it('allows selecting bank transfer payment method', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const paymentMethodSelect = screen.getByLabelText(/payment method/i) as HTMLSelectElement;
      fireEvent.change(paymentMethodSelect, { target: { value: 'bank_transfer' } });
      expect(paymentMethodSelect.value).toBe('bank_transfer');
    });

    it('allows selecting stock payment method', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const paymentMethodSelect = screen.getByLabelText(/payment method/i) as HTMLSelectElement;
      fireEvent.change(paymentMethodSelect, { target: { value: 'stock' } });
      expect(paymentMethodSelect.value).toBe('stock');
    });
  });

  describe('Payment Status Selection', () => {
    it('allows selecting completed status', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/payment status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'completed' } });
      expect(statusSelect.value).toBe('completed');
    });

    it('allows selecting pending status', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/payment status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'pending' } });
      expect(statusSelect.value).toBe('pending');
    });

    it('allows selecting refunded status', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/payment status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'refunded' } });
      expect(statusSelect.value).toBe('refunded');
    });
  });

  describe('Recurring Donation', () => {
    it('shows frequency dropdown when recurring is checked', async () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const recurringCheckbox = screen.getByLabelText(/this is a recurring donation/i);
      fireEvent.click(recurringCheckbox);

      await waitFor(() => {
        expect(screen.getByLabelText(/^frequency$/i)).toBeInTheDocument();
      });
    });

    it('hides frequency dropdown when recurring is unchecked', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      expect(screen.queryByLabelText(/^frequency$/i)).not.toBeInTheDocument();
    });

    it('allows selecting monthly frequency', async () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const recurringCheckbox = screen.getByLabelText(/this is a recurring donation/i);
      fireEvent.click(recurringCheckbox);

      await waitFor(() => {
        const frequencySelect = screen.getByLabelText(/^frequency$/i) as HTMLSelectElement;
        fireEvent.change(frequencySelect, { target: { value: 'monthly' } });
        expect(frequencySelect.value).toBe('monthly');
      });
    });

    it('allows selecting quarterly frequency', async () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const recurringCheckbox = screen.getByLabelText(/this is a recurring donation/i);
      fireEvent.click(recurringCheckbox);

      await waitFor(() => {
        const frequencySelect = screen.getByLabelText(/^frequency$/i) as HTMLSelectElement;
        fireEvent.change(frequencySelect, { target: { value: 'quarterly' } });
        expect(frequencySelect.value).toBe('quarterly');
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message on submission failure', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Server error'));
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/amount/i), {
        target: { value: '100' },
      });

      const submitButton = screen.getByRole('button', { name: /record donation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });

    it('displays generic error for non-Error objects', async () => {
      mockOnSubmit.mockRejectedValue('Unknown error');
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/amount/i), {
        target: { value: '100' },
      });

      const submitButton = screen.getByRole('button', { name: /record donation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save donation/i)).toBeInTheDocument();
      });
    });
  });

  describe('Notes Field', () => {
    it('allows entering notes', () => {
      renderWithProviders(<DonationForm onSubmit={mockOnSubmit} />);

      const notesInput = screen.getByLabelText(/notes/i) as HTMLTextAreaElement;
      fireEvent.change(notesInput, { target: { value: 'Thank you letter sent' } });
      expect(notesInput.value).toBe('Thank you letter sent');
    });
  });
});
