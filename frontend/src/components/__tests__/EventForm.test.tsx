import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EventForm from '../EventForm';
import type { Event } from '../../types/event';

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
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('EventForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnSubmit.mockClear();
  });

  describe('Create Mode', () => {
    it('renders all form fields', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/event name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/event type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/location name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/maximum capacity/i)).toBeInTheDocument();
    });

    it('shows Create Event button', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);
      expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
    });

    it('has empty form fields initially', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const eventNameInput = screen.getByLabelText(/event name/i) as HTMLInputElement;
      expect(eventNameInput.value).toBe('');
    });

    it('allows user to fill out the form', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const eventNameInput = screen.getByLabelText(/event name/i) as HTMLInputElement;
      fireEvent.change(eventNameInput, { target: { value: 'Annual Gala' } });
      expect(eventNameInput.value).toBe('Annual Gala');

      const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      fireEvent.change(descriptionInput, { target: { value: 'Annual fundraising event' } });
      expect(descriptionInput.value).toBe('Annual fundraising event');
    });

    it('validates end date is after start date', async () => {
      mockOnSubmit.mockRejectedValue(new Error('End date must be after start date'));
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      // Fill required fields
      const eventNameInput = screen.getByLabelText(/event name/i);
      fireEvent.change(eventNameInput, { target: { value: 'Test Event' } });

      const startDateInput = screen.getByLabelText(/start date/i);
      fireEvent.change(startDateInput, { target: { value: '2026-06-15T10:00' } });

      const endDateInput = screen.getByLabelText(/end date/i);
      fireEvent.change(endDateInput, { target: { value: '2026-06-14T10:00' } });

      const submitButton = screen.getByRole('button', { name: /create event/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument();
      });
    });

    it('calls onSubmit with form data on valid submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/event name/i), {
        target: { value: 'Test Event' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-06-15T10:00' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-06-15T14:00' },
      });

      const submitButton = screen.getByRole('button', { name: /create event/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('navigates to events list on successful submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/event name/i), {
        target: { value: 'Test Event' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-06-15T10:00' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-06-15T14:00' },
      });

      const submitButton = screen.getByRole('button', { name: /create event/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/events');
      });
    });

    it('has cancel button that navigates back', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/events');
    });
  });

  describe('Edit Mode', () => {
    const mockEvent: Event = {
      id: '123',
      event_name: 'Existing Event',
      description: 'Event description',
      event_type: 'fundraiser',
      status: 'planned',
      start_date: '2026-06-01T10:00:00Z',
      end_date: '2026-06-01T14:00:00Z',
      location_name: 'Community Center',
      address_line1: '123 Main St',
      city: 'Portland',
      state_province: 'OR',
      postal_code: '97201',
      country: 'USA',
      capacity: 100,
      registered_count: 25,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('shows Update Event button in edit mode', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} event={mockEvent} isEdit />);
      expect(screen.getByRole('button', { name: /update event/i })).toBeInTheDocument();
    });

    it('populates form fields with event data', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} event={mockEvent} isEdit />);

      const eventNameInput = screen.getByLabelText(/event name/i) as HTMLInputElement;
      expect(eventNameInput.value).toBe('Existing Event');

      const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe('Event description');

      const locationInput = screen.getByLabelText(/location name/i) as HTMLInputElement;
      expect(locationInput.value).toBe('Community Center');
    });

    it('allows user to modify form fields', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} event={mockEvent} isEdit />);

      const eventNameInput = screen.getByLabelText(/event name/i) as HTMLInputElement;
      fireEvent.change(eventNameInput, { target: { value: 'Updated Event Name' } });
      expect(eventNameInput.value).toBe('Updated Event Name');
    });
  });

  describe('Event Type Selection', () => {
    it('allows selecting fundraiser event type', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const eventTypeSelect = screen.getByLabelText(/event type/i) as HTMLSelectElement;
      fireEvent.change(eventTypeSelect, { target: { value: 'fundraiser' } });
      expect(eventTypeSelect.value).toBe('fundraiser');
    });

    it('allows selecting community event type', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const eventTypeSelect = screen.getByLabelText(/event type/i) as HTMLSelectElement;
      fireEvent.change(eventTypeSelect, { target: { value: 'community' } });
      expect(eventTypeSelect.value).toBe('community');
    });

    it('allows selecting volunteer event type', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const eventTypeSelect = screen.getByLabelText(/event type/i) as HTMLSelectElement;
      fireEvent.change(eventTypeSelect, { target: { value: 'volunteer' } });
      expect(eventTypeSelect.value).toBe('volunteer');
    });
  });

  describe('Status Selection', () => {
    it('allows selecting planned status', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'planned' } });
      expect(statusSelect.value).toBe('planned');
    });

    it('allows selecting active status', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      expect(statusSelect.value).toBe('active');
    });

    it('allows selecting cancelled status', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'cancelled' } });
      expect(statusSelect.value).toBe('cancelled');
    });
  });

  describe('Location Fields', () => {
    it('renders address section', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^city$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state\/province/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument();
    });

    it('allows filling in complete address', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const addressInput = screen.getByLabelText(/address line 1/i) as HTMLInputElement;
      fireEvent.change(addressInput, { target: { value: '456 Oak Ave' } });
      expect(addressInput.value).toBe('456 Oak Ave');

      const cityInput = screen.getByLabelText(/^city$/i) as HTMLInputElement;
      fireEvent.change(cityInput, { target: { value: 'Seattle' } });
      expect(cityInput.value).toBe('Seattle');
    });
  });

  describe('Capacity Field', () => {
    it('allows setting capacity', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const capacityInput = screen.getByLabelText(/maximum capacity/i) as HTMLInputElement;
      fireEvent.change(capacityInput, { target: { value: '150' } });
      expect(capacityInput.value).toBe('150');
    });

    it('allows leaving capacity blank for unlimited', () => {
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      const capacityInput = screen.getByLabelText(/maximum capacity/i) as HTMLInputElement;
      expect(capacityInput.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('displays error message on submission failure', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      renderWithRouter(<EventForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/event name/i), {
        target: { value: 'Test Event' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-06-15T10:00' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-06-15T14:00' },
      });

      const submitButton = screen.getByRole('button', { name: /create event/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });
});
