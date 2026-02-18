import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import EventForm from '../EventForm';
import { renderWithProviders } from '../../test/testUtils';
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
describe('EventForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnSubmit.mockClear();
  });

  describe('Create Mode', () => {
    it('renders all form fields', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

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
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);
      expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument();
    });

    it('has empty form fields initially', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const eventNameInput = screen.getByLabelText(/event name/i) as HTMLInputElement;
      expect(eventNameInput.value).toBe('');
    });

    it('allows user to fill out the form', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const eventNameInput = screen.getByLabelText(/event name/i) as HTMLInputElement;
      fireEvent.change(eventNameInput, { target: { value: 'Annual Gala' } });
      expect(eventNameInput.value).toBe('Annual Gala');

      const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      fireEvent.change(descriptionInput, { target: { value: 'Annual fundraising event' } });
      expect(descriptionInput.value).toBe('Annual fundraising event');
    });

    it('validates end date is after start date', async () => {
      mockOnSubmit.mockRejectedValue(new Error('End date must be after start date'));
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

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
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

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
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

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
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/events');
    });
  });

  describe('Edit Mode', () => {
    const mockEvent: Event = {
      event_id: '123',
      event_name: 'Existing Event',
      description: 'Event description',
      event_type: 'fundraiser',
      status: 'planned',
      is_public: true,
      is_recurring: true,
      recurrence_pattern: 'weekly',
      recurrence_interval: 2,
      recurrence_end_date: '2026-12-31T10:00:00Z',
      start_date: '2026-06-01T10:00:00Z',
      end_date: '2026-06-01T14:00:00Z',
      location_name: 'Community Center',
      address_line1: '123 Main St',
      address_line2: null,
      city: 'Portland',
      state_province: 'OR',
      postal_code: '97201',
      country: 'USA',
      capacity: 100,
      registered_count: 25,
      attended_count: 10,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      created_by: 'user-1',
      modified_by: 'user-1',
    };

    it('shows Update Event button in edit mode', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} event={mockEvent} isEdit />);
      expect(screen.getByRole('button', { name: /update event/i })).toBeInTheDocument();
    });

    it('populates form fields with event data', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} event={mockEvent} isEdit />);

      const eventNameInput = screen.getByLabelText(/event name/i) as HTMLInputElement;
      expect(eventNameInput.value).toBe('Existing Event');

      const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe('Event description');

      const locationInput = screen.getByLabelText(/location name/i) as HTMLInputElement;
      expect(locationInput.value).toBe('Community Center');
    });

    it('allows user to modify form fields', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} event={mockEvent} isEdit />);

      const eventNameInput = screen.getByLabelText(/event name/i) as HTMLInputElement;
      fireEvent.change(eventNameInput, { target: { value: 'Updated Event Name' } });
      expect(eventNameInput.value).toBe('Updated Event Name');
    });
  });

  describe('Event Type Selection', () => {
    it('allows selecting fundraiser event type', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const eventTypeSelect = screen.getByLabelText(/event type/i) as HTMLSelectElement;
      fireEvent.change(eventTypeSelect, { target: { value: 'fundraiser' } });
      expect(eventTypeSelect.value).toBe('fundraiser');
    });

    it('allows selecting community event type', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const eventTypeSelect = screen.getByLabelText(/event type/i) as HTMLSelectElement;
      fireEvent.change(eventTypeSelect, { target: { value: 'community' } });
      expect(eventTypeSelect.value).toBe('community');
    });

    it('allows selecting volunteer event type', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const eventTypeSelect = screen.getByLabelText(/event type/i) as HTMLSelectElement;
      fireEvent.change(eventTypeSelect, { target: { value: 'volunteer' } });
      expect(eventTypeSelect.value).toBe('volunteer');
    });

    it('allows selecting webinar event type', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const eventTypeSelect = screen.getByLabelText(/event type/i) as HTMLSelectElement;
      fireEvent.change(eventTypeSelect, { target: { value: 'webinar' } });
      expect(eventTypeSelect.value).toBe('webinar');
    });
  });

  describe('Recurrence Fields', () => {
    it('shows recurrence controls when recurring is enabled', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      fireEvent.click(screen.getByLabelText(/this is a recurring event/i));
      expect(screen.getByLabelText(/pattern/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/every/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/ends on/i)).toBeInTheDocument();
    });

    it('hides recurrence controls when recurring is disabled', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const recurringCheckbox = screen.getByLabelText(/this is a recurring event/i);
      fireEvent.click(recurringCheckbox);
      fireEvent.click(recurringCheckbox);
      expect(screen.queryByLabelText(/pattern/i)).not.toBeInTheDocument();
    });

    it('submits recurrence data when recurring is enabled', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/event name/i), {
        target: { value: 'Recurring Event' },
      });
      fireEvent.change(screen.getByLabelText(/start date/i), {
        target: { value: '2026-06-15T10:00' },
      });
      fireEvent.change(screen.getByLabelText(/end date/i), {
        target: { value: '2026-06-15T14:00' },
      });
      fireEvent.click(screen.getByLabelText(/this is a recurring event/i));
      fireEvent.change(screen.getByLabelText(/pattern/i), {
        target: { value: 'monthly' },
      });
      fireEvent.change(screen.getByLabelText(/every/i), {
        target: { value: '3' },
      });

      fireEvent.click(screen.getByRole('button', { name: /create event/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            is_recurring: true,
            recurrence_pattern: 'monthly',
            recurrence_interval: 3,
          })
        );
      });
    });
  });

  describe('Status Selection', () => {
    it('allows selecting planned status', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'planned' } });
      expect(statusSelect.value).toBe('planned');
    });

    it('allows selecting active status', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      expect(statusSelect.value).toBe('active');
    });

    it('allows selecting cancelled status', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'cancelled' } });
      expect(statusSelect.value).toBe('cancelled');
    });
  });

  describe('Location Fields', () => {
    it('renders address section', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/address line 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^city$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state\/province/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument();
    });

    it('allows filling in complete address', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

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
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const capacityInput = screen.getByLabelText(/maximum capacity/i) as HTMLInputElement;
      fireEvent.change(capacityInput, { target: { value: '150' } });
      expect(capacityInput.value).toBe('150');
    });

    it('allows leaving capacity blank for unlimited', () => {
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

      const capacityInput = screen.getByLabelText(/maximum capacity/i) as HTMLInputElement;
      expect(capacityInput.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('displays error message on submission failure', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Network error'));
      renderWithProviders(<EventForm onSubmit={mockOnSubmit} />);

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
