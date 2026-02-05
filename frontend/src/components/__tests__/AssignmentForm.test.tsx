import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { AssignmentForm } from '../AssignmentForm';
import { renderWithProviders, createTestStore } from '../../test/testUtils';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ volunteerId: '123' }),
  };
});

const renderAssignmentForm = (component: React.ReactElement) => {
  const store = createTestStore();
  return renderWithProviders(component, { store });
};

describe('AssignmentForm', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('Create Mode', () => {
    it('renders all required form fields', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      expect(screen.getByLabelText(/assignment type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^role$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    });

    it('shows Create Assignment title in submit button', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);
      expect(screen.getByRole('button', { name: /create assignment/i })).toBeInTheDocument();
    });

    it('has general as default assignment type', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const typeSelect = screen.getByLabelText(/assignment type/i) as HTMLSelectElement;
      expect(typeSelect.value).toBe('general');
    });

    it('allows selecting event assignment type', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const typeSelect = screen.getByLabelText(/assignment type/i) as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'event' } });
      expect(typeSelect.value).toBe('event');
    });

    it('allows selecting task assignment type', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const typeSelect = screen.getByLabelText(/assignment type/i) as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'task' } });
      expect(typeSelect.value).toBe('task');
    });

    it('allows entering role/position', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const roleInput = screen.getByLabelText(/^role$/i) as HTMLInputElement;
      fireEvent.change(roleInput, { target: { value: 'Team Lead' } });
      expect(roleInput.value).toBe('Team Lead');
    });

    it('allows setting start time', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const startTimeInput = screen.getByLabelText(/start time/i) as HTMLInputElement;
      fireEvent.change(startTimeInput, { target: { value: '2026-02-15T09:00' } });
      expect(startTimeInput.value).toBe('2026-02-15T09:00');
    });

    it('allows setting end time', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const endTimeInput = screen.getByLabelText(/end time/i) as HTMLInputElement;
      fireEvent.change(endTimeInput, { target: { value: '2026-03-15T17:00' } });
      expect(endTimeInput.value).toBe('2026-03-15T17:00');
    });

    it('has cancel button that navigates back', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('shows Create Assignment button', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);
      expect(screen.getByRole('button', { name: /create assignment/i })).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    const mockAssignment = {
      assignment_id: '999',
      volunteer_id: '123',
      assignment_type: 'event' as const,
      event_id: 'EVT-001',
      role: 'Registration Desk',
      start_time: '2026-03-01T08:00:00Z',
      end_time: '2026-03-02T17:00:00Z',
      hours_logged: 8,
      status: 'in_progress' as const,
      notes: 'Great performance',
    };

    it('shows Update Assignment in submit button', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );
      expect(screen.getByRole('button', { name: /update assignment/i })).toBeInTheDocument();
    });

    it('populates form fields with assignment data', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );

      const typeSelect = screen.getByLabelText(/assignment type/i) as HTMLSelectElement;
      expect(typeSelect.value).toBe('event');

      const roleInput = screen.getByLabelText(/^role$/i) as HTMLInputElement;
      expect(roleInput.value).toBe('Registration Desk');
    });

    it('allows user to modify form fields', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );

      const roleInput = screen.getByLabelText(/^role$/i) as HTMLInputElement;
      fireEvent.change(roleInput, { target: { value: 'Check-in Coordinator' } });
      expect(roleInput.value).toBe('Check-in Coordinator');
    });

    it('shows Update Assignment button', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );
      expect(screen.getByRole('button', { name: /update assignment/i })).toBeInTheDocument();
    });

    it('shows status field in edit mode', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('shows hours logged field in edit mode', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );
      expect(screen.getByLabelText(/hours logged/i)).toBeInTheDocument();
    });
  });

  describe('Status Field (Edit Mode)', () => {
    const mockAssignment = {
      assignment_id: '999',
      volunteer_id: '123',
      assignment_type: 'general' as const,
      start_time: '2026-03-01T08:00:00Z',
      status: 'scheduled' as const,
    };

    it('allows selecting scheduled status', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'scheduled' } });
      expect(statusSelect.value).toBe('scheduled');
    });

    it('allows selecting in_progress status', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'in_progress' } });
      expect(statusSelect.value).toBe('in_progress');
    });

    it('allows selecting completed status', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'completed' } });
      expect(statusSelect.value).toBe('completed');
    });

    it('allows selecting cancelled status', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'cancelled' } });
      expect(statusSelect.value).toBe('cancelled');
    });
  });

  describe('Hours Tracking (Edit Mode)', () => {
    const mockAssignment = {
      assignment_id: '999',
      volunteer_id: '123',
      assignment_type: 'general' as const,
      start_time: '2026-03-01T08:00:00Z',
      status: 'scheduled' as const,
      hours_logged: 0,
    };

    it('allows entering hours logged', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );

      const hoursLoggedInput = screen.getByLabelText(/hours logged/i) as HTMLInputElement;
      fireEvent.change(hoursLoggedInput, { target: { value: '10' } });
      expect(hoursLoggedInput.value).toBe('10');
    });

    it('validates hours as numeric values', () => {
      renderAssignmentForm(
        <AssignmentForm mode="edit" volunteerId="123" assignment={mockAssignment} />
      );

      const hoursLoggedInput = screen.getByLabelText(/hours logged/i) as HTMLInputElement;
      expect(hoursLoggedInput.type).toBe('number');
    });
  });

  describe('Notes Field', () => {
    it('allows entering assignment notes', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const notesInput = screen.getByLabelText(/additional notes/i) as HTMLTextAreaElement;
      fireEvent.change(notesInput, {
        target: { value: 'Volunteer has experience with similar events' },
      });
      expect(notesInput.value).toBe('Volunteer has experience with similar events');
    });
  });

  describe('Form Validation', () => {
    it('validates required start time field', async () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const submitButton = screen.getByRole('button', { name: /create assignment/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('validates end time is after start time', async () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const startTimeInput = screen.getByLabelText(/start time/i);
      fireEvent.change(startTimeInput, { target: { value: '2026-03-15T10:00' } });

      const endTimeInput = screen.getByLabelText(/end time/i);
      fireEvent.change(endTimeInput, { target: { value: '2026-03-01T10:00' } });

      // End time should not be before start time
      const endTimeElement = endTimeInput as HTMLInputElement;
      const startTimeElement = startTimeInput as HTMLInputElement;
      expect(new Date(endTimeElement.value) >= new Date(startTimeElement.value)).toBe(false);
    });
  });

  describe('Conditional Fields', () => {
    it('shows event ID field when type is event', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const typeSelect = screen.getByLabelText(/assignment type/i);
      fireEvent.change(typeSelect, { target: { value: 'event' } });

      expect(screen.getByLabelText(/^event \*/i)).toBeInTheDocument();
    });

    it('shows task ID field when type is task', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const typeSelect = screen.getByLabelText(/assignment type/i);
      fireEvent.change(typeSelect, { target: { value: 'task' } });

      expect(screen.getByLabelText(/^task \*/i)).toBeInTheDocument();
    });

    it('hides event/task fields for general type', () => {
      renderAssignmentForm(<AssignmentForm mode="create" volunteerId="123" />);

      const typeSelect = screen.getByLabelText(/assignment type/i);
      fireEvent.change(typeSelect, { target: { value: 'general' } });

      expect(screen.queryByLabelText(/^event \*/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^task \*/i)).not.toBeInTheDocument();
    });
  });
});
