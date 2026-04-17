import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import EventEditorForm from '../EventEditorForm';
import { renderWithProviders } from '../../../../test/testUtils';
import type { Event } from '../../../../types/event';

const navigateMock = vi.fn();
const listReminderAutomationsMock = vi.fn();
const syncReminderAutomationsMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../api/eventsApiClient', () => ({
  eventsApiClient: {
    listReminderAutomations: (...args: unknown[]) => listReminderAutomationsMock(...args),
    syncReminderAutomations: (...args: unknown[]) => syncReminderAutomationsMock(...args),
  },
}));

vi.mock('../../../../services/userPreferencesService', () => ({
  getUserTimezoneCached: vi.fn().mockResolvedValue('UTC'),
}));

vi.mock('../../../../hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: vi.fn(),
}));

describe('EventEditorForm', () => {
  const mockOnSubmit = vi.fn();

  const mockEvent: Event = {
    event_id: 'event-123',
    event_name: 'Existing Event',
    description: 'Event description',
    event_type: 'fundraiser',
    status: 'planned',
    is_public: true,
    is_recurring: false,
    recurrence_pattern: null,
    recurrence_interval: null,
    recurrence_end_date: null,
    start_date: '2026-06-01T10:00:00Z',
    end_date: '2026-06-01T14:00:00Z',
    location_name: 'Community Centre',
    address_line1: '400 West Georgia Street',
    address_line2: null,
    city: 'Vancouver',
    state_province: 'BC',
    postal_code: 'V6B 1A1',
    country: 'Canada',
    capacity: 100,
    registered_count: 25,
    attended_count: 10,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    created_by: 'user-1',
    modified_by: 'user-1',
  };

  beforeEach(() => {
    navigateMock.mockReset();
    mockOnSubmit.mockReset();
    listReminderAutomationsMock.mockReset();
    syncReminderAutomationsMock.mockReset();
    listReminderAutomationsMock.mockResolvedValue([]);
    syncReminderAutomationsMock.mockResolvedValue(undefined);
  });

  it('defaults end time to two hours after the start time on create and keeps it synced', () => {
    renderWithProviders(<EventEditorForm onSubmit={mockOnSubmit} />);

    const startInput = screen.getByLabelText(/start date and time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/end date and time/i) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2026-06-15T10:00' } });
    expect(endInput.value).toBe('2026-06-15T12:00');

    fireEvent.change(startInput, { target: { value: '2026-06-15T13:30' } });
    expect(endInput.value).toBe('2026-06-15T15:30');

    expect(
      screen.getByText(/End time is auto-set to 2 hours after the start time/i)
    ).toBeInTheDocument();
  });

  it('stops auto-syncing after the end time is manually edited', () => {
    renderWithProviders(<EventEditorForm onSubmit={mockOnSubmit} />);

    const startInput = screen.getByLabelText(/start date and time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/end date and time/i) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2026-06-15T10:00' } });
    fireEvent.change(endInput, { target: { value: '2026-06-15T12:45' } });
    fireEvent.change(startInput, { target: { value: '2026-06-15T11:00' } });

    expect(endInput.value).toBe('2026-06-15T12:45');
    expect(screen.getByText(/End time is fixed/i)).toBeInTheDocument();
  });

  it('restores the two-hour default when the end time is cleared', async () => {
    renderWithProviders(<EventEditorForm onSubmit={mockOnSubmit} />);

    const startInput = screen.getByLabelText(/start date and time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/end date and time/i) as HTMLInputElement;

    fireEvent.change(startInput, { target: { value: '2026-06-15T10:00' } });
    fireEvent.change(endInput, { target: { value: '2026-06-15T12:45' } });
    fireEvent.change(endInput, { target: { value: '' } });

    await waitFor(() => {
      expect(endInput.value).toBe('2026-06-15T12:00');
    });
  });

  it('preserves an existing end time on edit when the start time changes', async () => {
    renderWithProviders(<EventEditorForm event={mockEvent} onSubmit={mockOnSubmit} isEdit />);

    const startInput = screen.getByLabelText(/start date and time/i) as HTMLInputElement;
    const endInput = screen.getByLabelText(/end date and time/i) as HTMLInputElement;

    await waitFor(() => {
      expect(endInput.value).toBe('2026-06-01T14:00');
    });

    fireEvent.change(startInput, { target: { value: '2026-06-01T12:00' } });
    expect(endInput.value).toBe('2026-06-01T14:00');
  });

  it('submits the event and synchronizes reminders with the saved event id', async () => {
    mockOnSubmit.mockResolvedValue({ event_id: 'event-123' });

    renderWithProviders(<EventEditorForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText(/event name/i), {
      target: { value: 'Test Event' },
    });
    fireEvent.change(screen.getByLabelText(/start date and time/i), {
      target: { value: '2026-06-15T10:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      expect(syncReminderAutomationsMock).toHaveBeenCalledWith('event-123', { items: [] });
      expect(navigateMock).toHaveBeenCalledWith('/events');
    });
  });
});
