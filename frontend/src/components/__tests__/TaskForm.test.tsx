import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TaskForm from '../TaskForm';
import type { Task } from '../../types/task';

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

describe('TaskForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockNavigate.mockClear();
    mockOnSubmit.mockClear();
  });

  describe('Create Mode', () => {
    it('renders all form fields', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    });

    it('shows Create Task button', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);
      expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
    });

    it('has empty form fields initially', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const subjectInput = screen.getByLabelText(/subject/i) as HTMLInputElement;
      expect(subjectInput.value).toBe('');
    });

    it('has default status as not_started', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      expect(statusSelect.value).toBe('not_started');
    });

    it('has default priority as normal', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
      expect(prioritySelect.value).toBe('normal');
    });

    it('allows user to fill out the form', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const subjectInput = screen.getByLabelText(/subject/i) as HTMLInputElement;
      fireEvent.change(subjectInput, { target: { value: 'Follow up with donor' } });
      expect(subjectInput.value).toBe('Follow up with donor');

      const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      fireEvent.change(descriptionInput, {
        target: { value: 'Call to thank for recent donation' },
      });
      expect(descriptionInput.value).toBe('Call to thank for recent donation');
    });

    it('validates subject is required', async () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      // Form has HTML5 required attribute, so onSubmit should not be called
      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('calls onSubmit with form data on valid submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: 'Test Task' },
      });

      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('navigates to tasks list on successful submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: 'Test Task' },
      });

      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/tasks');
      });
    });

    it('has cancel button that navigates back', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/tasks');
    });
  });

  describe('Edit Mode', () => {
    const mockTask: Task = {
      id: '123',
      subject: 'Existing Task',
      description: 'Task description',
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-02-15T14:00:00Z',
      assigned_to: 'user-123',
      related_to_type: 'contact',
      related_to_id: 'contact-456',
      created_by: 'user-001',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };

    it('shows Update Task button in edit mode', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} task={mockTask} isEdit />);
      expect(screen.getByRole('button', { name: /update task/i })).toBeInTheDocument();
    });

    it('populates form fields with task data', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} task={mockTask} isEdit />);

      const subjectInput = screen.getByLabelText(/subject/i) as HTMLInputElement;
      expect(subjectInput.value).toBe('Existing Task');

      const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
      expect(descriptionInput.value).toBe('Task description');

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      expect(statusSelect.value).toBe('in_progress');

      const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
      expect(prioritySelect.value).toBe('high');
    });

    it('allows user to modify form fields', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} task={mockTask} isEdit />);

      const subjectInput = screen.getByLabelText(/subject/i) as HTMLInputElement;
      fireEvent.change(subjectInput, { target: { value: 'Updated Task Subject' } });
      expect(subjectInput.value).toBe('Updated Task Subject');
    });
  });

  describe('Status Selection', () => {
    it('allows selecting not_started status', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'not_started' } });
      expect(statusSelect.value).toBe('not_started');
    });

    it('allows selecting in_progress status', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'in_progress' } });
      expect(statusSelect.value).toBe('in_progress');
    });

    it('allows selecting completed status', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'completed' } });
      expect(statusSelect.value).toBe('completed');
    });

    it('allows selecting waiting status', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'waiting' } });
      expect(statusSelect.value).toBe('waiting');
    });

    it('allows selecting deferred status', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'deferred' } });
      expect(statusSelect.value).toBe('deferred');
    });

    it('allows selecting cancelled status', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'cancelled' } });
      expect(statusSelect.value).toBe('cancelled');
    });
  });

  describe('Priority Selection', () => {
    it('allows selecting low priority', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
      fireEvent.change(prioritySelect, { target: { value: 'low' } });
      expect(prioritySelect.value).toBe('low');
    });

    it('allows selecting normal priority', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
      fireEvent.change(prioritySelect, { target: { value: 'normal' } });
      expect(prioritySelect.value).toBe('normal');
    });

    it('allows selecting high priority', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
      fireEvent.change(prioritySelect, { target: { value: 'high' } });
      expect(prioritySelect.value).toBe('high');
    });

    it('allows selecting urgent priority', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement;
      fireEvent.change(prioritySelect, { target: { value: 'urgent' } });
      expect(prioritySelect.value).toBe('urgent');
    });
  });

  describe('Due Date Field', () => {
    it('allows setting due date', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const dueDateInput = screen.getByLabelText(/due date/i) as HTMLInputElement;
      fireEvent.change(dueDateInput, { target: { value: '2026-03-01T10:00' } });
      expect(dueDateInput.value).toBe('2026-03-01T10:00');
    });

    it('allows leaving due date blank', () => {
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      const dueDateInput = screen.getByLabelText(/due date/i) as HTMLInputElement;
      expect(dueDateInput.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('displays error message on submission failure', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Server error'));
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: 'Test Task' },
      });

      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });

    it('displays generic error for non-Error objects', async () => {
      mockOnSubmit.mockRejectedValue('Unknown error');
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: 'Test Task' },
      });

      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save task/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('shows Saving... text while submitting', async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: 'Test Task' },
      });

      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });

    it('disables buttons while submitting', async () => {
      mockOnSubmit.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      renderWithRouter(<TaskForm onSubmit={mockOnSubmit} />);

      fireEvent.change(screen.getByLabelText(/subject/i), {
        target: { value: 'Test Task' },
      });

      const submitButton = screen.getByRole('button', { name: /create task/i });
      fireEvent.click(submitButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });
});
